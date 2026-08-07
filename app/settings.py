from __future__ import annotations

import os
import warnings


def get_env_str(name: str, default: str, *, legacy: tuple[str, ...] = ()) -> str:
    for key in (name, *legacy):
        value = os.getenv(key)
        if value:
            return value
    return default


def get_env_int(
    name: str,
    default: int,
    *,
    legacy: tuple[str, ...] = (),
    minimum: int | None = None,
    maximum: int | None = None,
) -> int:
    source_name = name
    raw_value = os.getenv(name)
    if raw_value in (None, ""):
        for legacy_name in legacy:
            raw_value = os.getenv(legacy_name)
            if raw_value not in (None, ""):
                source_name = legacy_name
                break

    if raw_value in (None, ""):
        return default

    try:
        value = int(raw_value)
    except ValueError:
        warnings.warn(
            f"{source_name} must be an integer. Falling back to {default}.",
            RuntimeWarning,
            stacklevel=2,
        )
        return default

    if minimum is not None and value < minimum:
        warnings.warn(
            f"{source_name} must be at least {minimum}. Falling back to {default}.",
            RuntimeWarning,
            stacklevel=2,
        )
        return default
    if maximum is not None and value > maximum:
        warnings.warn(
            f"{source_name} must be at most {maximum}. Falling back to {default}.",
            RuntimeWarning,
            stacklevel=2,
        )
        return default
    return value


def get_env_list(name: str, default: tuple[str, ...]) -> tuple[str, ...]:
    raw_value = os.getenv(name)
    if raw_value in (None, ""):
        return default

    values = tuple(value.strip() for value in raw_value.split(",") if value.strip())
    return values or default


DEFAULT_MODEL_NAME = get_env_str("TOOLBOX_MODEL", "lucida", legacy=("NUKKI_MODEL",))
TORCH_THREADS = get_env_int(
    "TOOLBOX_TORCH_THREADS",
    0,
    legacy=("NUKKI_TORCH_THREADS",),
    minimum=0,
    maximum=256,
)
MAX_PIXELS = get_env_int(
    "TOOLBOX_MAX_PIXELS",
    80_000_000,
    legacy=("NUKKI_MAX_PIXELS",),
    minimum=1,
)
MAX_UPLOAD_BYTES = get_env_int(
    "TOOLBOX_MAX_UPLOAD_BYTES",
    100 * 1024 * 1024,
    legacy=("NUKKI_MAX_UPLOAD_BYTES",),
    minimum=1,
)
ALLOWED_BROWSER_ORIGINS = get_env_list(
    "TOOLBOX_ALLOWED_ORIGINS",
    ("https://lenol.me", "https://www.lenol.me"),
)
