from __future__ import annotations

from pathlib import Path


SAVE_FILE_TYPES = {
    "png": ("PNG 이미지", ".png", "*.png"),
    "jpg": ("JPG 이미지", ".jpg", "*.jpg;*.jpeg"),
    "webp": ("WebP 이미지", ".webp", "*.webp"),
    "bmp": ("BMP 이미지", ".bmp", "*.bmp"),
    "tiff": ("TIFF 이미지", ".tiff", "*.tif;*.tiff"),
    "ico": ("ICO 아이콘", ".ico", "*.ico"),
    "zip": ("ZIP 압축 파일", ".zip", "*.zip"),
}


def save_file_with_dialog(
    contents: bytes,
    suggested_name: str,
    output_format: str,
) -> Path | None:
    try:
        import tkinter as tk
        from tkinter import filedialog
    except Exception as exc:  # pragma: no cover - depends on local Python build
        raise RuntimeError("로컬 저장 대화상자를 열 수 없습니다.") from exc

    normalized_format = _normalize_format(output_format, suggested_name)
    description, extension, pattern = SAVE_FILE_TYPES[normalized_format]
    initialfile = _safe_initial_file(suggested_name, extension)

    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    root.update()
    try:
        target = filedialog.asksaveasfilename(
            parent=root,
            title="저장 위치 선택",
            initialfile=initialfile,
            defaultextension=extension,
            filetypes=[(description, pattern), ("모든 파일", "*.*")],
        )
    finally:
        root.destroy()

    if not target:
        return None

    path = Path(target)
    path.write_bytes(contents)
    return path


def _normalize_format(output_format: str, filename: str) -> str:
    normalized = output_format.lower().strip().lstrip(".")
    if normalized == "jpeg":
        normalized = "jpg"
    if normalized == "tif":
        normalized = "tiff"
    if normalized in SAVE_FILE_TYPES:
        return normalized

    suffix = Path(filename).suffix.lower().lstrip(".")
    if suffix == "jpeg":
        suffix = "jpg"
    if suffix == "tif":
        suffix = "tiff"
    return suffix if suffix in SAVE_FILE_TYPES else "png"


def _safe_initial_file(filename: str, extension: str) -> str:
    name = Path(filename or f"download{extension}").name.replace("\x00", "")
    if not name:
        return f"download{extension}"
    if Path(name).suffix:
        return name
    return f"{name}{extension}"
