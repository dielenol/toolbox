from __future__ import annotations

import time
import warnings
from dataclasses import dataclass
from functools import lru_cache
from io import BytesIO

from PIL import Image, ImageChops, ImageFilter, ImageOps, UnidentifiedImageError
from rembg import new_session, remove

from app.settings import (
    BIREFNET_INPUT_SIZE,
    BIREFNET_REPO,
    BIREFNET_REVISION,
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
    license_note: str = ""

    def to_payload(self) -> dict[str, str]:
        return {
            "id": self.id,
            "name": self.name,
            "profile": self.profile,
            "description": self.description,
            "engine": self.engine,
            "license_note": self.license_note,
        }


BIREFNET_MODEL = "birefnet-hq"
MODEL_CATALOG = (
    ModelSpec(
        id=BIREFNET_MODEL,
        name="BiRefNet HQ",
        profile="만능 최고 품질",
        description="복잡한 배경, 제품 윤곽, 머리카락까지 가장 정밀하게 처리하는 기본 최고 품질 모델입니다.",
        engine="transformers",
    ),
    ModelSpec(
        id="birefnet-massive",
        name="BiRefNet Massive",
        profile="캐릭터/복잡 경계",
        description="캐릭터, 피규어, 복잡한 실루엣처럼 경계가 많은 이미지에 우선 시도할 고품질 모델입니다.",
        engine="rembg",
    ),
    ModelSpec(
        id="birefnet-hrsod",
        name="BiRefNet HRSOD",
        profile="로고/제품 윤곽",
        description="고해상도 피사체와 선명한 제품/로고 윤곽을 따야 할 때 맞는 고품질 모델입니다.",
        engine="rembg",
    ),
    ModelSpec(
        id="birefnet-portrait",
        name="BiRefNet Portrait",
        profile="인물/프로필",
        description="사람 중심 이미지와 프로필 사진에 맞춘 모델입니다.",
        engine="rembg",
    ),
    ModelSpec(
        id="isnet-anime",
        name="ISNet Anime",
        profile="애니/일러스트",
        description="애니메이션, 일러스트, 2D 캐릭터 이미지에 맞춘 모델입니다.",
        engine="rembg",
    ),
    ModelSpec(
        id="bria-rmbg",
        name="BRIA RMBG 2.0",
        profile="로고/문자/제품",
        description="제품, 로고, 글자 요소가 섞인 이미지에 강한 모델입니다. 라이선스 제한을 확인하고 사용하세요.",
        engine="rembg",
        license_note="비상업/별도 라이선스 확인 필요",
    ),
    ModelSpec(
        id="birefnet-general",
        name="BiRefNet General",
        profile="일반 고품질",
        description="일반 사진 전반에 쓰기 좋은 최신 rembg BiRefNet 계열 모델입니다.",
        engine="rembg",
    ),
    ModelSpec(
        id="birefnet-general-lite",
        name="BiRefNet General Lite",
        profile="가벼운 고품질",
        description="BiRefNet 계열 중 상대적으로 가벼운 모델입니다. 벌크 작업에서 품질과 속도 균형이 필요할 때 쓰세요.",
        engine="rembg",
    ),
    ModelSpec(
        id="isnet-general-use",
        name="ISNet General",
        profile="기존 품질 우선",
        description="품질과 속도의 균형이 좋은 기존 일반 사진용 모델입니다.",
        engine="rembg",
    ),
    ModelSpec(
        id="u2net_human_seg",
        name="Human Segmentation",
        profile="인물 빠른 처리",
        description="사람만 빠르게 따고 싶을 때 선택하는 기존 인물 세그멘테이션 모델입니다.",
        engine="rembg",
    ),
    ModelSpec(
        id="u2net",
        name="U2-Net",
        profile="균형",
        description="빠르고 안정적인 기존 균형형 모델입니다. 대량 작업이나 단순 배경에 적합합니다.",
        engine="rembg",
    ),
    ModelSpec(
        id="u2netp",
        name="U2-Netp",
        profile="최고 속도",
        description="가장 빠른 미리보기용 모델입니다. 복잡한 가장자리 정밀도는 낮을 수 있습니다.",
        engine="rembg",
    ),
    ModelSpec(
        id="silueta",
        name="Silueta",
        profile="소형 일반",
        description="가벼운 일반 배경 제거 모델입니다. 빠른 처리 후보로 두고 비교하세요.",
        engine="rembg",
    ),
)
MODEL_GROUPS = (
    (
        "recommended",
        "목적별 추천",
        (
            BIREFNET_MODEL,
            "birefnet-massive",
            "birefnet-hrsod",
            "birefnet-portrait",
            "isnet-anime",
            "bria-rmbg",
        ),
    ),
    (
        "general",
        "일반/벌크 후보",
        (
            "birefnet-general",
            "birefnet-general-lite",
            "isnet-general-use",
            "u2net_human_seg",
            "u2net",
            "u2netp",
            "silueta",
        ),
    ),
)
MODEL_BY_ID = {model.id: model for model in MODEL_CATALOG}
REMBG_MODELS = tuple(model.id for model in MODEL_CATALOG if model.engine == "rembg")
SUPPORTED_MODELS = (BIREFNET_MODEL, *REMBG_MODELS)
DEFAULT_MODEL = DEFAULT_MODEL_NAME if DEFAULT_MODEL_NAME in SUPPORTED_MODELS else BIREFNET_MODEL
if DEFAULT_MODEL_NAME not in SUPPORTED_MODELS:
    warnings.warn(
        f"Unsupported default model {DEFAULT_MODEL_NAME!r}. Falling back to {BIREFNET_MODEL!r}.",
        RuntimeWarning,
        stacklevel=2,
    )

Image.MAX_IMAGE_PIXELS = MAX_PIXELS


@dataclass(frozen=True)
class RemoveOptions:
    model_name: str = DEFAULT_MODEL
    alpha_matting: bool = True
    post_process_mask: bool = True
    foreground_refine: bool = True
    foreground_threshold: int = 240
    background_threshold: int = 10
    erode_size: int = 10
    edge_feather: float = 0.4
    png_compression: int = 4


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


def remove_background(contents: bytes, options: RemoveOptions) -> RemoveResult:
    started = time.perf_counter()
    if options.model_name not in SUPPORTED_MODELS:
        raise UnsupportedModelError(f"Unsupported model: {options.model_name}")

    image = _load_image(contents)
    rgba = image.convert("RGBA")
    model_input = _flatten_for_model(rgba)

    if options.model_name == BIREFNET_MODEL:
        mask = _remove_with_birefnet(model_input, rgba.size)
    else:
        mask = _remove_with_rembg(model_input, options)
    mask = _normalize_mask(mask, rgba.size, options.edge_feather)

    source_alpha = rgba.getchannel("A")
    if source_alpha.getextrema() != (255, 255):
        mask = ImageChops.multiply(mask, source_alpha)

    output = _refine_foreground(rgba, mask) if options.foreground_refine else rgba.copy()
    output.putalpha(mask)

    buffer = BytesIO()
    save_kwargs = {
        "format": "PNG",
        "compress_level": _clamp_int(options.png_compression, 0, 9),
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
        model_name=options.model_name,
    )


def _remove_with_rembg(model_input: Image.Image, options: RemoveOptions) -> Image.Image:
    session = get_session(options.model_name)
    return remove(
        model_input,
        session=session,
        only_mask=True,
        alpha_matting=options.alpha_matting,
        alpha_matting_foreground_threshold=options.foreground_threshold,
        alpha_matting_background_threshold=options.background_threshold,
        alpha_matting_erode_size=options.erode_size,
        post_process_mask=options.post_process_mask,
    )


@lru_cache(maxsize=1)
def _get_birefnet_runtime():
    try:
        import torch
        from torchvision import transforms
        from torchvision.transforms import InterpolationMode
        from transformers import AutoModelForImageSegmentation
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "BiRefNet HQ를 사용하려면 torch, torchvision, transformers, timm이 필요합니다."
        ) from exc

    if TORCH_THREADS:
        torch.set_num_threads(TORCH_THREADS)
    torch.set_float32_matmul_precision("high")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = AutoModelForImageSegmentation.from_pretrained(
        BIREFNET_REPO,
        revision=BIREFNET_REVISION,
        trust_remote_code=True,
    )
    model.to(device)
    model.eval()

    image_size = (BIREFNET_INPUT_SIZE, BIREFNET_INPUT_SIZE)
    transform = transforms.Compose(
        [
            transforms.Resize(image_size, interpolation=InterpolationMode.BILINEAR),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )
    to_pil = transforms.ToPILImage()
    return model, transform, to_pil, torch, device


def _remove_with_birefnet(model_input: Image.Image, size: tuple[int, int]) -> Image.Image:
    model, transform, to_pil, torch, device = _get_birefnet_runtime()
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

    image = ImageOps.exif_transpose(image)
    return image


def _flatten_for_model(rgba: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", rgba.size, (255, 255, 255))
    canvas.paste(rgba, mask=rgba.getchannel("A"))
    return canvas


def _normalize_mask(mask, size: tuple[int, int], edge_feather: float) -> Image.Image:
    if not isinstance(mask, Image.Image):
        mask = Image.open(BytesIO(mask))
    mask = mask.convert("L")
    if mask.size != size:
        mask = mask.resize(size, Image.Resampling.LANCZOS)
    if edge_feather > 0:
        mask = mask.filter(ImageFilter.GaussianBlur(radius=edge_feather))
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
    rgb_array = np.asarray(rgb, dtype=np.float64) / 255.0
    alpha = np.asarray(mask, dtype=np.float64) / 255.0
    edge = (alpha > 0.01) & (alpha < 0.98)
    if not edge.any():
        return rgba.copy()

    foreground = np.clip(estimate_foreground_ml(rgb_array, alpha), 0.0, 1.0)
    weight = np.clip((1.0 - alpha) * 1.35, 0.0, 1.0)
    refined = rgb_array.copy()
    refined[edge] = (
        rgb_array[edge] * (1.0 - weight[edge, None])
        + foreground[edge] * weight[edge, None]
    )
    output = Image.fromarray((np.clip(refined, 0.0, 1.0) * 255.0 + 0.5).astype("uint8"))
    return output.convert("RGBA")


def _clamp_int(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, int(value)))
