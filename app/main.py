from __future__ import annotations

from io import BytesIO
from pathlib import Path
from urllib.parse import quote
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
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
from app.local_save import save_file_with_dialog
from app.remover import (
    DEFAULT_MODEL,
    MODEL_BY_ID,
    MODEL_GROUPS,
    SUPPORTED_MODELS,
    ImageTooLargeError,
    InvalidImageError,
    RemoveOptions,
    UnsupportedModelError,
    remove_background,
)
from app.settings import MAX_UPLOAD_BYTES


BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Toolbox", version="0.1.0")
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
        "groups": groups,
        "models": [model.to_payload() for model in MODEL_BY_ID.values()],
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
    model_name: str = Form(DEFAULT_MODEL),
    alpha_matting: bool = Form(True),
    post_process_mask: bool = Form(True),
    foreground_refine: bool = Form(True),
    foreground_threshold: int = Form(240),
    background_threshold: int = Form(10),
    erode_size: int = Form(10),
    edge_feather: float = Form(0.4),
    png_compression: int = Form(4),
) -> Response:
    if model_name not in SUPPORTED_MODELS:
        raise HTTPException(status_code=400, detail="지원하지 않는 모델입니다.")

    contents = await _read_upload(file)

    options = RemoveOptions(
        model_name=model_name,
        alpha_matting=alpha_matting,
        post_process_mask=post_process_mask,
        foreground_refine=foreground_refine,
        foreground_threshold=foreground_threshold,
        background_threshold=background_threshold,
        erode_size=erode_size,
        edge_feather=edge_feather,
        png_compression=png_compression,
    )

    try:
        result = await run_in_threadpool(remove_background, contents, options)
    except InvalidImageError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    except ImageTooLargeError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except UnsupportedModelError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    filename = _output_filename(file.filename)
    return Response(
        content=result.png,
        media_type="image/png",
        headers={
            "Content-Disposition": _content_disposition(filename),
            "X-Image-Width": str(result.width),
            "X-Image-Height": str(result.height),
            "X-Model": result.model_name,
            "X-Process-Time-Ms": str(result.elapsed_ms),
        },
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
