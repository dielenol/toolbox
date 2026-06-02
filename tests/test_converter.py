from __future__ import annotations

import unittest
from io import BytesIO
from zipfile import ZipFile

from PIL import Image

from app.converter import ConvertOptions, convert_image, parse_ico_sizes
from app.main import _build_zip_archive


def make_png(width: int = 32, height: int = 24) -> bytes:
    image = Image.new("RGBA", (width, height), (255, 0, 0, 128))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


class ConverterTests(unittest.TestCase):
    def test_converts_common_formats_with_resize(self) -> None:
        source = make_png()

        for output_format in ("png", "jpg", "webp", "ico"):
            with self.subTest(output_format=output_format):
                result = convert_image(
                    source,
                    ConvertOptions(
                        output_format=output_format,
                        output_size=16,
                        ico_sizes=parse_ico_sizes("16,32"),
                    ),
                )

                self.assertEqual(result.output_format, output_format)
                self.assertGreater(len(result.data), 0)
                self.assertLessEqual(max(result.width, result.height), 16)

    def test_rejects_invalid_output_size(self) -> None:
        with self.assertRaisesRegex(ValueError, "출력 크기"):
            convert_image(make_png(), ConvertOptions(output_format="png", output_size=5120))

    def test_rejects_unsupported_ico_size(self) -> None:
        with self.assertRaisesRegex(ValueError, "ICO 크기"):
            parse_ico_sizes("16,512")

    def test_builds_archive_with_duplicate_names(self) -> None:
        archive = _build_zip_archive(
            [
                ("sample-cutout.png", b"first"),
                ("sample-cutout.png", b"second"),
            ]
        )

        with ZipFile(BytesIO(archive)) as zip_file:
            self.assertEqual(zip_file.namelist(), ["sample-cutout.png", "sample-cutout-2.png"])


if __name__ == "__main__":
    unittest.main()
