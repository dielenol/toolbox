from __future__ import annotations

from dataclasses import asdict, dataclass
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw

from app.image_orientation import normalize_display_orientation


@dataclass(frozen=True)
class CutoutQualityReport:
    width: int
    height: int
    alpha_min: int
    alpha_max: int
    transparent_ratio: float
    opaque_ratio: float
    soft_edge_ratio: float
    structurally_valid: bool
    warnings: tuple[str, ...]

    def to_payload(self) -> dict[str, object]:
        payload = asdict(self)
        payload["warnings"] = list(self.warnings)
        return payload


def analyze_cutout(source: bytes, cutout: bytes) -> CutoutQualityReport:
    source_image = _load(source)
    output = _load(cutout).convert("RGBA")
    alpha = output.getchannel("A")
    histogram = alpha.histogram()
    total = output.width * output.height
    alpha_min, alpha_max = alpha.getextrema()
    transparent_ratio = sum(histogram[:6]) / total
    opaque_ratio = sum(histogram[250:]) / total
    soft_edge_ratio = sum(histogram[6:250]) / total
    visible_subject_ratio = soft_edge_ratio + opaque_ratio

    warnings: list[str] = []
    if output.size != source_image.size:
        warnings.append("결과 크기가 표시 방향을 반영한 원본 크기와 다릅니다.")
    if alpha_min == 255:
        warnings.append("투명 픽셀이 없어 배경 제거에 실패했을 가능성이 큽니다.")
    if alpha_max == 0:
        warnings.append("결과가 완전히 투명해 피사체가 사라졌습니다.")
    elif visible_subject_ratio == 0:
        warnings.append("결과가 사실상 완전히 투명해 보이는 피사체가 없습니다.")
    if alpha_min < 255 and transparent_ratio == 0:
        warnings.append("완전히 투명한 배경 영역이 없어 알파 마스크가 잘못됐을 수 있습니다.")
    if 0 < transparent_ratio < 0.002:
        warnings.append("투명 영역이 0.2% 미만이어서 배경이 거의 남았을 수 있습니다.")
    if 0 < visible_subject_ratio < 0.002:
        warnings.append("보이는 피사체 영역이 0.2% 미만이어서 과도하게 제거됐을 수 있습니다.")

    structurally_valid = (
        output.size == source_image.size
        and 0 < transparent_ratio < 1
        and alpha_max > 0
        and alpha_max > alpha_min
    )
    return CutoutQualityReport(
        width=output.width,
        height=output.height,
        alpha_min=alpha_min,
        alpha_max=alpha_max,
        transparent_ratio=round(transparent_ratio, 6),
        opaque_ratio=round(opaque_ratio, 6),
        soft_edge_ratio=round(soft_edge_ratio, 6),
        structurally_valid=structurally_valid,
        warnings=tuple(warnings),
    )


def save_qa_preview(source: bytes, cutout: bytes, target: Path) -> Path:
    original = _load(source).convert("RGBA")
    output = _load(cutout).convert("RGBA")
    pane_size = (560, 560)
    panels = (
        ("Original", _fit_on_background(original, pane_size, (238, 241, 245, 255))),
        ("Checker", _fit_on_checkerboard(output, pane_size)),
        ("White", _fit_on_background(output, pane_size, (255, 255, 255, 255))),
        ("Black", _fit_on_background(output, pane_size, (16, 18, 22, 255))),
    )
    label_height = 34
    gap = 16
    canvas = Image.new(
        "RGB",
        (pane_size[0] * 2 + gap * 3, (pane_size[1] + label_height) * 2 + gap * 3),
        (28, 31, 37),
    )
    draw = ImageDraw.Draw(canvas)

    for index, (label, panel) in enumerate(panels):
        column = index % 2
        row = index // 2
        x = gap + column * (pane_size[0] + gap)
        y = gap + row * (pane_size[1] + label_height + gap)
        draw.text((x + 4, y + 8), label, fill=(245, 247, 250))
        canvas.paste(panel.convert("RGB"), (x, y + label_height))

    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, format="PNG", compress_level=4)
    return target.resolve()


def _load(contents: bytes) -> Image.Image:
    image = Image.open(BytesIO(contents))
    image.load()
    return normalize_display_orientation(image)


def _fit_on_checkerboard(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    background = _checkerboard(size)
    foreground = _thumbnail(image, size)
    position = ((size[0] - foreground.width) // 2, (size[1] - foreground.height) // 2)
    background.alpha_composite(foreground, position)
    return background


def _fit_on_background(
    image: Image.Image,
    size: tuple[int, int],
    color: tuple[int, int, int, int],
) -> Image.Image:
    background = Image.new("RGBA", size, color)
    foreground = _thumbnail(image, size)
    position = ((size[0] - foreground.width) // 2, (size[1] - foreground.height) // 2)
    background.alpha_composite(foreground, position)
    return background


def _thumbnail(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    result = image.copy().convert("RGBA")
    result.thumbnail(size, Image.Resampling.LANCZOS)
    return result


def _checkerboard(size: tuple[int, int], cell: int = 28) -> Image.Image:
    image = Image.new("RGBA", size, (230, 233, 238, 255))
    draw = ImageDraw.Draw(image)
    alternate = (190, 195, 204, 255)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, min(x + cell, size[0]), min(y + cell, size[1])), fill=alternate)
    return image
