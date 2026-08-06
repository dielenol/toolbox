from __future__ import annotations

import os
import threading
import time
import warnings
from dataclasses import dataclass
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from tempfile import gettempdir

from filelock import FileLock
from PIL import Image, ImageChops, UnidentifiedImageError
from rembg import new_session, remove

from app.image_orientation import normalize_display_orientation
from app.settings import (
    DEFAULT_MODEL_NAME,
    MAX_PIXELS,
    TORCH_THREADS,
)


@dataclass(frozen=True)
class ModelSpec:
    id: str
    name: str
    profile: str
    description: str
    engine: str
    license_id: str
    tasks: tuple[str, ...]
    fallback_model: str
    repo_id: str = ""
    revision: str = ""
    input_size: int = 0

    def to_payload(self) -> dict[str, object]:
        return {
            "id": self.id,
            "name": self.name,
            "profile": self.profile,
            "description": self.description,
            "engine": self.engine,
            "license_id": self.license_id,
            "tasks": list(self.tasks),
            "fallback_model": self.fallback_model,
        }


@dataclass(frozen=True)
class TaskSpec:
    id: str
    name: str
    description: str
    model_id: str

    def to_payload(self) -> dict[str, str]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "model_id": self.model_id,
        }


LUCIDA_MODEL = "lucida"
BIREFNET_HR_MATTING_MODEL = "birefnet-hr-matting"
BIREFNET_HR_MODEL = "birefnet-hr"
ISNET_ANIME_MODEL = "isnet-anime"

MODEL_CATALOG = (
    ModelSpec(
        id=LUCIDA_MODEL,
        name="Lucida",
        profile="투명/디자인 최고",
        description="투명 소재, 로고와 글자, 일러스트, 발광 효과, 위장 배경을 가장 정밀하게 보존합니다.",
        engine="transformers",
        license_id="MIT",
        tasks=("general", "character", "transparent", "design"),
        fallback_model=BIREFNET_HR_MATTING_MODEL,
        repo_id="egeorcun/lucida",
        revision="6cbedc9722652dc9a3df91dd871f0c4f3334e922",
        input_size=1024,
    ),
    ModelSpec(
        id=BIREFNET_HR_MATTING_MODEL,
        name="BiRefNet HR Matting",
        profile="인물/머리카락 최고",
        description="2048 입력으로 인물, 머리카락, 털, 부드러운 경계와 고해상도 사진을 정밀하게 처리합니다.",
        engine="transformers",
        license_id="MIT",
        tasks=("portrait", "hair"),
        fallback_model=LUCIDA_MODEL,
        repo_id="ZhengPeng7/BiRefNet_HR-matting",
        revision="5d6b6f8adcb5b417c871b1d84ceaae9871355b7f",
        input_size=2048,
    ),
    ModelSpec(
        id=BIREFNET_HR_MODEL,
        name="BiRefNet HR",
        profile="제품/고해상도 최고",
        description="2048 입력으로 제품, 3D 캐릭터, 복잡한 실루엣과 다중 피사체의 경계를 선명하게 분리합니다.",
        engine="transformers",
        license_id="MIT",
        tasks=("product", "complex"),
        fallback_model=LUCIDA_MODEL,
        repo_id="ZhengPeng7/BiRefNet_HR",
        revision="a7a562f6fd16021180f2f4348f4de003a2d3d1e1",
        input_size=2048,
    ),
    ModelSpec(
        id=ISNET_ANIME_MODEL,
        name="ISNet Anime",
        profile="2D 애니 최고",
        description="애니메이션과 셀 셰이딩 2D 캐릭터의 선화와 내부 구멍을 전용 체크포인트로 분리합니다.",
        engine="rembg",
        license_id="Apache-2.0",
        tasks=("anime",),
        fallback_model=LUCIDA_MODEL,
    ),
)
MODEL_GROUPS = (
    (
        "recommended",
        "목적별 최고 품질",
        (
            LUCIDA_MODEL,
            BIREFNET_HR_MATTING_MODEL,
            BIREFNET_HR_MODEL,
            ISNET_ANIME_MODEL,
        ),
    ),
)
MODEL_BY_ID = {model.id: model for model in MODEL_CATALOG}
REMBG_MODELS = tuple(model.id for model in MODEL_CATALOG if model.engine == "rembg")
SUPPORTED_MODELS = tuple(model.id for model in MODEL_CATALOG)
DEFAULT_MODEL = DEFAULT_MODEL_NAME if DEFAULT_MODEL_NAME in SUPPORTED_MODELS else LUCIDA_MODEL
if DEFAULT_MODEL_NAME not in SUPPORTED_MODELS:
    warnings.warn(
        f"Unsupported default model {DEFAULT_MODEL_NAME!r}. Falling back to {LUCIDA_MODEL!r}.",
        RuntimeWarning,
        stacklevel=2,
    )

