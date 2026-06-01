import { formatProfiles, modelHelps, modelProfiles, presetHelps, presets } from "./js/config.js";
import { el, getIcoSizeInputs, getSelectedIcoSizes } from "./js/elements.js";
import {
  buildConvertedName,
  buildCutoutName,
  buildCutoutWebpName,
  capitalize,
  describeBackground,
  describeErode,
  describeFeather,
  describeForeground,
  formatBytes,
  hasDraggedFiles,
  isSupportedForView,
} from "./js/helpers.js";
import { getSaveFileTypes, prepareSaveTarget, saveBlobWithPicker, writeBlobToSaveTarget } from "./js/save.js";
import {
  hidePageDropOverlay,
  hideProgress,
  isActionRowVisible,
  isDisabledDownload,
  loadPreview,
  mirrorActionState,
  setButtonBusy,
  showPageDropOverlay,
  showProgress,
} from "./js/ui.js";

const {
  apiStatus,
  tabButtons,
  workspaces,
  fileInput,
  dropzone,
  fileMeta,
  cutoutActionRow,
  processButton,
  downloadButton,
  webpDownloadButton,
  cutoutFloatingActions,
  floatingProcessButton,
  floatingDownloadButton,
  floatingWebpButton,
  originalPreview,
  resultPreview,
  originalSize,
  resultSize,
  stageTitle,
  stageMeta,
  resultMeta,
  modelSelect,
  modelProfile,
  qualityMode,
  modelHelp,
  presetHelp,
  alphaMatting,
  postProcess,
  foregroundRefine,
  edgeFeather,
  erodeSize,
  foregroundThreshold,
  backgroundThreshold,
  edgeValue,
  thresholdValue,
  featherHelp,
  erodeHelp,
  foregroundHelp,
  backgroundHelp,
  convertFileInput,
  convertDropzone,
  convertFileMeta,
  convertFormat,
  formatProfile,
  convertQuality,
  convertQualityValue,
  convertQualityRow,
  convertMaxSize,
  convertSizeValue,
  backgroundColor,
  backgroundColorRow,
  icoSizeGroup,
  icoSizeValue,
  convertActionRow,
  convertButton,
  convertDownloadButton,
  convertFloatingActions,
  floatingConvertButton,
  floatingConvertDownloadButton,
  convertOriginalPreview,
  convertResultPreview,
  convertOriginalSize,
  convertResultSize,
  convertStageTitle,
  convertStageMeta,
  convertResultMeta,
  segments,
} = el;

let selectedFile = null;
let originalUrl = null;
let resultUrl = null;
let resultBlob = null;
let convertFile = null;
let convertOriginalUrl = null;
let convertResultUrl = null;
let convertResultBlob = null;
let convertResultFormat = null;
let pageDragDepth = 0;

init();

function init() {
  bindTabs();
  bindPageDrop();
  bindFloatingActions();
  bindCutoutEvents();
  bindConvertEvents();
  applyPreset("ultra");
  updateConvertControls();
  checkApi();
  syncFloatingActions();
}

function bindPageDrop() {
  window.addEventListener("dragenter", (event) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    pageDragDepth += 1;
    showPageDropOverlay(getActiveView());
  });

  window.addEventListener("dragover", (event) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    showPageDropOverlay(getActiveView());
  });

  window.addEventListener("dragleave", (event) => {
    if (!hasDraggedFiles(event)) return;
    pageDragDepth = Math.max(0, pageDragDepth - 1);
    if (pageDragDepth === 0) hidePageDropOverlay();
  });

  window.addEventListener("drop", (event) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    pageDragDepth = 0;
    hidePageDropOverlay();

    const file = Array.from(event.dataTransfer.files).find(Boolean);
    if (file) useDroppedFile(file);
  });
}

function bindTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.viewTarget));
  });
}

