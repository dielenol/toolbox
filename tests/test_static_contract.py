from __future__ import annotations

import re
import unittest
from pathlib import Path

from app.remover import SUPPORTED_MODELS


ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "static/index.html").read_text()
CONFIG = (ROOT / "static/js/config.js").read_text()
ELEMENTS = (ROOT / "static/js/elements.js").read_text()
APP = (ROOT / "static/app.js").read_text()


class StaticContractTests(unittest.TestCase):
    def test_every_element_lookup_exists_in_html(self) -> None:
        html_ids = set(re.findall(r'\bid="([^"]+)"', HTML))
        looked_up_ids = set(re.findall(r'qs\("#([^"]+)"\)', ELEMENTS))

        self.assertEqual(looked_up_ids - html_ids, set())

    def test_app_destructures_only_declared_elements(self) -> None:
        declared = set(re.findall(r"^  ([A-Za-z][A-Za-z0-9]*):", ELEMENTS, re.MULTILINE))
        match = re.search(r"const \{\n(?P<body>.*?)\n\} = el;", APP, re.DOTALL)
        self.assertIsNotNone(match)
        used = {
            name.strip()
            for name in match.group("body").split(",")
            if name.strip()
        }

        self.assertEqual(used - declared, set())

    def test_cutout_ui_contains_only_maximum_quality_models(self) -> None:
        expected = set(SUPPORTED_MODELS)
        select_bodies = re.findall(
            r'<select id="(?:modelSelect|bulkModelSelect)"[^>]*>(.*?)</select>',
            HTML,
            re.DOTALL,
        )
        self.assertEqual(len(select_bodies), 2)
        for body in select_bodies:
            model_values = re.findall(r'<option value="([^"]+)"', body)
            self.assertEqual(set(model_values), expected)
            self.assertEqual(len(model_values), len(expected))

        fallback_values = re.findall(r'^ {8}id: "([^"]+)",$', CONFIG, re.MULTILINE)
        self.assertEqual(set(fallback_values), expected)
        self.assertEqual(len(fallback_values), len(expected))

        for forbidden in (
            "data-preset",
            "alphaMatting",
            "foregroundThreshold",
            "backgroundThreshold",
            "edgeFeather",
        ):
            self.assertNotIn(forbidden, HTML)


if __name__ == "__main__":
    unittest.main()
