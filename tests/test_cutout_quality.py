from __future__ import annotations

import tempfile
import unittest
from io import BytesIO
from pathlib import Path

from PIL import Image

from app.cutout_quality import analyze_cutout, save_qa_preview


def image_bytes(mode: str, size: tuple[int, int], color: tuple[int, ...]) -> bytes:
    image = Image.new(mode, size, color)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


class CutoutQualityTests(unittest.TestCase):
    def test_accepts_result_with_foreground_and_transparency(self) -> None:
        source = image_bytes("RGB", (10, 8), (220, 220, 220))
        output = Image.new("RGBA", (10, 8), (255, 0, 0, 0))
        for x in range(4, 7):
            for y in range(2, 6):
                output.putpixel((x, y), (255, 0, 0, 255))
        buffer = BytesIO()
        output.save(buffer, format="PNG")

        report = analyze_cutout(source, buffer.getvalue())

        self.assertTrue(report.structurally_valid)
        self.assertGreater(report.transparent_ratio, 0)
        self.assertGreater(report.opaque_ratio, 0)
        self.assertEqual(report.warnings, ())

    def test_rejects_fully_opaque_or_fully_transparent_result(self) -> None:
        source = image_bytes("RGB", (6, 4), (255, 255, 255))

        opaque = analyze_cutout(source, image_bytes("RGBA", (6, 4), (255, 0, 0, 255)))
        transparent = analyze_cutout(source, image_bytes("RGBA", (6, 4), (255, 0, 0, 0)))

        self.assertFalse(opaque.structurally_valid)
        self.assertIn("투명 픽셀이 없어", opaque.warnings[0])
        self.assertFalse(transparent.structurally_valid)
        self.assertIn("완전히 투명", transparent.warnings[0])

    def test_rejects_uniform_soft_alpha_without_a_transparent_background(self) -> None:
        source = image_bytes("RGB", (6, 4), (255, 255, 255))
        soft_only = analyze_cutout(
            source,
            image_bytes("RGBA", (6, 4), (255, 0, 0, 128)),
        )

        self.assertFalse(soft_only.structurally_valid)
        self.assertEqual(soft_only.transparent_ratio, 0)
        self.assertIn("완전히 투명한 배경 영역", soft_only.warnings[0])

    def test_accepts_translucent_subject_without_opaque_pixels(self) -> None:
        source = image_bytes("RGB", (6, 4), (255, 255, 255))
        output = Image.new("RGBA", (6, 4), (255, 0, 0, 0))
        for x in range(2, 4):
            for y in range(1, 3):
                output.putpixel((x, y), (255, 0, 0, 128))
        buffer = BytesIO()
        output.save(buffer, format="PNG")

        report = analyze_cutout(source, buffer.getvalue())

        self.assertTrue(report.structurally_valid)
        self.assertEqual(report.opaque_ratio, 0)
        self.assertEqual(report.warnings, ())

    def test_rejects_alpha_variation_that_is_still_effectively_invisible(self) -> None:
        source = image_bytes("RGB", (6, 4), (255, 255, 255))
        output = Image.new("RGBA", (6, 4), (255, 0, 0, 1))
        output.putpixel((0, 0), (255, 0, 0, 3))
        buffer = BytesIO()
        output.save(buffer, format="PNG")

        report = analyze_cutout(source, buffer.getvalue())

        self.assertFalse(report.structurally_valid)
        self.assertEqual(report.transparent_ratio, 1)
        self.assertIn("사실상 완전히 투명", report.warnings[0])

    def test_creates_four_panel_visual_qa_board(self) -> None:
        source = image_bytes("RGB", (10, 8), (240, 240, 240))
        output = image_bytes("RGBA", (10, 8), (255, 0, 0, 128))

        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "qa.png"
            saved = save_qa_preview(source, output, target)

            self.assertEqual(saved, target.resolve())
            with Image.open(target) as board:
                self.assertEqual(board.size, (1168, 1236))
                self.assertEqual(board.mode, "RGB")


if __name__ == "__main__":
    unittest.main()