function bindFloatingActions() {
  floatingProcessButton.addEventListener("click", () => processButton.click());
  floatingDownloadButton.addEventListener("click", () => downloadButton.click());
  floatingWebpButton.addEventListener("click", () => webpDownloadButton.click());
  floatingConvertButton.addEventListener("click", () => convertButton.click());
  floatingConvertDownloadButton.addEventListener("click", () => convertDownloadButton.click());

  const observer = new IntersectionObserver(() => syncFloatingActions(), {
    threshold: 0.01,
  });
  observer.observe(cutoutActionRow);
  observer.observe(convertActionRow);

  window.addEventListener("scroll", () => requestAnimationFrame(syncFloatingActions), { passive: true });
  window.addEventListener("resize", () => requestAnimationFrame(syncFloatingActions));
}

function switchView(target) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.viewTarget === target);
  });
  workspaces.forEach((workspace) => {
    workspace.hidden = workspace.dataset.view !== target;
  });
  requestAnimationFrame(syncFloatingActions);
}

function getActiveView() {
  const activeButton = document.querySelector(".tab-button.active");
  return activeButton?.dataset.viewTarget || "cutout";
}

function syncFloatingActions() {
  const activeView = getActiveView();
  const cutoutHasWork = Boolean(selectedFile || resultBlob);
  const convertHasWork = Boolean(convertFile || convertResultUrl);
  const cutoutShouldFloat = activeView === "cutout" && cutoutHasWork && !isActionRowVisible(cutoutActionRow);
  const convertShouldFloat = activeView === "convert" && convertHasWork && !isActionRowVisible(convertActionRow);

  cutoutFloatingActions.hidden = !cutoutShouldFloat;
  convertFloatingActions.hidden = !convertShouldFloat;
  document.body.classList.toggle("has-floating-actions", cutoutShouldFloat || convertShouldFloat);

  floatingProcessButton.disabled = processButton.disabled;
  floatingDownloadButton.disabled = isDisabledDownload(downloadButton);
  floatingWebpButton.disabled = webpDownloadButton.disabled;
  floatingConvertButton.disabled = convertButton.disabled;
  floatingConvertDownloadButton.disabled = isDisabledDownload(convertDownloadButton);
  mirrorActionState(floatingProcessButton, processButton);
  mirrorActionState(floatingWebpButton, webpDownloadButton);
  mirrorActionState(floatingConvertButton, convertButton);
}

function bindCutoutEvents() {
  bindFilePicker(fileInput, dropzone, setFile);

  segments.forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  });

  modelSelect.addEventListener("change", () => {
    updateModelHelp();
  });

  for (const input of [edgeFeather, erodeSize, foregroundThreshold, backgroundThreshold]) {
    input.addEventListener("input", refreshLabels);
  }

  processButton.addEventListener("click", processImage);
  downloadButton.addEventListener("click", saveCutoutPng);
  webpDownloadButton.addEventListener("click", downloadCutoutWebp);
}

function bindConvertEvents() {
  bindFilePicker(convertFileInput, convertDropzone, setConvertFile);
  convertFormat.addEventListener("change", updateConvertControls);
  convertQuality.addEventListener("input", updateConvertControls);
  convertMaxSize.addEventListener("change", updateConvertControls);
  getIcoSizeInputs().forEach((input) => {
    input.addEventListener("change", updateConvertControls);
  });
  convertButton.addEventListener("click", convertImage);
  convertDownloadButton.addEventListener("click", saveConvertedFile);
}

function bindFilePicker(input, zone, onFile) {
  input.addEventListener("change", () => {
    const [file] = input.files;
    if (file) onFile(file);
  });

  for (const eventName of ["dragenter", "dragover"]) {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.add("dragging");
    });
  }

  for (const eventName of ["dragleave", "drop"]) {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.remove("dragging");
    });
  }

  zone.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer.files;
    if (file) onFile(file);
  });
}

function useDroppedFile(file) {
  const view = getActiveView();
  if (!isSupportedForView(file, view)) {
    const message =
      view === "convert"
        ? "변환 탭은 PNG, JPG, WebP, BMP, TIFF, ICO 파일을 지원합니다."
        : "누끼 탭은 PNG, JPG, WebP, BMP, TIFF 파일을 지원합니다.";
    if (view === "convert") {
      convertStageTitle.textContent = "파일 확인 필요";
      convertStageMeta.textContent = message;
    } else {
      stageTitle.textContent = "파일 확인 필요";
      stageMeta.textContent = message;
    }
    return;
  }

  if (view === "convert") {
    setConvertFile(file);
  } else {
    setFile(file);
  }
}