TASK_CATALOG = (
    TaskSpec("general", "범용", "종류가 섞였거나 판단이 어려운 일반 이미지", LUCIDA_MODEL),
    TaskSpec("character", "캐릭터/일러스트", "게임 캐릭터, 디지털 일러스트, 회화풍 이미지", LUCIDA_MODEL),
    TaskSpec("transparent", "투명/효과", "유리, 반투명 천, 연기, 빛, 그림자, 글자와 로고", LUCIDA_MODEL),
    TaskSpec("design", "디자인", "스티커, 인쇄물, 문자 중심 그래픽, 위장 배경", LUCIDA_MODEL),
    TaskSpec("portrait", "인물", "실사 인물, 프로필, 전신 사진", BIREFNET_HR_MATTING_MODEL),
    TaskSpec("hair", "머리카락/털", "머리카락, 동물 털, 미세하고 부드러운 경계", BIREFNET_HR_MATTING_MODEL),
    TaskSpec("product", "제품/오브젝트", "제품, 장비, 로고가 아닌 단단한 물체", BIREFNET_HR_MODEL),
    TaskSpec("complex", "복잡한 실루엣", "3D 캐릭터, 여러 피사체, 가는 구조와 내부 구멍", BIREFNET_HR_MODEL),
    TaskSpec("anime", "2D 애니", "애니메이션, 셀 셰이딩, 선화 중심 2D 캐릭터", ISNET_ANIME_MODEL),
)
TASK_BY_ID = {task.id: task for task in TASK_CATALOG}
DEFAULT_TASK = "general"

FOREGROUND_REFINE_TILE_SIZE = 1536
FOREGROUND_REFINE_TILE_OVERLAP = 64
_SOFT_EDGE_LOOKUP = tuple(255 if 2 < value < 250 else 0 for value in range(256))
_INFERENCE_THREAD_LOCK = threading.Lock()
_INFERENCE_PROCESS_LOCK = FileLock(
    Path(gettempdir()) / "toolbox-cutout-inference.lock",
)

Image.MAX_IMAGE_PIXELS = MAX_PIXELS
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")


@dataclass(frozen=True)
class RemoveOptions:
    model_name: str = DEFAULT_MODEL


@dataclass(frozen=True)
class RemoveResult:
    png: bytes
    width: int
    height: int
    elapsed_ms: int
    model_name: str


class ImageTooLargeError(ValueError):
    pass


class UnsupportedModelError(ValueError):
    pass


class InvalidImageError(ValueError):
    pass


@lru_cache(maxsize=len(REMBG_MODELS))
def get_session(model_name: str):
    if model_name not in REMBG_MODELS:
        raise UnsupportedModelError(f"Unsupported model: {model_name}")
    return new_session(model_name)


def resolve_task_model(task_name: str) -> ModelSpec:
    normalized = task_name.strip().lower()
    task = TASK_BY_ID.get(normalized)
    if task is None:
        supported = ", ".join(TASK_BY_ID)
        raise ValueError(f"Unsupported task: {task_name}. Choose one of: {supported}")
    return MODEL_BY_ID[task.model_id]


