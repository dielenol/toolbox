from __future__ import annotations

import sys
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from subprocess import PIPE, Popen
from unittest.mock import patch

from PIL import Image

from app.remover import (
    RemoveOptions,
    RemoveResult,
    _INFERENCE_PROCESS_LOCK,
    _refine_foreground,
    _remove_with_rembg,
    remove_background,
)


class RemoverRuntimeTests(unittest.TestCase):
    def test_serializes_memory_heavy_background_removal(self) -> None:
        start = threading.Barrier(3)
        state_lock = threading.Lock()
        active = 0
        peak = 0

        def fake_serialized(contents, model_spec, started):
            nonlocal active, peak
            with state_lock:
                active += 1
                peak = max(peak, active)
            time.sleep(0.05)
            with state_lock:
                active -= 1
            return RemoveResult(b"png", 1, 1, 1, model_spec.id)

        def invoke() -> RemoveResult:
            start.wait(timeout=1)
            return remove_background(b"input", RemoveOptions(model_name="lucida"))

        with patch(
            "app.remover._remove_background_serialized",
            side_effect=fake_serialized,
        ):
            with ThreadPoolExecutor(max_workers=2) as executor:
                futures = [executor.submit(invoke) for _ in range(2)]
                start.wait(timeout=1)
                results = [future.result(timeout=2) for future in futures]

        self.assertEqual(peak, 1)
        self.assertEqual([result.model_name for result in results], ["lucida", "lucida"])

    def test_serializes_background_removal_across_processes(self) -> None:
        project_root = Path(__file__).resolve().parents[1]
        child_script = """
import app.remover as remover

remover._remove_background_serialized = lambda contents, model_spec, started: remover.RemoveResult(
    b\"png\", 1, 1, 1, model_spec.id
)
print(\"ready\", flush=True)
print(remover.remove_background(b\"input\", remover.RemoveOptions(model_name=\"lucida\")).model_name)
"""

        with _INFERENCE_PROCESS_LOCK:
            child = Popen(
                [sys.executable, "-c", child_script],
                cwd=project_root,
                stdout=PIPE,
                stderr=PIPE,
                text=True,
            )
            self.assertIsNotNone(child.stdout)
            self.assertEqual(child.stdout.readline().strip(), "ready")
            time.sleep(0.1)
            self.assertIsNone(child.poll())

        stdout, stderr = child.communicate(timeout=3)
        self.assertEqual(child.returncode, 0, stderr)
        self.assertEqual(stdout.strip(), "lucida")

    def test_refines_soft_edges_in_bounded_overlapping_tiles(self) -> None:
        rgba = Image.new("RGBA", (40, 12), (120, 40, 20, 255))
        mask = Image.new("L", rgba.size, 128)
        calls: list[tuple[int, int, str, str]] = []

        def fake_estimate(image, alpha):
            calls.append((image.shape[1], image.shape[0], image.dtype.name, alpha.dtype.name))
            return image.copy()

        with (
            patch("app.remover.FOREGROUND_REFINE_TILE_SIZE", 16),
            patch("app.remover.FOREGROUND_REFINE_TILE_OVERLAP", 4),
            patch("pymatting.estimate_foreground_ml", side_effect=fake_estimate),
        ):
            output = _refine_foreground(rgba, mask)

        self.assertEqual(output.size, rgba.size)
        self.assertEqual(output.convert("RGB").tobytes(), rgba.convert("RGB").tobytes())
        self.assertEqual(len(calls), 3)
        self.assertTrue(all(width <= 24 and height <= 20 for width, height, _, _ in calls))
        self.assertTrue(all(rgb_dtype == "float32" for _, _, rgb_dtype, _ in calls))
        self.assertTrue(all(alpha_dtype == "float32" for _, _, _, alpha_dtype in calls))

    def test_rembg_preserves_the_specialist_soft_mask(self) -> None:
        model_input = Image.new("RGB", (8, 6), (255, 255, 255))
        soft_mask = Image.new("L", model_input.size, 128)

        with (
            patch("app.remover.get_session", return_value=object()),
            patch("app.remover.remove", return_value=soft_mask) as mocked_remove,
        ):
            result = _remove_with_rembg(model_input, "isnet-anime")

        self.assertIs(result, soft_mask)
        kwargs = mocked_remove.call_args.kwargs
        self.assertTrue(kwargs["only_mask"])
        self.assertNotIn("alpha_matting", kwargs)
        self.assertNotIn("post_process_mask", kwargs)


if __name__ == "__main__":
    unittest.main()
