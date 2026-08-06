export function hasDraggedFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
}

export function isSupportedForView(file, view) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const cutoutExtensions = ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"];
  const convertExtensions = [...cutoutExtensions, "ico"];
  const cutoutMimeTypes = ["image/png", "image/jpeg", "image/webp", "image/bmp", "image/tiff"];
  const convertMimeTypes = [...cutoutMimeTypes, "image/x-icon", "image/vnd.microsoft.icon"];
  const allowed = view === "convert" ? convertExtensions : cutoutExtensions;
  const allowedMimeTypes = view === "convert" ? convertMimeTypes : cutoutMimeTypes;
  return allowed.includes(extension) || allowedMimeTypes.includes(file.type);
}

export function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

export function buildCutoutName(name) {
  const stem = name.replace(/\.[^.]+$/, "") || "cutout";
  return `${stem}-cutout.png`;
}

export function buildCutoutWebpName(name) {
  const stem = name.replace(/\.[^.]+$/, "") || "cutout";
  return `${stem}-cutout.webp`;
}

export function buildBulkArchiveName() {
  const date = new Date().toISOString().slice(0, 10);
  return `toolbox-cutouts-${date}.zip`;
}

export function buildWebpArchiveName() {
  const date = new Date().toISOString().slice(0, 10);
  return `toolbox-webp-${date}.zip`;
}

export function buildConvertedName(name, format) {
  const stem = name.replace(/\.[^.]+$/, "") || "converted";
  const extension = format === "jpeg" ? "jpg" : format;
  return `${stem}.${extension}`;
}

export function normalizeOutputFormat(format) {
  const normalized = String(format || "png").toLowerCase();
  if (normalized === "jpeg") return "jpg";
  if (normalized === "tif") return "tiff";
  return normalized;
}
