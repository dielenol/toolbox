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

export function describeFeather(value) {
  if (value === 0) return "꺼짐: 경계를 가장 선명하게 둡니다. 거칠게 보이면 조금 올리세요.";
  if (value <= 0.4) return "낮음: 선명함을 유지하면서 미세한 계단 현상을 줄입니다.";
  if (value <= 1) return "중간: 테두리가 부드러워지지만 아주 얇은 디테일은 흐려질 수 있습니다.";
  return "높음: 많이 부드러워집니다. 머리카락이나 작은 글자는 뭉개질 수 있습니다.";
}

export function describeErode(value) {
  if (value === 0) return "꺼짐: 원래 마스크 크기를 그대로 둡니다.";
  if (value <= 4) return "약함: 바깥쪽에 남은 배경 테두리를 살짝 줄입니다.";
  if (value <= 10) return "중간: 배경 잔여물을 더 줄이지만 피사체 가장자리도 조금 깎일 수 있습니다.";
  return "강함: 테두리를 많이 깎습니다. 흰 선이 심할 때만 사용하세요.";
}

export function describeForeground(value) {
  if (value >= 235) return "높음: 확실한 피사체만 또렷하게 잡아 테두리 오염을 줄입니다.";
  if (value >= 180) return "중간: 더 많은 부분을 피사체로 인정합니다. 흐릿한 경계에 쓸 수 있습니다.";
  return "낮음: 애매한 영역까지 피사체로 잡습니다. 배경이 남을 수 있습니다.";
}

export function describeBackground(value) {
  if (value <= 20) return "낮음: 배경으로 확실한 부분만 제거해 피사체 손상을 줄입니다.";
  if (value <= 80) return "중간: 배경 제거가 더 적극적입니다. 복잡한 배경에 쓸 수 있습니다.";
  return "높음: 애매한 영역도 배경으로 봅니다. 피사체 가장자리가 사라질 수 있습니다.";
}

export function normalizeOutputFormat(format) {
  const normalized = String(format || "png").toLowerCase();
  if (normalized === "jpeg") return "jpg";
  if (normalized === "tif") return "tiff";
  return normalized;
}

export function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
