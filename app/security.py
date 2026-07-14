from __future__ import annotations

from hmac import compare_digest


def classify_api_origin(origin: str | None, own_origin: str, allowed_origins: tuple[str, ...]) -> str:
    """Return local, life-os, cli, or rejected without inspecting request content."""
    if origin is None:
        return "cli"
    normalized = origin.rstrip("/")
    if normalized == own_origin.rstrip("/"):
        return "local"
    if normalized in allowed_origins:
        return "life-os"
    return "rejected"


def valid_pairing_token(received: str | None, expected: str) -> bool:
    if len(expected) < 16 or received is None:
        return False
    return compare_digest(received, expected)
