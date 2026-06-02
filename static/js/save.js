import { normalizeOutputFormat } from "./helpers.js";

export async function saveBlobWithPicker(blob, filename, types) {
  const saveTarget = await prepareSaveTarget(filename, types);
  if (saveTarget.cancelled) return false;
  return writeBlobToSaveTarget(blob, saveTarget, filename);
}

export async function prepareSaveTarget(filename, types) {
  if (!("showSaveFilePicker" in window)) {
    return { kind: "server-dialog" };
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types,
      excludeAcceptAllOption: false,
    });
    return { kind: "picker", handle };
  } catch (error) {
    if (error.name === "AbortError") return { kind: "cancelled", cancelled: true };
    console.warn("브라우저 저장 대화상자를 열 수 없어 로컬 저장 대화상자로 대체합니다.", error);
    return { kind: "server-dialog" };
  }
}

export async function writeBlobToSaveTarget(blob, saveTarget, filename) {
  if (saveTarget.kind === "server-dialog") {
    try {
      return await saveBlobWithServerDialog(blob, filename);
    } catch (error) {
      console.warn("로컬 저장 대화상자를 열 수 없어 브라우저 다운로드로 대체합니다.", error);
    }
  }

  if (saveTarget.kind !== "picker") {
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  const writable = await saveTarget.handle.createWritable();
  await writable.write(blob);
  await writable.close();
  return true;
}

export function getSaveFileTypes(format) {
  const normalizedFormat = normalizeOutputFormat(format);
  const profiles = {
    png: { description: "PNG 이미지", mime: "image/png", extensions: [".png"] },
    jpg: { description: "JPG 이미지", mime: "image/jpeg", extensions: [".jpg", ".jpeg"] },
    webp: { description: "WebP 이미지", mime: "image/webp", extensions: [".webp"] },
    bmp: { description: "BMP 이미지", mime: "image/bmp", extensions: [".bmp"] },
    tiff: { description: "TIFF 이미지", mime: "image/tiff", extensions: [".tif", ".tiff"] },
    ico: { description: "ICO 아이콘", mime: "image/x-icon", extensions: [".ico"] },
    zip: { description: "ZIP 압축 파일", mime: "application/zip", extensions: [".zip"] },
  };
  const profile = profiles[normalizedFormat] ?? profiles.png;
  return [
    {
      description: profile.description,
      accept: {
        [profile.mime]: profile.extensions,
      },
    },
  ];
}

async function saveBlobWithServerDialog(blob, filename) {
  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append("suggested_name", filename);
  formData.append("output_format", normalizeOutputFormat(filename.split(".").pop()));

  const response = await fetch("/api/save", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `HTTP ${response.status}`);
  }

  const payload = await response.json();
  return Boolean(payload.saved);
}

function triggerDownload(url, filename) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
