import { formatProfiles, modelHelps, modelProfiles, presetHelps, presets } from "./js/config.js";
import { el, getIcoSizeInputs, getSelectedIcoSizes } from "./js/elements.js";
import {
  buildBulkArchiveName,
  buildConvertedName,
  buildCutoutName,
  buildCutoutWebpName,
  buildWebpArchiveName,
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
  bulkFileInput,
  bulkDropzone,
  bulkFileMeta,
  bulkActionRow,
  bulkProcessButton,
  bulkSaveButton,
  bulkClearButton,
  bulkFloatingActions,
  floatingBulkProcessButton,
  floatingBulkSaveButton,
  bulkModelSelect,
  bulkModelProfile,
  bulkQualityMode,
  bulkModelHelp,
  bulkPresetHelp,
  bulkAlphaMatting,
  bulkPostProcess,
  bulkForegroundRefine,
  bulkEdgeFeather,
  bulkErodeSize,
  bulkForegroundThreshold,
  bulkBackgroundThreshold,
  bulkEdgeValue,
  bulkThresholdValue,
  bulkFeatherHelp,
  bulkErodeHelp,
  bulkForegroundHelp,
  bulkBackgroundHelp,
  bulkStageTitle,
  bulkStageMeta,
  bulkResultMeta,
  bulkQueueList,
  bulkDoneCount,
  bulkFailCount,
  bulkTotalCount,
  bulkArchiveSize,
  webpFileInput,
  webpDropzone,
  webpFileMeta,
  webpActionRow,
  webpOptimizeButton,
  webpSaveButton,
  webpClearButton,
  webpFloatingActions,
  floatingWebpOptimizeButton,
  floatingWebpSaveButton,
  webpLossless,
  webpModeValue,
  webpQuality,
  webpQualityRow,
  webpMaxSize,
  webpSizeValue,
  webpStageTitle,
  webpStageMeta,
  webpResultMeta,
  webpQueueList,
  webpDoneCount,
  webpFailCount,
  webpTotalCount,
  webpOutputSize,
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
  bulkSegments,
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
let bulkItems = [];
let bulkArchiveBlob = null;
let bulkArchiveName = buildBulkArchiveName();
let webpItems = [];
let webpOutputBlob = null;
let webpOutputName = buildWebpArchiveName();
let webpOutputFormat = "zip";
let pageDragDepth = 0;
let cutoutRequestId = 0;
let activeCutoutRequestId = 0;
let convertRequestId = 0;
let activeConvertRequestId = 0;
let bulkRequestId = 0;
let activeBulkRequestId = 0;
let webpRequestId = 0;
let activeWebpRequestId = 0;
let activeProgressToken = null;

init();

function init() {
  bindTabs();
  bindPageDrop();
  bindFloatingActions();
  bindCutoutEvents();
  bindBulkEvents();
  bindWebpEvents();
  bindConvertEvents();
  applyPreset("ultra");
  applyBulkPreset("ultra");
  updateWebpControls();
  updateConvertControls();
  checkApi();
  syncFloatingActions();
  window.addEventListener("beforeunload", revokeObjectUrls);
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

    const files = Array.from(event.dataTransfer.files);
    if (files.length) useDroppedFiles(files);
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
  floatingBulkProcessButton.addEventListener("click", () => bulkProcessButton.click());
  floatingBulkSaveButton.addEventListener("click", () => bulkSaveButton.click());
  floatingWebpOptimizeButton.addEventListener("click", () => webpOptimizeButton.click());
  floatingWebpSaveButton.addEventListener("click", () => webpSaveButton.click());
  floatingConvertButton.addEventListener("click", () => convertButton.click());
  floatingConvertDownloadButton.addEventListener("click", () => convertDownloadButton.click());

  const observer = new IntersectionObserver(() => syncFloatingActions(), {
    threshold: 0.01,
  });
  observer.observe(cutoutActionRow);
  observer.observe(bulkActionRow);
  observer.observe(webpActionRow);
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
  const bulkHasWork = bulkItems.length > 0 || Boolean(bulkArchiveBlob);
  const webpHasWork = webpItems.length > 0 || Boolean(webpOutputBlob);
  const convertHasWork = Boolean(convertFile || convertResultUrl);
  const cutoutShouldFloat = activeView === "cutout" && cutoutHasWork && !isActionRowVisible(cutoutActionRow);
  const bulkShouldFloat = activeView === "bulk" && bulkHasWork && !isActionRowVisible(bulkActionRow);
  const webpShouldFloat = activeView === "webp" && webpHasWork && !isActionRowVisible(webpActionRow);
  const convertShouldFloat = activeView === "convert" && convertHasWork && !isActionRowVisible(convertActionRow);

  cutoutFloatingActions.hidden = !cutoutShouldFloat;
  bulkFloatingActions.hidden = !bulkShouldFloat;
  webpFloatingActions.hidden = !webpShouldFloat;
  convertFloatingActions.hidden = !convertShouldFloat;
  document.body.classList.toggle(
    "has-floating-actions",
    cutoutShouldFloat || bulkShouldFloat || webpShouldFloat || convertShouldFloat,
  );

  floatingProcessButton.disabled = processButton.disabled;
  floatingDownloadButton.disabled = isDisabledDownload(downloadButton);
  floatingWebpButton.disabled = webpDownloadButton.disabled;
  floatingBulkProcessButton.disabled = bulkProcessButton.disabled;
  floatingBulkSaveButton.disabled = bulkSaveButton.disabled;
  floatingWebpOptimizeButton.disabled = webpOptimizeButton.disabled;
  floatingWebpSaveButton.disabled = webpSaveButton.disabled;
  floatingConvertButton.disabled = convertButton.disabled;
  floatingConvertDownloadButton.disabled = isDisabledDownload(convertDownloadButton);
  mirrorActionState(floatingProcessButton, processButton);
  mirrorActionState(floatingWebpButton, webpDownloadButton);
  mirrorActionState(floatingBulkProcessButton, bulkProcessButton);
  mirrorActionState(floatingBulkSaveButton, bulkSaveButton);
  mirrorActionState(floatingWebpOptimizeButton, webpOptimizeButton);
  mirrorActionState(floatingWebpSaveButton, webpSaveButton);
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

function bindBulkEvents() {
  bindBulkFilePicker();

  bulkSegments.forEach((button) => {
    button.addEventListener("click", () => applyBulkPreset(button.dataset.bulkPreset));
  });

  bulkModelSelect.addEventListener("change", updateBulkModelHelp);

  for (const input of [bulkEdgeFeather, bulkErodeSize, bulkForegroundThreshold, bulkBackgroundThreshold]) {
    input.addEventListener("input", refreshBulkLabels);
  }

  bulkProcessButton.addEventListener("click", processBulkImages);
  bulkSaveButton.addEventListener("click", saveBulkArchive);
  bulkClearButton.addEventListener("click", clearBulkFiles);
}

function bindWebpEvents() {
  bindWebpFilePicker();
  webpLossless.addEventListener("change", updateWebpControls);
  webpQuality.addEventListener("input", updateWebpControls);
  webpMaxSize.addEventListener("change", updateWebpControls);
  webpOptimizeButton.addEventListener("click", processWebpImages);
  webpSaveButton.addEventListener("click", saveWebpOutput);
  webpClearButton.addEventListener("click", clearWebpFiles);
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

function bindBulkFilePicker() {
  bulkFileInput.addEventListener("change", () => {
    const files = Array.from(bulkFileInput.files || []);
    if (files.length) setBulkFiles(files);
  });

  for (const eventName of ["dragenter", "dragover"]) {
    bulkDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      bulkDropzone.classList.add("dragging");
    });
  }

  for (const eventName of ["dragleave", "drop"]) {
    bulkDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      bulkDropzone.classList.remove("dragging");
    });
  }

  bulkDropzone.addEventListener("drop", (event) => {
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length) setBulkFiles(files);
  });
}

