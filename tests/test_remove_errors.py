from __future__ import annotations

import unittest

from app.main import _model_runtime_error


class RemoveErrorTests(unittest.TestCase):
    def test_model_runtime_error_mentions_model_and_retry_context(self) -> None:
        message = _model_runtime_error("birefnet-hq")

        self.assertIn("BiRefNet HQ", message)
        self.assertIn("모델 파일 다운로드", message)
        self.assertIn("다시 시도", message)


if __name__ == "__main__":
    unittest.main()