def remove_background(contents: bytes, options: RemoveOptions) -> RemoveResult:
    started = time.perf_counter()
    if options.model_name not in SUPPORTED_MODELS:
        raise UnsupportedModelError(f"Unsupported model: {options.model_name}")

    model_spec = MODEL_BY_ID[options.model_name]
    with _INFERENCE_THREAD_LOCK:
        with _INFERENCE_PROCESS_LOCK:
            return _remove_background_serialized(contents, model_spec, started)


def _remove_background_serialized(
    contents: bytes,
    model_spec: ModelSpec,
    started: float,
) -> RemoveResult:
    image = _load_image(contents)
    rgba = image.convert("RGBA")
    model_input = _flatten_for_model(rgba)

    if model_spec.engine == "transformers":
        mask = _remove_with_transformer(model_spec, model_input, rgba.size)
    else:
        mask = _remove_with_rembg(model_input, model_spec.id)
    mask = _normalize_mask(mask, rgba.size)

    source_alpha = rgba.getchannel("A")
    if source_alpha.getextrema() != (255, 255):
        mask = ImageChops.multiply(mask, source_alpha)

    output = _refine_foreground(rgba, mask)
    output.putalpha(mask)

    buffer = BytesIO()
    save_kwargs = {
        "format": "PNG",
        "compress_level": 4,
    }
    icc_profile = image.info.get("icc_profile") if image.mode in ("RGB", "RGBA") else None
    if icc_profile:
        save_kwargs["icc_profile"] = icc_profile
    output.save(buffer, **save_kwargs)

    return RemoveResult(
        png=buffer.getvalue(),
        width=output.width,
        height=output.height,
        elapsed_ms=round((time.perf_counter() - started) * 1000),
        model_name=model_spec.id,
    )


def _remove_with_rembg(model_input: Image.Image, model_name: str) -> Image.Image:
    session = get_session(model_name)
    return remove(
        model_input,
        session=session,
        only_mask=True,
    )


