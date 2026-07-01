from __future__ import annotations

import unittest
from io import BytesIO

from PIL import Image

from app.converter import _load_image as load_converter_image
from app.image_orientation import EXIF_ORIENTATION_TAG, normalize_display_orientation
from app.remover import _load_image as load_remover_image


def make_marked_png(orientation: int) -> bytes:
    image = Image.new("RGB", (3, 2), "white")
    image.putpixel((0, 0), (255, 0, 0))
    image.putpixel((0, 1), (0, 0, 255))
    exif = image.getexif()
    exif[EXIF_ORIENTATION_TAG] = orientation

    buffer = BytesIO()
    image.save(buffer, format="PNG", exif=exif.tobytes())
    return buffer.getvalue()


class ImageOrientationTests(unittest.TestCase):
    def test_keeps_rotation_correction_for_common_camera_orientation(self) -> None:
        image = load_remover_image(make_marked_png(6))

        self.assertEqual(image.size, (2, 3))
        self.assertIsNone(image.getexif().get(EXIF_ORIENTATION_TAG))

    def test_does_not_apply_mirrored_vertical_exif_orientation(self) -> None:
        image = load_converter_image(make_marked_png(4))

        self.assertEqual(image.size, (3, 2))
        self.assertEqual(image.getpixel((0, 0)), (255, 0, 0))
        self.assertEqual(image.getpixel((0, 1)), (0, 0, 255))
        self.assertIsNone(image.getexif().get(EXIF_ORIENTATION_TAG))

    def test_normalize_display_orientation_strips_mirrored_tag(self) -> None:
        image = Image.open(BytesIO(make_marked_png(4)))
        image.load()

        normalized = normalize_display_orientation(image)

        self.assertEqual(normalized.getpixel((0, 0)), (255, 0, 0))
        self.assertIsNone(normalized.getexif().get(EXIF_ORIENTATION_TAG))


if __name__ == "__main__":
    unittest.main()