function bindWebpFilePicker() {
  webpFileInput.addEventListener("change", () => {
    const files = Array.from(webpFileInput.files || []);
    if (files.length) setWebpFiles(files);
  });

  for (const eventName of ["dragenter", "dragover"]) {
    webpDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      webpDropzone.classList.add("dragging");
    });
  }

  for (const eventName of ["dragleave", "drop"]) {
    webpDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      webpDropzone.classList.remove("dragging");
    });
  }

  webpDropzone.addEventListener("drop", (event) => {
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length) setWebpFiles(files);
  });
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

function useDroppedFiles(files) {
  const view = getActiveView();
  const supportedFiles = files.filter((file) => isSupportedForView(file, view));
  if (!supportedFiles.length) {
    const message =
      view === "convert"
        ? "변환 탭은 PNG, JPG, WebP, BMP, TIFF, ICO 파일을 지원합니다."
        : view === "bulk"
          ? "벌크누끼 탭은 PNG, JPG, WebP, BMP, TIFF 파일을 지원합니다."
          : view === "webp"
            ? "WebP 최적화 탭은 PNG, JPG, WebP, BMP, TIFF 파일을 지원합니다."
            : "누끼 탭은 PNG, JPG, WebP, BMP, TIFF 파일을 지원합니다.";
    if (view === "convert") {
      convertStageTitle.textContent = "파일 확인 필요";
      convertStageMeta.textContent = message;
    } else if (view === "bulk") {
      bulkStageTitle.textContent = "파일 확인 필요";
      bulkStageMeta.textContent = message;
    } else if (view === "webp") {
      webpStageTitle.textContent = "파일 확인 필요";
      webpStageMeta.textContent = message;
    } else {
      stageTitle.textContent = "파일 확인 필요";
      stageMeta.textContent = message;
    }
    return;
  }

  if (view === "convert") {
    setConvertFile(supportedFiles[0]);
  } else if (view === "bulk") {
    setBulkFiles(supportedFiles);
  } else if (view === "webp") {
    setWebpFiles(supportedFiles);
  } else {
    setFile(supportedFiles[0]);
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
  cutoutRequestId += 1;
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

  const file = selectedFile;
  const requestId = cutoutRequestId + 1;
  const progressToken = `cutout-${requestId}`;
  cutoutRequestId = requestId;
  activeCutoutRequestId = requestId;

  setButtonBusy(processButton, true, "처리 중");
  stageTitle.textContent = "처리 중";
  resultMeta.textContent = "모델 실행";
  showJobProgress(
    progressToken,
    "누끼 따는 중",
    modelSelect.value === "birefnet-hq"
      ? "고품질 모델로 가장자리를 계산하고 있습니다. 큰 이미지는 조금 걸릴 수 있어요."
      : "배경 마스크를 만들고 가장자리를 정리하고 있습니다.",
  );
  syncFloatingActions();

  const formData = new FormData();
  formData.append("file", file);
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

    if (!isCurrentCutoutRequest(requestId, file)) return;

    clearResult();
    resultBlob = blob;
    resultUrl = URL.createObjectURL(blob);
    loadPreview(resultPreview, resultUrl, resultSize, width, height);
    downloadButton.href = resultUrl;
    downloadButton.download = buildCutoutName(file.name);
    downloadButton.classList.remove("disabled");
    webpDownloadButton.disabled = false;
    webpDownloadButton.classList.remove("disabled");

    stageTitle.textContent = "완료";
    stageMeta.textContent = file.name;
    resultMeta.textContent = elapsed ? `${Number(elapsed).toLocaleString()} ms` : "완료";
  } catch (error) {
    if (!isCurrentCutoutRequest(requestId, file)) return;
    stageTitle.textContent = "처리 실패";
    resultMeta.textContent = "오류";
    stageMeta.textContent = error.message;
  } finally {
    hideJobProgress(progressToken);
    if (activeCutoutRequestId === requestId) {
      activeCutoutRequestId = 0;
      setButtonBusy(processButton, false, "누끼 따기");
    }
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

function setBulkFiles(files) {
  const supportedFiles = files.filter((file) => isSupportedForView(file, "bulk"));
  const rejectedCount = files.length - supportedFiles.length;
  bulkRequestId += 1;
  bulkArchiveBlob = null;
  bulkArchiveName = buildBulkArchiveName();
  bulkItems = supportedFiles.map((file) => ({
    file,
    status: "ready",
    statusLabel: "대기",
    detail: formatBytes(file.size),
    result: null,
  }));

  bulkProcessButton.disabled = bulkItems.length === 0;
  bulkSaveButton.disabled = true;
  bulkClearButton.disabled = bulkItems.length === 0;
  bulkStageTitle.textContent = bulkItems.length ? "파일 준비됨" : "파일 확인 필요";
  bulkStageMeta.textContent = rejectedCount
    ? `${bulkItems.length}개 선택됨 · 지원하지 않는 파일 ${rejectedCount}개 제외`
    : `${bulkItems.length}개 선택됨`;
  bulkResultMeta.textContent = "-";
  bulkArchiveSize.textContent = "-";
  renderBulkQueue();
  syncFloatingActions();
}

async function processBulkImages() {
  if (!bulkItems.length) return;

  const requestId = bulkRequestId + 1;
  const progressToken = `bulk-${requestId}`;
  const options = getBulkRemoveOptions();
  const results = [];
  bulkRequestId = requestId;
  activeBulkRequestId = requestId;
  bulkArchiveBlob = null;
  bulkArchiveName = buildBulkArchiveName();
  bulkSaveButton.disabled = true;
  bulkArchiveSize.textContent = "-";
  bulkItems = bulkItems.map((item) => ({
    ...item,
    status: "ready",
    statusLabel: "대기",
    detail: formatBytes(item.file.size),
    result: null,
  }));

  setButtonBusy(bulkProcessButton, true, "처리 중");
  bulkClearButton.disabled = true;
  bulkStageTitle.textContent = "벌크 처리 중";
  bulkResultMeta.textContent = `0 / ${bulkItems.length}`;
  renderBulkQueue();
  showJobProgress(progressToken, "벌크 누끼 처리 중", `1 / ${bulkItems.length} 이미지를 준비하고 있습니다.`);
  syncFloatingActions();

  try {
    for (const [index, item] of bulkItems.entries()) {
      if (!isCurrentBulkRequest(requestId)) return;

      item.status = "processing";
      item.statusLabel = "처리 중";
      item.detail = `${index + 1} / ${bulkItems.length} · 모델 실행`;
      bulkResultMeta.textContent = `${index} / ${bulkItems.length}`;
      showJobProgress(progressToken, "벌크 누끼 처리 중", `${index + 1} / ${bulkItems.length} · ${item.file.name}`);
      renderBulkQueue();

      try {
        const response = await removeFile(item.file, options);
        const blob = await response.blob();
        const width = response.headers.get("X-Image-Width");
        const height = response.headers.get("X-Image-Height");
        const elapsed = response.headers.get("X-Process-Time-Ms");
        const filename = buildCutoutName(item.file.name);

        item.status = "done";
        item.statusLabel = "완료";
        item.detail = [
          width && height ? `${width} x ${height}` : null,
          elapsed ? `${Number(elapsed).toLocaleString()} ms` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        item.result = { blob, filename };
        results.push(item.result);
      } catch (error) {
        item.status = "failed";
        item.statusLabel = "실패";
        item.detail = error.message;
      }

      bulkResultMeta.textContent = `${index + 1} / ${bulkItems.length}`;
      renderBulkQueue();
    }

    if (!isCurrentBulkRequest(requestId)) return;

    if (!results.length) {
      bulkStageTitle.textContent = "처리 실패";
      bulkStageMeta.textContent = "저장할 수 있는 결과가 없습니다.";
      bulkResultMeta.textContent = "0개 완료";
      return;
    }

    showJobProgress(progressToken, "ZIP 생성 중", `${results.length}개 결과를 ZIP으로 묶고 있습니다.`);
    bulkArchiveBlob = await createBulkArchive(results, bulkArchiveName);
    bulkArchiveSize.textContent = formatBytes(bulkArchiveBlob.size);
    bulkSaveButton.disabled = false;
    bulkStageTitle.textContent = "벌크 처리 완료";
    bulkStageMeta.textContent = `${results.length}개 결과를 ZIP으로 준비했습니다.`;
    bulkResultMeta.textContent = `${results.length}개 완료`;
  } catch (error) {
    if (!isCurrentBulkRequest(requestId)) return;
    bulkStageTitle.textContent = "벌크 처리 실패";
    bulkStageMeta.textContent = error.message;
    bulkResultMeta.textContent = "오류";
  } finally {
    hideJobProgress(progressToken);
    if (activeBulkRequestId === requestId) {
      activeBulkRequestId = 0;
      setButtonBusy(bulkProcessButton, false, "벌크 누끼");
      bulkClearButton.disabled = bulkItems.length === 0;
    }
    renderBulkQueue();
    syncFloatingActions();
  }
}

async function saveBulkArchive() {
  if (!bulkArchiveBlob) return;

  setButtonBusy(bulkSaveButton, true, "저장 중");
  try {
    const saved = await saveBlobWithPicker(bulkArchiveBlob, bulkArchiveName, getSaveFileTypes("zip"));
    bulkResultMeta.textContent = saved ? "ZIP 저장 완료" : "저장 취소";
  } catch (error) {
    bulkResultMeta.textContent = "ZIP 저장 오류";
    bulkStageMeta.textContent = error.message;
  } finally {
    setButtonBusy(bulkSaveButton, false, "ZIP 저장");
    syncFloatingActions();
  }
}

function clearBulkFiles() {
  bulkRequestId += 1;
  bulkItems = [];
  bulkArchiveBlob = null;
  bulkArchiveName = buildBulkArchiveName();
  bulkFileInput.value = "";
  bulkFileMeta.textContent = "PNG, JPG, WebP, BMP, TIFF";
  bulkProcessButton.disabled = true;
  bulkSaveButton.disabled = true;
  bulkClearButton.disabled = true;
  bulkStageTitle.textContent = "벌크 작업 대기";
  bulkStageMeta.textContent = "여러 이미지를 선택하면 파일별 처리 상태가 표시됩니다.";
  bulkResultMeta.textContent = "-";
  bulkArchiveSize.textContent = "-";
  renderBulkQueue();
  syncFloatingActions();
}

async function removeFile(file, options) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("model_name", options.modelName);
  formData.append("alpha_matting", String(options.alphaMatting));
  formData.append("post_process_mask", String(options.postProcess));
  formData.append("foreground_refine", String(options.foregroundRefine));
  formData.append("foreground_threshold", options.foregroundThreshold);
  formData.append("background_threshold", options.backgroundThreshold);
  formData.append("erode_size", options.erodeSize);
  formData.append("edge_feather", options.edgeFeather);
  formData.append("png_compression", "4");

  const response = await fetch("/api/remove", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `HTTP ${response.status}`);
  }
  return response;
}

async function createBulkArchive(results, archiveName) {
  const formData = new FormData();
  formData.append("archive_name", archiveName);
  results.forEach((result) => {
    formData.append("files", result.blob, result.filename);
  });

  const response = await fetch("/api/archive", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload.detail || `HTTP ${response.status}`;
    if (response.status === 404 || response.status === 405) {
      console.warn("서버 ZIP API를 찾을 수 없어 브라우저에서 ZIP을 생성합니다.", message);
      return createBrowserZip(results, archiveName);
    }
    throw new Error(message);
  }
  return response.blob();
}

async function createBrowserZip(results, archiveName) {
  const encoder = new TextEncoder();
  const now = new Date();
  const { dosDate, dosTime } = toZipDosDateTime(now);
  const chunks = [];
  const centralDirectory = [];
  const usedNames = new Set();
  let offset = 0;

  for (const [index, result] of results.entries()) {
    const filename = dedupeZipName(sanitizeZipName(result.filename, index), usedNames);
    const nameBytes = encoder.encode(filename);
    const data = new Uint8Array(await result.blob.arrayBuffer());
    const crc = crc32(data);
    ensureZipSize(data.length);
    ensureZipSize(offset);

    const localHeader = concatBytes(
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
    );

    chunks.push(localHeader, data);

    centralDirectory.push(
      concatBytes(
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(dosTime),
        u16(dosDate),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(nameBytes.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nameBytes,
      ),
    );

    offset += localHeader.length + data.length;
  }

  const centralOffset = offset;
  const centralBytes = concatBytes(...centralDirectory);
  const centralSize = centralBytes.length;
  ensureZipSize(centralOffset);
  ensureZipSize(centralSize);

  const endRecord = concatBytes(
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(results.length),
    u16(results.length),
    u32(centralSize),
    u32(centralOffset),
    u16(0),
  );

  return new Blob([...chunks, centralBytes, endRecord], {
    type: "application/zip",
  });
}

function toZipDosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    dosTime:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function sanitizeZipName(filename, index) {
  const fallback = `image-${index + 1}.webp`;
  const name = (filename || fallback).replace(/[\\/]/g, "-").trim();
  return name && name !== "." && name !== ".." ? name : fallback;
}

function dedupeZipName(filename, usedNames) {
  if (!usedNames.has(filename)) {
    usedNames.add(filename);
    return filename;
  }

  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : "";
  let index = 2;
  let next = `${stem}-${index}${ext}`;
  while (usedNames.has(next)) {
    index += 1;
    next = `${stem}-${index}${ext}`;
  }
  usedNames.add(next);
  return next;
}

function ensureZipSize(value) {
  if (value > 0xffffffff) {
    throw new Error("브라우저 ZIP 저장은 4GB 이하 결과만 지원합니다.");
  }
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value) {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

function concatBytes(...parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function renderBulkQueue() {
  updateBulkSummary();
  bulkQueueList.innerHTML = "";
  if (!bulkItems.length) {
    const empty = document.createElement("div");
    empty.className = "bulk-empty";
    empty.textContent = "처리할 이미지를 선택하세요.";
    bulkQueueList.append(empty);
    return;
  }

  bulkItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = `bulk-row ${item.status}`;

    const copy = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = item.file.name;
    const detail = document.createElement("small");
    detail.textContent = item.detail || formatBytes(item.file.size);
    copy.append(name, detail);

    const status = document.createElement("span");
    status.className = "bulk-status";
    status.textContent = item.statusLabel;

    row.append(copy, status);
    bulkQueueList.append(row);
  });
}

function updateBulkSummary() {
  const done = bulkItems.filter((item) => item.status === "done").length;
  const failed = bulkItems.filter((item) => item.status === "failed").length;
  bulkTotalCount.textContent = String(bulkItems.length);
  bulkDoneCount.textContent = String(done);
  bulkFailCount.textContent = String(failed);
  bulkFileMeta.textContent = bulkItems.length
    ? `${bulkItems.length}개 · ${formatBytes(bulkItems.reduce((sum, item) => sum + item.file.size, 0))}`
    : "PNG, JPG, WebP, BMP, TIFF";
}

function setWebpFiles(files) {
  const supportedFiles = files.filter((file) => isSupportedForView(file, "webp"));
  const rejectedCount = files.length - supportedFiles.length;
  webpRequestId += 1;
  webpOutputBlob = null;
  webpOutputName = buildWebpArchiveName();
  webpOutputFormat = "zip";
  webpItems = supportedFiles.map((file) => ({
    file,
    status: "ready",
    statusLabel: "대기",
    detail: formatBytes(file.size),
    result: null,
  }));

  webpOptimizeButton.disabled = webpItems.length === 0;
  webpSaveButton.disabled = true;
  webpClearButton.disabled = webpItems.length === 0;
  webpStageTitle.textContent = webpItems.length ? "파일 준비됨" : "파일 확인 필요";
  webpStageMeta.textContent = rejectedCount
    ? `${webpItems.length}개 선택됨 · 지원하지 않는 파일 ${rejectedCount}개 제외`
    : `${webpItems.length}개 선택됨 · 최적화 후 저장 버튼으로 내려받습니다.`;
  webpResultMeta.textContent = "-";
  webpOutputSize.textContent = "-";
  renderWebpQueue();
  syncFloatingActions();
}

async function processWebpImages() {
  if (!webpItems.length) return;

  const requestId = webpRequestId + 1;
  const progressToken = `webp-${requestId}`;
  const options = getWebpOptions();
  const results = [];
  webpRequestId = requestId;
  activeWebpRequestId = requestId;
  webpOutputBlob = null;
  webpOutputName = webpItems.length === 1 ? buildConvertedName(webpItems[0].file.name, "webp") : buildWebpArchiveName();
  webpOutputFormat = webpItems.length === 1 ? "webp" : "zip";
  webpSaveButton.disabled = true;
  webpOutputSize.textContent = "-";
  webpItems = webpItems.map((item) => ({
    ...item,
    status: "ready",
    statusLabel: "대기",
    detail: formatBytes(item.file.size),
    result: null,
  }));

  setButtonBusy(webpOptimizeButton, true, "처리 중");
  webpClearButton.disabled = true;
  webpStageTitle.textContent = "WebP 최적화 중";
  webpResultMeta.textContent = `0 / ${webpItems.length}`;
  renderWebpQueue();
  showJobProgress(progressToken, "WebP 최적화 중", `1 / ${webpItems.length} 이미지를 준비하고 있습니다.`);
  syncFloatingActions();

  try {
    for (const [index, item] of webpItems.entries()) {
      if (!isCurrentWebpRequest(requestId)) return;

      item.status = "processing";
      item.statusLabel = "처리 중";
      item.detail = `${index + 1} / ${webpItems.length} · WebP 생성`;
      webpResultMeta.textContent = `${index} / ${webpItems.length}`;
      showJobProgress(progressToken, "WebP 최적화 중", `${index + 1} / ${webpItems.length} · ${item.file.name}`);
      renderWebpQueue();

      try {
        const response = await convertFileToWebp(item.file, options);
        const blob = await response.blob();
        const width = response.headers.get("X-Image-Width");
        const height = response.headers.get("X-Image-Height");
        const elapsed = response.headers.get("X-Process-Time-Ms");
        const filename = buildConvertedName(item.file.name, "webp");

        item.status = "done";
        item.statusLabel = "완료";
        item.detail = [
          width && height ? `${width} x ${height}` : null,
          `${formatBytes(blob.size)}`,
          elapsed ? `${Number(elapsed).toLocaleString()} ms` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        item.result = { blob, filename };
        results.push(item.result);
      } catch (error) {
        item.status = "failed";
        item.statusLabel = "실패";
        item.detail = error.message;
      }

      webpResultMeta.textContent = `${index + 1} / ${webpItems.length}`;
      renderWebpQueue();
    }

    if (!isCurrentWebpRequest(requestId)) return;

    if (!results.length) {
      webpStageTitle.textContent = "최적화 실패";
      webpStageMeta.textContent = "저장할 수 있는 결과가 없습니다.";
      webpResultMeta.textContent = "0개 완료";
      return;
    }

    if (webpItems.length === 1 && results.length === 1) {
      webpOutputBlob = results[0].blob;
      webpOutputName = results[0].filename;
      webpOutputFormat = "webp";
      webpStageMeta.textContent = `${results[0].filename} 파일을 준비했습니다. WebP 저장을 눌러 저장 위치를 선택하세요.`;
    } else {
      showJobProgress(progressToken, "ZIP 생성 중", `${results.length}개 WebP 결과를 ZIP으로 묶고 있습니다.`);
      webpOutputName = buildWebpArchiveName();
      webpOutputBlob = await createBulkArchive(results, webpOutputName);
      webpOutputFormat = "zip";
      webpStageMeta.textContent = `${results.length}개 WebP 결과를 ZIP으로 준비했습니다. ZIP 저장을 눌러 저장 위치를 선택하세요.`;
    }

    webpOutputSize.textContent = formatBytes(webpOutputBlob.size);
    webpSaveButton.textContent = webpOutputFormat === "webp" ? "WebP 저장" : "ZIP 저장";
    webpSaveButton.disabled = false;
    webpStageTitle.textContent = "WebP 최적화 완료";
    webpResultMeta.textContent = `${results.length}개 완료`;
  } catch (error) {
    if (!isCurrentWebpRequest(requestId)) return;
    webpStageTitle.textContent = "WebP 최적화 실패";
    webpStageMeta.textContent = error.message;
    webpResultMeta.textContent = "오류";
  } finally {
    hideJobProgress(progressToken);
    if (activeWebpRequestId === requestId) {
      activeWebpRequestId = 0;
      setButtonBusy(webpOptimizeButton, false, "WebP 최적화");
      webpClearButton.disabled = webpItems.length === 0;
    }
    renderWebpQueue();
    syncFloatingActions();
  }
}

async function saveWebpOutput() {
  if (!webpOutputBlob) return;

  setButtonBusy(webpSaveButton, true, "저장 중");
  try {
    const saved = await saveBlobWithPicker(webpOutputBlob, webpOutputName, getSaveFileTypes(webpOutputFormat));
    webpResultMeta.textContent = saved ? "저장 완료" : "저장 취소";
  } catch (error) {
    webpResultMeta.textContent = "저장 오류";
    webpStageMeta.textContent = error.message;
  } finally {
    setButtonBusy(webpSaveButton, false, webpOutputFormat === "webp" ? "WebP 저장" : "ZIP 저장");
    syncFloatingActions();
  }
}

function clearWebpFiles() {
  webpRequestId += 1;
  webpItems = [];
  webpOutputBlob = null;
  webpOutputName = buildWebpArchiveName();
  webpOutputFormat = "zip";
  webpFileInput.value = "";
  webpFileMeta.textContent = "PNG, JPG, WebP, BMP, TIFF";
  webpOptimizeButton.disabled = true;
  webpSaveButton.disabled = true;
  webpSaveButton.textContent = "최적화 후 저장";
  webpClearButton.disabled = true;
  webpStageTitle.textContent = "WebP 최적화 대기";
  webpStageMeta.textContent = "한 장 또는 여러 이미지를 선택하면 WebP 결과가 준비됩니다.";
  webpResultMeta.textContent = "-";
  webpOutputSize.textContent = "-";
  renderWebpQueue();
  syncFloatingActions();
}

async function convertFileToWebp(file, options) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("output_format", "webp");
  formData.append("quality", options.quality);
  formData.append("webp_lossless", String(options.lossless));
  formData.append("output_size", options.outputSize);

  const response = await fetch("/api/convert", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `HTTP ${response.status}`);
  }
  return response;
}

function renderWebpQueue() {
  updateWebpSummary();
  webpQueueList.innerHTML = "";
  if (!webpItems.length) {
    const empty = document.createElement("div");
    empty.className = "bulk-empty";
    empty.textContent = "최적화할 이미지를 선택하세요.";
    webpQueueList.append(empty);
    return;
  }

  webpItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = `bulk-row ${item.status}`;

    const copy = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = item.file.name;
    const detail = document.createElement("small");
    detail.textContent = item.detail || formatBytes(item.file.size);
    copy.append(name, detail);

    const status = document.createElement("span");
    status.className = "bulk-status";
    status.textContent = item.statusLabel;

    row.append(copy, status);
    webpQueueList.append(row);
  });
}

