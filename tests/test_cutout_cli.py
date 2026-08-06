from __future__ import annotations

import contextlib
import io
import json
import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from app.cutout_cli import main
from app.remover import BIREFNET_HR_MATTING_MODEL, RemoveResult


def make_source() -> bytes:
    image = Image.new("RGB", (8, 6), (235, 235, 235))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def make_cutout() -> bytes:
    image = Image.new("RGBA", (8, 6), (30, 80, 180, 0))
    for x in range(2, 6):
        for y in range(1, 5):
            image.putpixel((x, y), (30, 80, 180, 255))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


class CutoutCliTests(unittest.TestCase):
    def test_routes_task_writes_atomically_and_emits_qa_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.png"
            output = root / "result.png"
            qa = root / "qa.png"
            source.write_bytes(make_source())
            fake_result = RemoveResult(
                png=make_cutout(),
                width=8,
                height=6,
                elapsed_ms=17,
                model_name=BIREFNET_HR_MATTING_MODEL,
            )
            stdout = io.StringIO()

            with patch("app.cutout_cli.remove_background", return_value=fake_result) as mocked:
                with contextlib.redirect_stdout(stdout):
                    exit_code = main(
                        [
                            "--input",
                            str(source),
                            "--output",
                            str(output),
                            "--task",
                            "hair",
                            "--qa-preview",
                            str(qa),
                        ]
                    )

            payload = json.loads(stdout.getvalue())
            self.assertEqual(exit_code, 0)
            self.assertEqual(output.read_bytes(), fake_result.png)
            self.assertTrue(qa.is_file())
            self.assertEqual(payload["model"], BIREFNET_HR_MATTING_MODEL)
            self.assertEqual(payload["quality_policy"], "maximum")
            self.assertTrue(payload["visual_review_required"])
            self.assertTrue(payload["quality"]["structurally_valid"])
            self.assertEqual(payload["selection_mode"], "task")
            self.assertEqual(payload["task"], "hair")
            self.assertIsNone(payload["requested_model"])
            self.assertEqual(mocked.call_args.args[1].model_name, BIREFNET_HR_MATTING_MODEL)

    def test_explicit_model_manifest_does_not_report_the_default_task(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.png"
            output = root / "result.png"
            source.write_bytes(make_source())
            fake_result = RemoveResult(
                png=make_cutout(),
                width=8,
                height=6,
                elapsed_ms=17,
                model_name=BIREFNET_HR_MATTING_MODEL,
            )
            stdout = io.StringIO()

            with patch("app.cutout_cli.remove_background", return_value=fake_result):
                with contextlib.redirect_stdout(stdout):
                    exit_code = main(
                        [
                            "--input",
                            str(source),
                            "--output",
                            str(output),
                            "--model",
                            BIREFNET_HR_MATTING_MODEL,
                        ]
                    )

            payload = json.loads(stdout.getvalue())
            self.assertEqual(exit_code, 0)
            self.assertEqual(payload["selection_mode"], "model")
            self.assertIsNone(payload["task"])
            self.assertEqual(payload["requested_model"], BIREFNET_HR_MATTING_MODEL)
            self.assertEqual(payload["model"], BIREFNET_HR_MATTING_MODEL)

    def test_refuses_to_overwrite_output_without_force(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.png"
            output = root / "result.png"
            source.write_bytes(make_source())
            output.write_bytes(b"existing")

            with self.assertRaisesRegex(SystemExit, "--force"):
                main(["--input", str(source), "--output", str(output)])

            self.assertEqual(output.read_bytes(), b"existing")

    def test_refuses_qa_path_that_could_replace_source_or_output(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.png"
            output = root / "result.png"
            source_contents = make_source()
            source.write_bytes(source_contents)

            with self.assertRaisesRegex(SystemExit, "QA 보드는"):
                main(
                    [
                        "--input",
                        str(source),
                        "--output",
                        str(output),
                        "--qa-preview",
                        str(source),
                    ]
                )

            self.assertEqual(source.read_bytes(), source_contents)

    def test_reviews_manual_cutout_without_running_a_model(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.png"
            cutout = root / "manual-cutout.png"
            qa = root / "manual-cutout-qa.png"
            source.write_bytes(make_source())
            cutout.write_bytes(make_cutout())
            stdout = io.StringIO()

            with patch("app.cutout_cli.remove_background") as mocked:
                with contextlib.redirect_stdout(stdout):
                    exit_code = main(
                        [
                            "--input",
                            str(source),
                            "--review-cutout",
                            str(cutout),
                            "--qa-preview",
                            str(qa),
                        ]
                    )

            payload = json.loads(stdout.getvalue())
            self.assertEqual(exit_code, 0)
            self.assertEqual(payload["mode"], "review-only")
            self.assertTrue(payload["quality"]["structurally_valid"])
            self.assertTrue(qa.is_file())
            mocked.assert_not_called()

    def test_publishes_selected_cutout_to_downloads_without_overwriting(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.png"
            cutout = root / "selected.png"
            downloads = root / "Downloads"
            source.write_bytes(make_source())
            cutout_contents = make_cutout()
            cutout.write_bytes(cutout_contents)

            with patch("app.cutout_cli._downloads_directory", return_value=downloads):
                first_stdout = io.StringIO()
                with contextlib.redirect_stdout(first_stdout):
                    first_exit_code = main(
                        ["--input", str(source), "--publish-cutout", str(cutout)]
                    )
                second_stdout = io.StringIO()
                with contextlib.redirect_stdout(second_stdout):
                    second_exit_code = main(
                        ["--input", str(source), "--publish-cutout", str(cutout)]
                    )

            first_payload = json.loads(first_stdout.getvalue())
            second_payload = json.loads(second_stdout.getvalue())
            first_output = (downloads / "source-cutout.png").resolve()
            second_output = (downloads / "source-cutout-2.png").resolve()
            self.assertEqual(first_exit_code, 0)
            self.assertEqual(second_exit_code, 0)
            self.assertEqual(first_output.read_bytes(), cutout_contents)
            self.assertEqual(second_output.read_bytes(), cutout_contents)
            self.assertEqual(first_payload["mode"], "publish")
            self.assertEqual(first_payload["output"], str(first_output))
            self.assertFalse(first_payload["collision_renamed"])
            self.assertEqual(second_payload["output"], str(second_output))
            self.assertTrue(second_payload["collision_renamed"])
            self.assertTrue(second_payload["quality"]["structurally_valid"])

    def test_refuses_to_publish_a_structurally_invalid_cutout(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.png"
            cutout = root / "invalid.png"
            downloads = root / "Downloads"
            source.write_bytes(make_source())
            invalid = Image.new("RGBA", (8, 6), (30, 80, 180, 128))
            buffer = BytesIO()
            invalid.save(buffer, format="PNG")
            cutout.write_bytes(buffer.getvalue())

            with patch("app.cutout_cli._downloads_directory", return_value=downloads):
                with self.assertRaisesRegex(SystemExit, "구조 QA"):
                    main(["--input", str(source), "--publish-cutout", str(cutout)])

            self.assertFalse(downloads.exists())

    def test_publish_collision_preserves_the_existing_file(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.png"
            cutout = root / "selected.png"
            downloads = root / "Downloads"
            existing = downloads / "source-cutout.png"
            source.write_bytes(make_source())
            cutout_contents = make_cutout()
            cutout.write_bytes(cutout_contents)
            downloads.mkdir()
            existing.write_bytes(b"user-owned-existing-file")
            stdout = io.StringIO()

            with patch("app.cutout_cli._downloads_directory", return_value=downloads):
                with contextlib.redirect_stdout(stdout):
                    exit_code = main(
                        ["--input", str(source), "--publish-cutout", str(cutout)]
                    )

            payload = json.loads(stdout.getvalue())
            numbered_output = (downloads / "source-cutout-2.png").resolve()
            self.assertEqual(exit_code, 0)
            self.assertEqual(existing.read_bytes(), b"user-owned-existing-file")
            self.assertEqual(numbered_output.read_bytes(), cutout_contents)
            self.assertEqual(payload["output"], str(numbered_output))
            self.assertTrue(payload["collision_renamed"])

    def test_publish_mode_never_accepts_force(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.png"
            cutout = root / "selected.png"
            source.write_bytes(make_source())
            cutout.write_bytes(make_cutout())

            with self.assertRaisesRegex(SystemExit, "새 번호"):
                main(
                    [
                        "--input",
                        str(source),
                        "--publish-cutout",
                        str(cutout),
                        "--force",
                    ]
                )


if __name__ == "__main__":
    unittest.main()
