from __future__ import annotations

import base64
import json
import unittest
from io import BytesIO
from unittest.mock import patch

from fastapi import HTTPException, UploadFile

from app.cutout_quality import CutoutQualityReport
from app.main import (
    _is_allowed_browser_origin,
    _resolve_remove_selection,
    remove_endpoint,
)
from app.remover import BIREFNET_HR_MATTING_MODEL, RemoveResult


def decode_manifest(value: str) -> dict[str, object]:
    padding = "=" * (-len(value) % 4)
    return json.loads(base64.urlsafe_b64decode(value + padding))


class RemoveApiTests(unittest.IsolatedAsyncioTestCase):
    async def test_routes_a_task_and_returns_quality_manifest(self) -> None:
        upload = UploadFile(filename="portrait.jpg", file=BytesIO(b"source"))
        result = RemoveResult(
            png=b"cutout",
            width=1200,
            height=800,
            elapsed_ms=4321,
            model_name=BIREFNET_HR_MATTING_MODEL,
        )
        quality = CutoutQualityReport(
            width=1200,
            height=800,
            alpha_min=0,
            alpha_max=255,
            transparent_ratio=0.4,
            opaque_ratio=0.5,
            soft_edge_ratio=0.1,
            structurally_valid=True,
            warnings=(),
        )

        with (
            patch("app.main.remove_background", return_value=result) as remove,
            patch("app.main.analyze_cutout", return_value=quality) as analyze,
        ):
            response = await remove_endpoint(
                file=upload,
                model_name=None,
                task="portrait",
            )

        self.assertEqual(remove.call_args.args[1].model_name, BIREFNET_HR_MATTING_MODEL)
        analyze.assert_called_once_with(b"source", b"cutout")
        manifest = decode_manifest(response.headers["X-Cutout-Manifest"])
        self.assertEqual(manifest["selection_mode"], "task")
        self.assertEqual(manifest["requested_task"], "portrait")
        self.assertEqual(manifest["model_name"], BIREFNET_HR_MATTING_MODEL)
        self.assertEqual(manifest["fallback_model"], "lucida")
        self.assertEqual(manifest["quality_policy"], "maximum")
        self.assertEqual(
            manifest["quality"],
            {
                "width": 1200,
                "height": 800,
                "alpha_min": 0,
                "alpha_max": 255,
                "transparent_ratio": 0.4,
                "opaque_ratio": 0.5,
                "soft_edge_ratio": 0.1,
                "structurally_valid": True,
                "warnings": [],
            },
        )

    async def test_keeps_explicit_model_compatibility(self) -> None:
        upload = UploadFile(filename="character.png", file=BytesIO(b"source"))
        result = RemoveResult(
            png=b"cutout",
            width=10,
            height=10,
            elapsed_ms=50,
            model_name="lucida",
        )
        quality = CutoutQualityReport(
            width=10,
            height=10,
            alpha_min=0,
            alpha_max=255,
            transparent_ratio=0.5,
            opaque_ratio=0.5,
            soft_edge_ratio=0,
            structurally_valid=True,
            warnings=(),
        )

        with (
            patch("app.main.remove_background", return_value=result),
            patch("app.main.analyze_cutout", return_value=quality),
        ):
            response = await remove_endpoint(
                file=upload,
                model_name="lucida",
                task=None,
            )

        manifest = decode_manifest(response.headers["X-Cutout-Manifest"])
        self.assertEqual(manifest["selection_mode"], "model")
        self.assertEqual(manifest["requested_model"], "lucida")

    def test_rejects_ambiguous_or_unknown_selections(self) -> None:
        with self.assertRaises(HTTPException) as ambiguous:
            _resolve_remove_selection(task="portrait", model_name="lucida")
        self.assertEqual(ambiguous.exception.status_code, 400)

        with self.assertRaises(HTTPException) as unknown:
            _resolve_remove_selection(task="unknown", model_name=None)
        self.assertEqual(unknown.exception.status_code, 400)

    def test_allows_only_configured_web_origins_and_loopback(self) -> None:
        self.assertTrue(_is_allowed_browser_origin("https://lenol.me"))
        self.assertTrue(_is_allowed_browser_origin("http://127.0.0.1:43117"))
        self.assertTrue(_is_allowed_browser_origin("http://localhost:8000"))
        self.assertTrue(_is_allowed_browser_origin("http://[::1]:8000"))
        self.assertFalse(_is_allowed_browser_origin("https://evil.example"))
        self.assertFalse(_is_allowed_browser_origin("http://127.0.0.1.evil.example"))
        self.assertFalse(_is_allowed_browser_origin("http://user@127.0.0.1:8000"))


if __name__ == "__main__":
    unittest.main()
