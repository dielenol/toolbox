from __future__ import annotations

import base64
import json
import logging
from io import BytesIO
from pathlib import Path
from urllib.parse import quote, urlsplit
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from app.converter import (
    SUPPORTED_OUTPUT_FORMATS,
    ConvertOptions,
    ImageTooLargeError as ConvertImageTooLargeError,
    InvalidImageError as ConvertInvalidImageError,
    UnsupportedFormatError,
    convert_image,
    parse_ico_sizes,
)
from app.cutout_quality import CutoutQualityReport, analyze_cutout
from app.local_save import save_file_with_dialog
from app.remover import (
    DEFAULT_MODEL,
    MODEL_BY_ID,
    MODEL_GROUPS,
    SUPPORTED_MODELS,
    TASK_CATALOG,
    ImageTooLargeError,
    InvalidImageError,
    RemoveOptions,
    UnsupportedModelError,
    remove_background,
    resolve_task_model,
)
from app.settings import ALLOWED_BROWSER_ORIGINS, MAX_UPLOAD_BYTES


logger = logging.getLogger(__name__)
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Toolbox", version="0.1.0")
LOOPBACK_ORIGIN_PATTERN = (
    r"^http://(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$"
)
EXPOSED_RESPONSE_HEADERS = (
    "Content-Disposition",
    "X-Cutout-Manifest",
    "X-Image-Width",
    "X-Image-Height",
    "X-Model",
    "X-Quality-Policy",
    "X-Process-Time-Ms",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(ALLOWED_BROWSER_ORIGINS),
    allow_origin_regex=LOOPBACK_ORIGIN_PATTERN,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
    expose_headers=list(EXPOSED_RESPONSE_HEADERS),
    max_age=600,
)


@app.middleware("http")
async def enforce_browser_origin(request: Request, call_next):
    origin = request.headers.get("origin")
    is_api_write = request.url.path.startswith("/api/") and request.method in {
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
    }
    if is_api_write and origin is not None and not _is_allowed_browser_origin(origin):
        return JSONResponse(
            status_code=403,
            content={"detail": "허용되지 않은 브라우저 출처입니다."},
        )

    response = await call_next(request)
    if (
        origin is not None
        and _is_allowed_browser_origin(origin)
        and request.headers.get("access-control-request-private-network") == "true"
    ):
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/models")
def models() -> dict[str, object]:
    groups = [
        {
            "id": group_id,
            "name": group_name,
            "models": [MODEL_BY_ID[model_id].to_payload() for model_id in model_ids],
        }
        for group_id, group_name, model_ids in MODEL_GROUPS
    ]
    return {
        "default": DEFAULT_MODEL,
        "quality_policy": "maximum",
        "groups": groups,
        "models": [model.to_payload() for model in MODEL_BY_ID.values()],
        "tasks": [task.to_payload() for task in TASK_CATALOG],
    }


@app.get("/api/formats")
def formats() -> dict[str, object]:
    return {
        "default": "png",
        "formats": [
            {"id": "png", "name": "PNG", "profile": "투명 배경 보존"},
            {"id": "jpg", "name": "JPG", "profile": "일반 사진"},
            {"id": "webp", "name": "WebP", "profile": "웹 최적화"},
            {"id": "bmp", "name": "BMP", "profile": "호환성"},
            {"id": "tiff", "name": "TIFF", "profile": "보관용"},
            {"id": "ico", "name": "ICO", "profile": "Windows 아이콘"},
        ],
    }


@app.post("/api/remove")
async def remove_endpoint(
    file: UploadFile = File(...),
    model_name: str | None = Form(None),
    task: str | None = Form(None),
) -> Response:
    selection = _resolve_remove_selection(task=task, model_name=model_name)

    contents = await _read_upload(file)

    options = RemoveOptions(model_name=selection["model_name"])

    try:
        result = await run_in_threadpool(remove_background, contents, options)
        quality = await run_in_threadpool(analyze_cutout, contents, result.png)
    except InvalidImageError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    except ImageTooLargeError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except UnsupportedModelError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Background removal failed with model %s", options.model_name)
        raise HTTPException(status_code=500, detail=_model_runtime_error(options.model_name)) from exc

    filename = _output_filename(file.filename)
    manifest = _cutout_manifest(
        selection=selection,
        quality=quality,
        elapsed_ms=result.elapsed_ms,
    )
    return Response(
        content=result.png,
        media_type="image/png",
        headers={
            "Content-Disposition": _content_disposition(filename),
            "X-Image-Width": str(result.width),
            "X-Image-Height": str(result.height),
            "X-Model": result.model_name,
            "X-Quality-Policy": "maximum",
            "X-Process-Time-Ms": str(result.elapsed_ms),
            "X-Cutout-Manifest": _encode_header_payload(manifest),
        },
    )