@lru_cache(maxsize=1)
def _get_transformer_runtime(repo_id: str, revision: str, input_size: int):
    try:
        import torch
        from torchvision import transforms
        from torchvision.transforms import InterpolationMode
        from transformers import AutoModelForImageSegmentation
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "최고 품질 모델을 사용하려면 torch, torchvision, transformers, timm이 필요합니다."
        ) from exc

    if TORCH_THREADS:
        torch.set_num_threads(TORCH_THREADS)
    torch.set_float32_matmul_precision("highest")

    if torch.cuda.is_available():
        device = "cuda"
    elif torch.backends.mps.is_available():
        device = "mps"
    else:
        device = "cpu"

    model = AutoModelForImageSegmentation.from_pretrained(
        repo_id,
        revision=revision,
        trust_remote_code=True,
        use_safetensors=True,
    )
    model.to(device)
    model.eval()

    image_size = (input_size, input_size)
    transform = transforms.Compose(
        [
            transforms.Resize(image_size, interpolation=InterpolationMode.BILINEAR),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )
    to_pil = transforms.ToPILImage()
    return model, transform, to_pil, torch, device


def _remove_with_transformer(
    model_spec: ModelSpec,
    model_input: Image.Image,
    size: tuple[int, int],
) -> Image.Image:
    model, transform, to_pil, torch, device = _get_transformer_runtime(
        model_spec.repo_id,
        model_spec.revision,
        model_spec.input_size,
    )
    input_tensor = transform(model_input.convert("RGB")).unsqueeze(0).to(device)
    with torch.inference_mode():
        prediction = model(input_tensor)[-1].sigmoid().detach().cpu()
    mask = to_pil(prediction[0].squeeze()).resize(size, Image.Resampling.LANCZOS)
    return mask.convert("L")


def _load_image(contents: bytes) -> Image.Image:
    try:
        image = Image.open(BytesIO(contents))
        pixel_count = image.width * image.height
        if pixel_count > MAX_PIXELS:
            megapixels = MAX_PIXELS / 1_000_000
            raise ImageTooLargeError(f"이미지는 최대 {megapixels:.0f}MP까지 처리할 수 있습니다.")
        image.load()
    except ImageTooLargeError:
        raise
    except Image.DecompressionBombError as exc:
        megapixels = MAX_PIXELS / 1_000_000
        raise ImageTooLargeError(f"이미지는 최대 {megapixels:.0f}MP까지 처리할 수 있습니다.") from exc
    except (UnidentifiedImageError, OSError) as exc:
        raise InvalidImageError("이미지 파일을 읽을 수 없습니다.") from exc

    return normalize_display_orientation(image)


def _flatten_for_model(rgba: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", rgba.size, (255, 255, 255))
    canvas.paste(rgba, mask=rgba.getchannel("A"))
    return canvas


def _normalize_mask(mask, size: tuple[int, int]) -> Image.Image:
    if not isinstance(mask, Image.Image):
        mask = Image.open(BytesIO(mask))
    mask = mask.convert("L")
    if mask.size != size:
        mask = mask.resize(size, Image.Resampling.LANCZOS)
    return mask


def _refine_foreground(rgba: Image.Image, mask: Image.Image) -> Image.Image:
    alpha_range = mask.getextrema()
    if alpha_range in ((0, 0), (255, 255)):
        return rgba.copy()

    try:
        import numpy as np
        from pymatting import estimate_foreground_ml
    except ModuleNotFoundError:
        return rgba.copy()

    rgb = rgba.convert("RGB")
    soft_edges = mask.point(_SOFT_EDGE_LOOKUP)
    edge_bbox = soft_edges.getbbox()
    if edge_bbox is None:
        return rgba.copy()

    output = rgb.copy()
    left, top, right, bottom = edge_bbox
    for core_top in range(top, bottom, FOREGROUND_REFINE_TILE_SIZE):
        core_bottom = min(core_top + FOREGROUND_REFINE_TILE_SIZE, bottom)
        for core_left in range(left, right, FOREGROUND_REFINE_TILE_SIZE):
            core_right = min(core_left + FOREGROUND_REFINE_TILE_SIZE, right)
            core_box = (core_left, core_top, core_right, core_bottom)
            if soft_edges.crop(core_box).getbbox() is None:
                continue

            region_box = _expand_box(
                core_box,
                rgb.size,
                FOREGROUND_REFINE_TILE_OVERLAP,
            )
            refined_region = _refine_foreground_region(
                rgb.crop(region_box),
                mask.crop(region_box),
                np,
                estimate_foreground_ml,
            )
            relative_core = (
                core_left - region_box[0],
                core_top - region_box[1],
                core_right - region_box[0],
                core_bottom - region_box[1],
            )
            output.paste(refined_region.crop(relative_core), (core_left, core_top))

    return output.convert("RGBA")


def _refine_foreground_region(
    rgb: Image.Image,
    mask: Image.Image,
    np,
    estimate_foreground_ml,
) -> Image.Image:
    rgb_array = np.asarray(rgb, dtype=np.float32) / np.float32(255.0)
    alpha = np.asarray(mask, dtype=np.float32) / np.float32(255.0)
    edge = (alpha > 0.01) & (alpha < 0.98)
    if not edge.any():
        return rgb.copy()

    foreground = estimate_foreground_ml(rgb_array, alpha)
    np.clip(foreground, 0.0, 1.0, out=foreground)
    weight = np.clip(
        (np.float32(1.0) - alpha) * np.float32(1.35),
        0.0,
        1.0,
    )
    refined = rgb_array.copy()
    refined[edge] = (
        rgb_array[edge] * (1.0 - weight[edge, None])
        + foreground[edge] * weight[edge, None]
    )
    np.clip(refined, 0.0, 1.0, out=refined)
    refined *= np.float32(255.0)
    refined += np.float32(0.5)
    return Image.fromarray(refined.astype("uint8"))


def _expand_box(
    box: tuple[int, int, int, int],
    size: tuple[int, int],
    padding: int,
) -> tuple[int, int, int, int]:
    left, top, right, bottom = box
    width, height = size
    return (
        max(0, left - padding),
        max(0, top - padding),
        min(width, right + padding),
        min(height, bottom + padding),
    )
