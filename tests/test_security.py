from __future__ import annotations

import unittest

from app.security import classify_api_origin, valid_pairing_token


class SecurityTests(unittest.TestCase):
    def test_standalone_origin_does_not_need_pairing(self) -> None:
        self.assertEqual(
            classify_api_origin(
                "http://127.0.0.1:8000",
                "http://127.0.0.1:8000",
                ("http://localhost:3000",),
            ),
            "local",
        )

    def test_exact_life_os_origin_is_recognized(self) -> None:
        self.assertEqual(
            classify_api_origin(
                "https://life.example.com",
                "http://127.0.0.1:8000",
                ("https://life.example.com",),
            ),
            "life-os",
        )

    def test_lookalike_origin_is_rejected(self) -> None:
        self.assertEqual(
            classify_api_origin(
                "https://life.example.com.attacker.test",
                "http://127.0.0.1:8000",
                ("https://life.example.com",),
            ),
            "rejected",
        )

    def test_pairing_token_requires_length_and_exact_match(self) -> None:
        expected = "a-secure-local-token"
        self.assertTrue(valid_pairing_token(expected, expected))
        self.assertFalse(valid_pairing_token("wrong", expected))
        self.assertFalse(valid_pairing_token("short", "short"))


if __name__ == "__main__":
    unittest.main()
