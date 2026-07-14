from __future__ import annotations

import os
import warnings


DEFAULT_BIREFNET_REVISION = "e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4"


def get_env_str(name: str, default: str, *, legacy: tuple[str, ...] = ()) -> str:
    for key in (name, *legacy):
        value = os.getenv(key)
        if value:
            return value
    return default


def get_env_list(name: str, default: tuple[str, ...]) -> tuple[str, ...]:
    raw_value = os.getenv(name)
    if raw_value in (None, ""):
        return default
    return tuple(value.strip().rstrip("/") for value in raw_value.split(",") if value.strip())


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


DEFAULT_MODEL_NAME = get_env_str("TOOLBOX_MODEL", "birefnet-hq", legacy=("NUKKI_MODEL",))
BIREFNET_REPO = get_env_str(
    "TOOLBOX_BIREFNET_REPO",
    "ZhengPeng7/BiRefNet",
    legacy=("NUKKI_BIREFNET_REPO",),
)
BIREFNET_REVISION = get_env_str(
    "TOOLBOX_BIREFNET_REVISION",
    DEFAULT_BIREFNET_REVISION,
    legacy=("NUKKI_BIREFNET_REVISION",),
)
BIREFNET_INPUT_SIZE = get_env_int(
    "TOOLBOX_BIREFNET_SIZE",
    1024,
    legacy=("NUKKI_BIREFNET_SIZE",),
    minimum=256,
    maximum=2048,
)
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
LIFE_OS_ORIGINS = get_env_list(
    "TOOLBOX_LIFE_OS_ORIGINS",
    ("http://localhost:3000", "http://127.0.0.1:3000"),
)
PAIRING_TOKEN = os.getenv("TOOLBOX_PAIRING_TOKEN", "")
