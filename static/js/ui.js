import { el } from "./elements.js";

export function showPageDropOverlay(view) {
  el.pageDropText.textContent = view === "convert" ? "변환 탭에 파일 놓기" : "누끼 탭에 이미지 놓기";
  el.pageDropOverlay.classList.add("visible");
}

export function hidePageDropOverlay() {
  el.pageDropOverlay.classList.remove("visible");
}

export function showProgress(title, detail) {
  el.progressTitle.textContent = title;
  el.progressDetail.textContent = detail;
  el.progressOverlay.hidden = false;
}

export function hideProgress() {
  el.progressOverlay.hidden = true;
}

export function setButtonBusy(button, busy, text) {
  button.disabled = busy;
  button.textContent = text;
  button.classList.toggle("is-busy", busy);
  button.setAttribute("aria-busy", busy ? "true" : "false");
}

export function mirrorActionState(target, source) {
  target.textContent = source.textContent;
  target.classList.toggle("is-busy", source.classList.contains("is-busy"));
  target.setAttribute("aria-busy", source.classList.contains("is-busy") ? "true" : "false");
}

export function isActionRowVisible(row) {
  if (!row || row.offsetParent === null) return false;
  const rect = row.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

export function isDisabledDownload(anchor) {
  return anchor.classList.contains("disabled") || !anchor.hasAttribute("href");
}

export function loadPreview(image, url, sizeLabel, width, height) {
  const frame = image.closest(".image-frame");
  image.onload = () => {
    frame.classList.add("has-image");
    sizeLabel.textContent = width && height ? `${width} x ${height}` : `${image.naturalWidth} x ${image.naturalHeight}`;
  };
  image.onerror = () => {
    frame.classList.remove("has-image");
    sizeLabel.textContent = width && height ? `${width} x ${height}` : "미리보기 제한";
  };
  image.src = url;
}