def _resolve_remove_selection(
    *,
    task: str | None,
    model_name: str | None,
) -> dict[str, str | None]:
    normalized_task = task.strip().lower() if task and task.strip() else None
    normalized_model = (
        model_name.strip().lower() if model_name and model_name.strip() else None
    )
    if normalized_task and normalized_model:
        raise HTTPException(
            status_code=400,
            detail="작업 유형과 모델은 동시에 지정할 수 없습니다.",
        )

    if normalized_task:
        try:
            model = resolve_task_model(normalized_task)
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail="지원하지 않는 작업 유형입니다.",
            ) from exc
        selection_mode = "task"
        requested_model = None
    else:
        resolved_model = normalized_model or DEFAULT_MODEL
        if resolved_model not in SUPPORTED_MODELS:
            raise HTTPException(status_code=400, detail="지원하지 않는 모델입니다.")
        model = MODEL_BY_ID[resolved_model]
        selection_mode = "model" if normalized_model else "default"
        requested_model = normalized_model

    return {
        "selection_mode": selection_mode,
        "requested_task": normalized_task,
        "requested_model": requested_model,
        "model_name": model.id,
        "model_label": model.name,
        "fallback_model": model.fallback_model,
        "fallback_model_label": MODEL_BY_ID[model.fallback_model].name,
    }


def _cutout_manifest(
    *,
    selection: dict[str, str | None],
    quality: CutoutQualityReport,
    elapsed_ms: int,
) -> dict[str, object]:
    return {
        "version": 1,
        **selection,
        "quality_policy": "maximum",
        "process_time_ms": elapsed_ms,
        "quality": quality.to_payload(),
    }


def _encode_header_payload(payload: dict[str, object]) -> str:
    encoded = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    return base64.urlsafe_b64encode(encoded).decode("ascii").rstrip("=")


def _is_allowed_browser_origin(origin: str) -> bool:
    if origin in ALLOWED_BROWSER_ORIGINS:
        return True

    try:
        parsed = urlsplit(origin)
        port = parsed.port
    except ValueError:
        return False

    return (
        parsed.scheme == "http"
        and parsed.hostname in {"localhost", "127.0.0.1", "::1"}
        and parsed.username is None
        and parsed.password is None
        and parsed.path in {"", "/"}
        and parsed.query == ""
        and parsed.fragment == ""
        and (port is None or 1 <= port <= 65535)
    )


def _model_runtime_error(model_name: str) -> str:
    label = MODEL_BY_ID.get(model_name)
    model_label = label.name if label else model_name
    return (
        f"{model_label} 모델 실행에 실패했습니다. 첫 실행이면 모델 파일 다운로드가 오래 걸리거나 "
        "중간에 끊겼을 수 있습니다. 네트워크 연결을 확인한 뒤 다시 시도하세요."
    )