async function checkApi() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("API unavailable");
    apiStatus.textContent = "로컬 준비됨";
    apiStatus.className = "status-pill ready";
  } catch {
    apiStatus.textContent = "서버 확인 필요";
    apiStatus.className = "status-pill error";
  }
}

function setFile(file) {
  selectedFile = file;
  processButton.disabled = false;
  stageTitle.textContent = "이미지 준비됨";
  stageMeta.textContent = file.name;
  fileMeta.textContent = `${file.name} · ${formatBytes(file.size)}`;
  resultMeta.textContent = "-";
  resultSize.textContent = "-";
  clearResult();

  if (originalUrl) URL.revokeObjectURL(originalUrl);
  originalUrl = URL.createObjectURL(file);
  loadPreview(originalPreview, originalUrl, originalSize);
  syncFloatingActions();
}

async function processImage() {
  if (!selectedFile) return;

  setButtonBusy(processButton, true, "처리 중");
  stageTitle.textContent = "처리 중";
  resultMeta.textContent = "모델 실행";
  showProgress(
    "누끼 따는 중",
    modelSelect.value === "birefnet-hq"
      ? "고품질 모델로 가장자리를 계산하고 있습니다. 큰 이미지는 조금 걸릴 수 있어요."
      : "배경 마스크를 만들고 가장자리를 정리하고 있습니다.",
  );
  syncFloatingActions();

  const formData = new FormData();
  formData.append("file", selectedFile);
  formData.append("model_name", modelSelect.value);
  formData.append("alpha_matting", String(alphaMatting.checked));
  formData.append("post_process_mask", String(postProcess.checked));
  formData.append("foreground_refine", String(foregroundRefine.checked));
  formData.append("foreground_threshold", foregroundThreshold.value);
  formData.append("background_threshold", backgroundThreshold.value);
  formData.append("erode_size", erodeSize.value);
  formData.append("edge_feather", edgeFeather.value);
  formData.append("png_compression", "4");

  try {
    const response = await fetch("/api/remove", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || `HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const width = response.headers.get("X-Image-Width");
    const height = response.headers.get("X-Image-Height");
    const elapsed = response.headers.get("X-Process-Time-Ms");

    clearResult();
    resultBlob = blob;
    resultUrl = URL.createObjectURL(blob);
    loadPreview(resultPreview, resultUrl, resultSize, width, height);
    downloadButton.href = resultUrl;
    downloadButton.download = buildCutoutName(selectedFile.name);
    downloadButton.classList.remove("disabled");
    webpDownloadButton.disabled = false;
    webpDownloadButton.classList.remove("disabled");

    stageTitle.textContent = "완료";
    stageMeta.textContent = selectedFile.name;
    resultMeta.textContent = elapsed ? `${Number(elapsed).toLocaleString()} ms` : "완료";
  } catch (error) {
    stageTitle.textContent = "처리 실패";
    resultMeta.textContent = "오류";
    stageMeta.textContent = error.message;
  } finally {
    hideProgress();
    setButtonBusy(processButton, false, "누끼 따기");
    syncFloatingActions();
  }
}

async function downloadCutoutWebp() {
  if (!resultBlob || !selectedFile) return;

  const filename = buildCutoutWebpName(selectedFile.name);
  let saveTarget;
  try {
    saveTarget = await prepareSaveTarget(filename, getSaveFileTypes("webp"));
    if (saveTarget.cancelled) return;
  } catch (error) {
    resultMeta.textContent = "저장 오류";
    stageMeta.textContent = error.message;
    return;
  }

  setButtonBusy(webpDownloadButton, true, "최적화 중");
  resultMeta.textContent = "WebP 변환";
  showProgress("WebP 최적화 중", "누끼 결과를 화질 손실이 거의 없는 WebP로 준비하고 있습니다.");
  syncFloatingActions();

  const formData = new FormData();
  formData.append("file", resultBlob, buildCutoutName(selectedFile.name));
  formData.append("output_format", "webp");
  formData.append("quality", "100");
  formData.append("webp_lossless", "true");

  try {
    const response = await fetch("/api/convert", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || `HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const elapsed = response.headers.get("X-Process-Time-Ms");
    const saved = await writeBlobToSaveTarget(blob, saveTarget, filename);
    resultMeta.textContent = saved
      ? elapsed
        ? `WebP ${Number(elapsed).toLocaleString()} ms`
        : "WebP 완료"
      : "저장 취소";
  } catch (error) {
    resultMeta.textContent = "WebP 오류";
    stageMeta.textContent = error.message;
  } finally {
    hideProgress();
    setButtonBusy(webpDownloadButton, false, "WebP 저장");
    syncFloatingActions();
  }
}

async function saveCutoutPng(event) {
  event.preventDefault();
  if (!resultBlob || !selectedFile) return;

  const filename = buildCutoutName(selectedFile.name);
  try {
    const saved = await saveBlobWithPicker(resultBlob, filename, getSaveFileTypes("png"));
    resultMeta.textContent = saved ? "PNG 저장 완료" : "저장 취소";
  } catch (error) {
    resultMeta.textContent = "PNG 저장 오류";
    stageMeta.textContent = error.message;
  }
}

function setConvertFile(file) {
  convertFile = file;
  convertButton.disabled = false;
  convertStageTitle.textContent = "파일 준비됨";
  convertStageMeta.textContent = file.name;
  convertFileMeta.textContent = `${file.name} · ${formatBytes(file.size)}`;
  convertResultMeta.textContent = "-";
  convertResultSize.textContent = "-";
  clearConvertResult();

  if (convertOriginalUrl) URL.revokeObjectURL(convertOriginalUrl);
  convertOriginalUrl = URL.createObjectURL(file);
  loadPreview(convertOriginalPreview, convertOriginalUrl, convertOriginalSize);
  syncFloatingActions();
}

async function convertImage() {
  if (!convertFile) return;

  setButtonBusy(convertButton, true, "변환 중");
  convertStageTitle.textContent = "변환 중";
  convertResultMeta.textContent = convertFormat.value.toUpperCase();
  showProgress("파일 변환 중", `${convertFormat.value.toUpperCase()} 파일을 만들고 있습니다.`);
  syncFloatingActions();

  const formData = new FormData();
  formData.append("file", convertFile);
  formData.append("output_format", convertFormat.value);
  formData.append("background_color", backgroundColor.value);
  formData.append("quality", convertQuality.value);
  formData.append("ico_sizes", getSelectedIcoSizes().join(",") || "256");
  formData.append("output_size", convertMaxSize.value);

  try {
    const response = await fetch("/api/convert", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || `HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const width = response.headers.get("X-Image-Width");
    const height = response.headers.get("X-Image-Height");
    const elapsed = response.headers.get("X-Process-Time-Ms");
    const outputFormat = response.headers.get("X-Output-Format") || convertFormat.value;

    clearConvertResult();
    convertResultBlob = blob;
    convertResultFormat = outputFormat;
    convertResultUrl = URL.createObjectURL(blob);
    loadPreview(convertResultPreview, convertResultUrl, convertResultSize, width, height);
    convertDownloadButton.href = convertResultUrl;
    convertDownloadButton.download = buildConvertedName(convertFile.name, outputFormat);
    convertDownloadButton.classList.remove("disabled");

    convertStageTitle.textContent = "변환 완료";
    convertStageMeta.textContent = `${convertFile.name} → ${outputFormat.toUpperCase()}`;
    convertResultMeta.textContent = elapsed ? `${Number(elapsed).toLocaleString()} ms` : "완료";
  } catch (error) {
    convertStageTitle.textContent = "변환 실패";
    convertResultMeta.textContent = "오류";
    convertStageMeta.textContent = error.message;
  } finally {
    hideProgress();
    setButtonBusy(convertButton, false, "변환하기");
    syncFloatingActions();
  }
}

async function saveConvertedFile(event) {
  event.preventDefault();
  if (!convertResultBlob || !convertFile) return;

  const outputFormat = convertResultFormat || convertFormat.value;
  const filename = buildConvertedName(convertFile.name, outputFormat);
  try {
    const saved = await saveBlobWithPicker(convertResultBlob, filename, getSaveFileTypes(outputFormat));
    convertResultMeta.textContent = saved ? "저장 완료" : "저장 취소";
  } catch (error) {
    convertResultMeta.textContent = "저장 오류";
    convertStageMeta.textContent = error.message;
  }
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;

  alphaMatting.checked = preset.alphaMatting;
  postProcess.checked = preset.postProcess;
  foregroundRefine.checked = preset.foregroundRefine;
  modelSelect.value = preset.modelName;
  updateModelHelp();
  edgeFeather.value = preset.edgeFeather;
  erodeSize.value = preset.erodeSize;
  foregroundThreshold.value = preset.foregroundThreshold;
  backgroundThreshold.value = preset.backgroundThreshold;
  qualityMode.textContent = capitalize(name);
  presetHelp.textContent = presetHelps[name] ?? "선택한 프리셋에 맞춰 모델과 보정 옵션을 조정합니다.";

  segments.forEach((button) => {
    button.classList.toggle("active", button.dataset.preset === name);
  });
  refreshLabels();
}

function updateConvertControls() {
  const format = convertFormat.value;
  const qualityEnabled = ["jpg", "webp"].includes(format);
  const backgroundEnabled = ["jpg", "bmp"].includes(format);
  const icoEnabled = format === "ico";

  formatProfile.textContent = formatProfiles[format] ?? "사용자 선택";
  convertQuality.disabled = !qualityEnabled;
  convertQualityRow.classList.toggle("control-disabled", !qualityEnabled);
  backgroundColor.disabled = !backgroundEnabled;
  backgroundColorRow.classList.toggle("control-disabled", !backgroundEnabled);
  icoSizeGroup.hidden = !icoEnabled;
  convertQualityValue.textContent = qualityEnabled ? convertQuality.value : "무손실";
  convertSizeValue.textContent = convertMaxSize.value === "0" ? "원본" : `${convertMaxSize.value}px`;
  updateIcoSizeLabel();
}

function updateIcoSizeLabel() {
  const count = getSelectedIcoSizes().length;
  icoSizeValue.textContent = count ? `${count}개` : "기본";
}

function clearResult() {
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  resultUrl = null;
  resultBlob = null;
  resultPreview.removeAttribute("src");
  resultPreview.closest(".image-frame").classList.remove("has-image");
  downloadButton.removeAttribute("href");
  downloadButton.classList.add("disabled");
  webpDownloadButton.disabled = true;
  webpDownloadButton.classList.add("disabled");
  webpDownloadButton.textContent = "WebP 저장";
}

function clearConvertResult() {
  if (convertResultUrl) URL.revokeObjectURL(convertResultUrl);
  convertResultUrl = null;
  convertResultBlob = null;
  convertResultFormat = null;
  convertResultPreview.removeAttribute("src");
  convertResultPreview.closest(".image-frame").classList.remove("has-image");
  convertDownloadButton.removeAttribute("href");
  convertDownloadButton.classList.add("disabled");
}

function refreshLabels() {
  edgeValue.textContent = `${edgeFeather.value}px`;
  thresholdValue.textContent = `${foregroundThreshold.value} / ${backgroundThreshold.value}`;
  featherHelp.textContent = describeFeather(Number(edgeFeather.value));
  erodeHelp.textContent = describeErode(Number(erodeSize.value));
  foregroundHelp.textContent = describeForeground(Number(foregroundThreshold.value));
  backgroundHelp.textContent = describeBackground(Number(backgroundThreshold.value));
}

function updateModelHelp() {
  const model = modelSelect.value;
  modelProfile.textContent = modelProfiles[model] ?? "사용자 선택";
  modelHelp.textContent = modelHelps[model] ?? "이미지 성격에 맞는 배경 제거 모델을 선택합니다.";
}