function updateWebpSummary() {
  const done = webpItems.filter((item) => item.status === "done").length;
  const failed = webpItems.filter((item) => item.status === "failed").length;
  webpTotalCount.textContent = String(webpItems.length);
  webpDoneCount.textContent = String(done);
  webpFailCount.textContent = String(failed);
  webpFileMeta.textContent = webpItems.length
    ? `${webpItems.length}개 · ${formatBytes(webpItems.reduce((sum, item) => sum + item.file.size, 0))}`
    : "PNG, JPG, WebP, BMP, TIFF";
}

function setConvertFile(file) {
  convertRequestId += 1;
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

  const file = convertFile;
  const requestId = convertRequestId + 1;
  const progressToken = `convert-${requestId}`;
  convertRequestId = requestId;
  activeConvertRequestId = requestId;

  setButtonBusy(convertButton, true, "변환 중");
  convertStageTitle.textContent = "변환 중";
  convertResultMeta.textContent = convertFormat.value.toUpperCase();
  showJobProgress(progressToken, "파일 변환 중", `${convertFormat.value.toUpperCase()} 파일을 만들고 있습니다.`);
  syncFloatingActions();

  const formData = new FormData();
  formData.append("file", file);
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

    if (!isCurrentConvertRequest(requestId, file)) return;

    clearConvertResult();
    convertResultBlob = blob;
    convertResultFormat = outputFormat;
    convertResultUrl = URL.createObjectURL(blob);
    loadPreview(convertResultPreview, convertResultUrl, convertResultSize, width, height);
    convertDownloadButton.href = convertResultUrl;
    convertDownloadButton.download = buildConvertedName(file.name, outputFormat);
    convertDownloadButton.classList.remove("disabled");

    convertStageTitle.textContent = "변환 완료";
    convertStageMeta.textContent = `${file.name} → ${outputFormat.toUpperCase()}`;
    convertResultMeta.textContent = elapsed ? `${Number(elapsed).toLocaleString()} ms` : "완료";
  } catch (error) {
    if (!isCurrentConvertRequest(requestId, file)) return;
    convertStageTitle.textContent = "변환 실패";
    convertResultMeta.textContent = "오류";
    convertStageMeta.textContent = error.message;
  } finally {
    hideJobProgress(progressToken);
    if (activeConvertRequestId === requestId) {
      activeConvertRequestId = 0;
      setButtonBusy(convertButton, false, "변환하기");
    }
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

function applyBulkPreset(name) {
  const preset = presets[name];
  if (!preset) return;

  bulkAlphaMatting.checked = preset.alphaMatting;
  bulkPostProcess.checked = preset.postProcess;
  bulkForegroundRefine.checked = preset.foregroundRefine;
  bulkModelSelect.value = preset.modelName;
  updateBulkModelHelp();
  bulkEdgeFeather.value = preset.edgeFeather;
  bulkErodeSize.value = preset.erodeSize;
  bulkForegroundThreshold.value = preset.foregroundThreshold;
  bulkBackgroundThreshold.value = preset.backgroundThreshold;
  bulkQualityMode.textContent = capitalize(name);
  bulkPresetHelp.textContent = presetHelps[name] ?? "선택한 프리셋에 맞춰 모델과 보정 옵션을 조정합니다.";

  bulkSegments.forEach((button) => {
    button.classList.toggle("active", button.dataset.bulkPreset === name);
  });
  refreshBulkLabels();
}

function getBulkRemoveOptions() {
  return {
    modelName: bulkModelSelect.value,
    alphaMatting: bulkAlphaMatting.checked,
    postProcess: bulkPostProcess.checked,
    foregroundRefine: bulkForegroundRefine.checked,
    foregroundThreshold: bulkForegroundThreshold.value,
    backgroundThreshold: bulkBackgroundThreshold.value,
    erodeSize: bulkErodeSize.value,
    edgeFeather: bulkEdgeFeather.value,
  };
}

function getWebpOptions() {
  return {
    lossless: webpLossless.checked,
    quality: webpQuality.value,
    outputSize: webpMaxSize.value,
  };
}

function updateWebpControls() {
  const lossless = webpLossless.checked;
  webpModeValue.textContent = lossless ? "무손실" : `${webpQuality.value}`;
  webpQuality.disabled = lossless;
  webpQualityRow.classList.toggle("control-disabled", lossless);
  webpSizeValue.textContent = webpMaxSize.value === "0" ? "원본" : `${webpMaxSize.value}px`;
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

function refreshBulkLabels() {
  bulkEdgeValue.textContent = `${bulkEdgeFeather.value}px`;
  bulkThresholdValue.textContent = `${bulkForegroundThreshold.value} / ${bulkBackgroundThreshold.value}`;
  bulkFeatherHelp.textContent = describeFeather(Number(bulkEdgeFeather.value));
  bulkErodeHelp.textContent = describeErode(Number(bulkErodeSize.value));
  bulkForegroundHelp.textContent = describeForeground(Number(bulkForegroundThreshold.value));
  bulkBackgroundHelp.textContent = describeBackground(Number(bulkBackgroundThreshold.value));
}

function updateModelHelp() {
  const model = modelSelect.value;
  modelProfile.textContent = modelProfiles[model] ?? "사용자 선택";
  modelHelp.textContent = modelHelps[model] ?? "이미지 성격에 맞는 배경 제거 모델을 선택합니다.";
}

function updateBulkModelHelp() {
  const model = bulkModelSelect.value;
  bulkModelProfile.textContent = modelProfiles[model] ?? "사용자 선택";
  bulkModelHelp.textContent = modelHelps[model] ?? "이미지 성격에 맞는 배경 제거 모델을 선택합니다.";
}

function showJobProgress(token, title, detail) {
  activeProgressToken = token;
  showProgress(title, detail);
}

function hideJobProgress(token) {
  if (activeProgressToken !== token) return;
  activeProgressToken = null;
  hideProgress();
}

function isCurrentCutoutRequest(requestId, file) {
  return requestId === cutoutRequestId && selectedFile === file;
}

function isCurrentConvertRequest(requestId, file) {
  return requestId === convertRequestId && convertFile === file;
}

function isCurrentBulkRequest(requestId) {
  return requestId === bulkRequestId;
}

function isCurrentWebpRequest(requestId) {
  return requestId === webpRequestId;
}

function revokeObjectUrls() {
  for (const url of [originalUrl, resultUrl, convertOriginalUrl, convertResultUrl]) {
    if (url) URL.revokeObjectURL(url);
  }
}
