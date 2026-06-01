from __future__ import annotations

import re
import time
from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

from app.remover import MAX_PIXELS


SUPPORTED_OUTPUT_FORMATS = ("png", "jpg", "webp", "bmp", "tiff", "ico")
MIME_TYPES = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "webp": "image/webp",
    "bmp": "image/bmp",
    "tiff": "image/tiff",
    "ico": "image/x-icon",
}
PIL_FORMATS = {
    "png": "PNG",
    "jpg": "JPEG",
    "webp": "WEBP",
    "bmp": "BMP",
    "tiff": "TIFF",
    "ico": "ICO",
}
DEFAULT_ICO_SIZES = (16, 32, 48, 64, 128, 256)


@dataclass(frozen=True)
class ConvertOptions:
    output_format: str = "png"
    background_color: str = "#ffffff"
    quality: int = 95
    webp_lossless: bool = False
    ico_sizes: tuple[int, ...] = DEFAULT_ICO_SIZES


@dataclass(frozen=True)
class ConvertResult:
    data: bytes
    width: int
    height: int
    elapsed_ms: int
    output_format: str
    media_type: str


class UnsupportedFormatError(ValueError):
    pass


class InvalidImageError(ValueError):
    pass


class ImageTooLargeError(ValueError):
    pass


def convert_image(contents: bytes, options: ConvertOptions) -> ConvertResult:
    started = time.perf_counter()
    output_format = _normalize_output_format(options.output_format)
    image = _load_image(contents)
    prepared = _prepare_for_format(image, output_format, options.background_color)

    buffer = BytesIO()
    save_kwargs = _save_kwargs(output_format, options)
    prepared.save(buffer, format=PIL_FORMATS[output_format], **save_kwargs)

    return ConvertResult(
        data=buffer.getvalue(),
        width=prepared.width,
        height=prepared.height,
        elapsed_ms=round((time.perf_counter() - started) * 1000),
        output_format=output_format,
        media_type=MIME_TYPES[output_format],
    )


def parse_ico_sizes(value: str | None) -> tuple[int, ...]:
    if not value:
        return DEFAULT_ICO_SIZES
    sizes = []
    for part in value.split(","):
        part = part.strip()
        if not part:
            continue
        size = int(part)
        if size < 8 or size > 256:
            raise ValueError("ICO 크기는 8부터 256 사이여야 합니다.")
        sizes.append(size)
    return tuple(sorted(set(sizes))) or DEFAULT_ICO_SIZES


def _normalize_output_format(output_format: str) -> str:
    normalized = output_format.lower().strip().lstrip(".")
    if normalized == "jpeg":
        normalized = "jpg"
    if normalized not in SUPPORTED_OUTPUT_FORMATS:
        raise UnsupportedFormatError(f"지원하지 않는 출력 형식입니다: {output_format}")
    return normalized


def _load_image(contents: bytes) -> Image.Image:
    try:
        image = Image.open(BytesIO(contents))
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise InvalidImageError("이미지 파일을 읽을 수 없습니다.") from exc

    image = ImageOps.exif_transpose(image)
    pixel_count = image.width * image.height
    if pixel_count > MAX_PIXELS:
        megapixels = MAX_PIXELS / 1_000_000
        raise ImageTooLargeError(f"이미지는 최대 {megapixels:.0f}MP까지 처리할 수 있습니다.")
    return image


def _prepare_for_format(image: Image.Image, output_format: str, background_color: str) -> Image.Image:
    if output_format in ("jpg", "bmp"):
        return _flatten_alpha(image.convert("RGBA"), background_color)
    if output_format == "ico":
        return image.convert("RGBA")
    if output_format in ("png", "webp", "tiff"):
        return image.convert("RGBA") if _has_alpha(image) else image.convert("RGB")
    return image


def _save_kwargs(output_format: str, options: ConvertOptions) -> dict[str, object]:
    quality = max(1, min(100, int(options.quality)))
    if output_format == "png":
        return {"compress_level": 4}
    if output_format == "jpg":
        return {"quality": quality, "optimize": True, "progressive": True}
    if output_format == "webp":
        if options.webp_lossless:
            return {"lossless": True, "quality": 100, "method": 6, "exact": True}
        return {"quality": quality, "method": 6}
    if output_format == "ico":
        return {"sizes": [(size, size) for size in options.ico_sizes]}
    if output_format == "tiff":
        return {"compression": "tiff_deflate"}
    return {}


def _flatten_alpha(rgba: Image.Image, background_color: str) -> Image.Image:
    background = Image.new("RGB", rgba.size, _parse_hex_color(background_color))
    background.paste(rgba, mask=rgba.getchannel("A"))
    return background


def _parse_hex_color(value: str) -> tuple[int, int, int]:
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        return (255, 255, 255)
    return tuple(int(value[index : index + 2], 16) for index in (1, 3, 5))


def _has_alpha(image: Image.Image) -> bool:
    return image.mode in ("RGBA", "LA") or (
        image.mode == "P" and "transparency" in image.info
    )
