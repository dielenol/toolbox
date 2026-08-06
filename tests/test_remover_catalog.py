from __future__ import annotations

import inspect
import unittest
from dataclasses import fields
from importlib.metadata import version
from pathlib import Path

from app.main import remove_endpoint
from app.remover import (
    BIREFNET_HR_MATTING_MODEL,
    BIREFNET_HR_MODEL,
    ISNET_ANIME_MODEL,
    LUCIDA_MODEL,
    MODEL_CATALOG,
    SUPPORTED_MODELS,
    RemoveOptions,
    resolve_task_model,
)


class RemoverCatalogTests(unittest.TestCase):
    def test_installed_rembg_matches_repository_pin(self) -> None:
        requirements = Path(__file__).resolve().parents[1] / "requirements.txt"
        pin = next(
            line.split("==", 1)[1]
            for line in requirements.read_text().splitlines()
            if line.startswith("rembg==")
        )

        self.assertEqual(version("rembg"), pin)

    def test_exposes_only_highest_quality_specialists(self) -> None:
        self.assertEqual(
            set(SUPPORTED_MODELS),
            {
                LUCIDA_MODEL,
                BIREFNET_HR_MATTING_MODEL,
                BIREFNET_HR_MODEL,
                ISNET_ANIME_MODEL,
            },
        )
        self.assertTrue(
            all(model.license_id in {"MIT", "Apache-2.0"} for model in MODEL_CATALOG)
        )
        self.assertTrue(all(model.fallback_model in SUPPORTED_MODELS for model in MODEL_CATALOG))

    def test_routes_visual_tasks_to_domain_specialists(self) -> None:
        expected = {
            "general": LUCIDA_MODEL,
            "character": LUCIDA_MODEL,
            "transparent": LUCIDA_MODEL,
            "design": LUCIDA_MODEL,
            "portrait": BIREFNET_HR_MATTING_MODEL,
            "hair": BIREFNET_HR_MATTING_MODEL,
            "product": BIREFNET_HR_MODEL,
            "complex": BIREFNET_HR_MODEL,
            "anime": ISNET_ANIME_MODEL,
        }

        self.assertEqual(
            {task: resolve_task_model(task).id for task in expected},
            expected,
        )

    def test_api_and_options_offer_no_quality_downgrade_controls(self) -> None:
        self.assertEqual(
            [field.name for field in fields(RemoveOptions)],
            ["model_name"],
        )
        self.assertEqual(
            list(inspect.signature(remove_endpoint).parameters),
            ["file", "model_name"],
        )


if __name__ == "__main__":
    unittest.main()
