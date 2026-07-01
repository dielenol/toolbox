from __future__ import annotations

from PIL import Image


EXIF_ORIENTATION_TAG = 274
ROTATION_TRANSPOSES = {
    3: Image.Transpose.ROTATE_180,
    6: Image.Transpose.ROTATE_270,
    8: Image.Transpose.ROTATE_90,
}
MIRRORED_ORIENTATIONS = {2, 4, 5, 7}


def normalize_display_orientation(image: Image.Image) -> Image.Image:
    orientation = image.getexif().get(EXIF_ORIENTATION_TAG)
    method = ROTATION_TRANSPOSES.get(orientation)
    if method is not None:
        return _without_orientation(image.transpose(method))
    # Mirrored EXIF orientations are inconsistently honored by browsers and editors.
    if orientation in MIRRORED_ORIENTATIONS:
        return _without_orientation(image)
    return image


def _without_orientation(image: Image.Image) -> Image.Image:
    exif = image.getexif()
    if EXIF_ORIENTATION_TAG not in exif:
        return image

    copied = image.copy()
    copied_exif = copied.getexif()
    if EXIF_ORIENTATION_TAG in copied_exif:
        del copied_exif[EXIF_ORIENTATION_TAG]
    copied.info["exif"] = copied_exif.tobytes()
    return copied