@app.post("/api/save")
async def save_endpoint(
    file: UploadFile = File(...),
    suggested_name: str = Form("download.png"),
    output_format: str = Form("png"),
) -> dict[str, object]:
    contents = await _read_upload(file)

    try:
        saved_path = await run_in_threadpool(
            save_file_with_dialog,
            contents,
            suggested_name,
            output_format,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if saved_path is None:
        return {"saved": False}

    return {"saved": True}


@app.post("/api/archive")
async def archive_endpoint(
    files: list[UploadFile] = File(...),
    archive_name: str = Form("toolbox-cutouts.zip"),
) -> Response:
    if not files:
        raise HTTPException(status_code=400, detail="압축할 파일이 없습니다.")

    entries: list[tuple[str, bytes]] = []
    for file in files:
        contents = await _read_upload(file)
        entries.append((_zip_entry_filename(file.filename), contents))

    archive = await run_in_threadpool(_build_zip_archive, entries)
    filename = _archive_filename(archive_name)
    return Response(
        content=archive,
        media_type="application/zip",
        headers={
            "Content-Disposition": _content_disposition(filename),
            "X-Archive-Count": str(len(entries)),
        },
    )


@app.post("/api/convert")
async def convert_endpoint(
    file: UploadFile = File(...),
    output_format: str = Form("png"),
    background_color: str = Form("#ffffff"),
    quality: int = Form(95),
    webp_lossless: bool = Form(False),
    ico_sizes: str = Form("16,32,48,64,128,256"),
    output_size: int = Form(0),
) -> Response:
    normalized_format = output_format.lower().strip().lstrip(".")
    if normalized_format == "jpeg":
        normalized_format = "jpg"
    if normalized_format not in SUPPORTED_OUTPUT_FORMATS:
        raise HTTPException(status_code=400, detail="지원하지 않는 출력 형식입니다.")

    contents = await _read_upload(file)

    try:
        options = ConvertOptions(
            output_format=normalized_format,
            background_color=background_color,
            quality=quality,
            webp_lossless=webp_lossless,
            ico_sizes=parse_ico_sizes(ico_sizes),
            output_size=output_size if output_size > 0 else None,
        )
        result = await run_in_threadpool(convert_image, contents, options)
    except ConvertInvalidImageError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    except ConvertImageTooLargeError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except (UnsupportedFormatError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    filename = _converted_filename(file.filename, result.output_format)
    return Response(
        content=result.data,
        media_type=result.media_type,
        headers={
            "Content-Disposition": _content_disposition(filename),
            "X-Image-Width": str(result.width),
            "X-Image-Height": str(result.height),
            "X-Output-Format": result.output_format,
            "X-Optimization-Mode": "lossless" if webp_lossless else "standard",
            "X-Process-Time-Ms": str(result.elapsed_ms),
        },
    )


@app.exception_handler(Exception)
async def unhandled_error(_, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"detail": f"처리 중 오류가 발생했습니다: {exc}"},
    )


def _output_filename(filename: str | None) -> str:
    if not filename:
        return "cutout.png"
    stem = Path(filename).stem or "cutout"
    safe = "".join(ch if ch.isalnum() or ch in ("-", "_") else "-" for ch in stem).strip("-")
    if not safe:
        return "cutout.png"
    return f"{safe}-cutout.png"


def _converted_filename(filename: str | None, output_format: str) -> str:
    extension = "jpg" if output_format == "jpg" else output_format
    if not filename:
        return f"converted.{extension}"
    stem = Path(filename).stem or "converted"
    safe = "".join(ch if ch.isalnum() or ch in ("-", "_") else "-" for ch in stem).strip("-")
    if not safe:
        safe = "converted"
    return f"{safe}.{extension}"


def _archive_filename(filename: str | None) -> str:
    if not filename:
        return "toolbox-cutouts.zip"
    stem = Path(filename).stem or "toolbox-cutouts"
    safe = "".join(ch if ch.isalnum() or ch in ("-", "_") else "-" for ch in stem).strip("-")
    return f"{safe or 'toolbox-cutouts'}.zip"


def _zip_entry_filename(filename: str | None) -> str:
    if not filename:
        return "cutout.png"
    name = Path(filename.replace("\\", "/")).name.replace("\x00", "")
    stem = Path(name).stem or "cutout"
    suffix = Path(name).suffix.lower() or ".png"
    safe_stem = "".join(ch if ch.isalnum() or ch in ("-", "_") else "-" for ch in stem).strip("-")
    safe_suffix = suffix if suffix in (".png", ".webp", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".ico") else ".png"
    return f"{safe_stem or 'cutout'}{safe_suffix}"


def _build_zip_archive(entries: list[tuple[str, bytes]]) -> bytes:
    buffer = BytesIO()
    used_names: dict[str, int] = {}
    with ZipFile(buffer, mode="w", compression=ZIP_DEFLATED) as archive:
        for filename, contents in entries:
            archive.writestr(_dedupe_filename(filename, used_names), contents)
    return buffer.getvalue()


def _dedupe_filename(filename: str, used_names: dict[str, int]) -> str:
    normalized = filename or "cutout.png"
    count = used_names.get(normalized, 0)
    used_names[normalized] = count + 1
    if count == 0:
        return normalized
    path = Path(normalized)
    return f"{path.stem}-{count + 1}{path.suffix}"


def _content_disposition(filename: str) -> str:
    suffix = Path(filename).suffix or ".png"
    ascii_stem = "".join(
        ch if ch.isascii() and (ch.isalnum() or ch in ("-", "_", ".")) else "-"
        for ch in Path(filename).stem
    ).strip("-")
    ascii_name = f"{ascii_stem}{suffix}" if ascii_stem else f"download{suffix}"
    utf8_name = quote(filename, safe="")
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{utf8_name}"


async def _read_upload(file: UploadFile) -> bytes:
    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"파일은 최대 {_format_bytes(MAX_UPLOAD_BYTES)}까지 업로드할 수 있습니다.",
        )
    if not contents:
        raise HTTPException(status_code=400, detail="비어 있는 파일입니다.")
    return contents


def _format_bytes(value: int) -> str:
    units = ("B", "KB", "MB", "GB")
    size = float(value)
    unit_index = 0
    while size >= 1024 and unit_index < len(units) - 1:
        size /= 1024
        unit_index += 1
    precision = 0 if unit_index == 0 else 1
    return f"{size:.{precision}f} {units[unit_index]}"
