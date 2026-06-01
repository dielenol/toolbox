const apiStatus = document.querySelector("#apiStatus");

const tabButtons = document.querySelectorAll("[data-view-target]");
const workspaces = document.querySelectorAll(".workspace-view");
const pageDropOverlay = document.querySelector("#pageDropOverlay");
const pageDropText = document.querySelector("#pageDropText");
const progressOverlay = document.querySelector("#progressOverlay");
const progressTitle = document.querySelector("#progressTitle");
const progressDetail = document.querySelector("#progressDetail");

const fileInput = document.querySelector("#fileInput");
const dropzone = document.querySelector("#dropzone");
const fileMeta = document.querySelector("#fileMeta");
const cutoutActionRow = document.querySelector("#cutoutActionRow");
const processButton = document.querySelector("#processButton");
const downloadButton = document.querySelector("#downloadButton");
const webpDownloadButton = document.querySelector("#webpDownloadButton");
const cutoutFloatingActions = document.querySelector("#cutoutFloatingActions");
const floatingProcessButton = document.querySelector("#floatingProcessButton");
const floatingDownloadButton = document.querySelector("#floatingDownloadButton");
const floatingWebpButton = document.querySelector("#floatingWebpButton");
const originalPreview = document.querySelector("#originalPreview");
const resultPreview = document.querySelector("#resultPreview");
const originalSize = document.querySelector("#originalSize");
const resultSize = document.querySelector("#resultSize");
const stageTitle = document.querySelector("#stageTitle");
const stageMeta = document.querySelector("#stageMeta");
const resultMeta = document.querySelector("#resultMeta");
const modelSelect = document.querySelector("#modelSelect");
const modelProfile = document.querySelector("#modelProfile");
const qualityMode = document.querySelector("#qualityMode");
const modelHelp = document.querySelector("#modelHelp");
const presetHelp = document.querySelector("#presetHelp");
const alphaMatting = document.querySelector("#alphaMatting");
const postProcess = document.querySelector("#postProcess");
const foregroundRefine = document.querySelector("#foregroundRefine");
const edgeFeather = document.querySelector("#edgeFeather");
const erodeSize = document.querySelector("#erodeSize");
const foregroundThreshold = document.querySelector("#foregroundThreshold");
const backgroundThreshold = document.querySelector("#backgroundThreshold");
const edgeValue = document.querySelector("#edgeValue");
const thresholdValue = document.querySelector("#thresholdValue");
const featherHelp = document.querySelector("#featherHelp");
const erodeHelp = document.querySelector("#erodeHelp");
const foregroundHelp = document.querySelector("#foregroundHelp");
const backgroundHelp = document.querySelector("#backgroundHelp");

const convertFileInput = document.querySelector("#convertFileInput");
const convertDropzone = document.querySelector("#convertDropzone");
const convertFileMeta = document.querySelector("#convertFileMeta");
const convertFormat = document.querySelector("#convertFormat");
const formatProfile = document.querySelector("#formatProfile");
const convertQuality = document.querySelector("#convertQuality");
const convertQualityValue = document.querySelector("#convertQualityValue");
const convertQualityRow = document.querySelector("#convertQualityRow");
const convertMaxSize = document.querySelector("#convertMaxSize");
const convertSizeValue = document.querySelector("#convertSizeValue");
const backgroundColor = document.querySelector("#backgroundColor");
const backgroundColorRow = document.querySelector("#backgroundColorRow");
const icoSizeGroup = document.querySelector("#icoSizeGroup");
const icoSizeValue = document.querySelector("#icoSizeValue");
const convertActionRow = document.querySelector("#convertActionRow");
const convertButton = document.querySelector("#convertButton");
const convertDownloadButton = document.querySelector("#convertDownloadButton");
const convertFloatingActions = document.querySelector("#convertFloatingActions");
const floatingConvertButton = document.querySelector("#floatingConvertButton");
const floatingConvertDownloadButton = document.querySelector("#floatingConvertDownloadButton");
const convertOriginalPreview = document.querySelector("#convertOriginalPreview");
const convertResultPreview = document.querySelector("#convertResultPreview");
const convertOriginalSize = document.querySelector("#convertOriginalSize");
const convertResultSize = document.querySelector("#convertResultSize");
const convertStageTitle = document.querySelector("#convertStageTitle");
const convertStageMeta = document.querySelector("#convertStageMeta");
const convertResultMeta = document.querySelector("#convertResultMeta");

const presets = {
  ultra: {
    modelName: "birefnet-hq",
    alphaMatting: true,
    postProcess: true,
    foregroundRefine: true,
    edgeFeather: "0.1",
    erodeSize: "4",
    foregroundThreshold: "240",
    backgroundThreshold: "10",
  },
  studio: {
    modelName: "isnet-general-use",
    alphaMatting: true,
    postProcess: true,
    foregroundRefine: true,
    edgeFeather: "0.4",
    erodeSize: "10",
    foregroundThreshold: "240",
    backgroundThreshold: "10",
  },
  balanced: {
    modelName: "u2net",
    alphaMatting: true,
    postProcess: true,
    foregroundRefine: false,
    edgeFeather: "0.2",
    erodeSize: "6",
    foregroundThreshold: "235",
    backgroundThreshold: "15",
  },
  fast: {
    modelName: "u2netp",
    alphaMatting: false,
    postProcess: true,
    foregroundRefine: false,
    edgeFeather: "0",
    erodeSize: "3",
    foregroundThreshold: "240",
    backgroundThreshold: "10",
  },
};

const modelProfiles = {
  "birefnet-hq": "최고 품질",
  "isnet-general-use": "품질 우선",
  u2net: "균형",
  u2netp: "속도 우선",
  u2net_human_seg: "인물",
  "isnet-anime": "애니/일러스트",
};

const modelHelps = {
  "birefnet-hq": "가장 정밀한 모델입니다. 머리카락, 제품 윤곽, 복잡한 배경에 강하지만 처리 시간이 더 깁니다.",
  "isnet-general-use": "품질과 속도의 균형이 좋은 기본 모델입니다. 대부분의 일반 사진에 잘 맞습니다.",
  u2net: "빠르고 안정적인 균형형 모델입니다. 대량 작업이나 간단한 배경에 좋습니다.",
  u2netp: "가장 빠른 모델입니다. 미리보기용으로 좋지만 복잡한 가장자리는 덜 정밀할 수 있습니다.",
  u2net_human_seg: "인물 사진 중심 모델입니다. 사람만 따고 싶을 때 선택하세요.",
  "isnet-anime": "애니메이션, 일러스트, 캐릭터 이미지에 맞춘 모델입니다.",
};

const presetHelps = {
  ultra: "가장 정밀하게 따는 설정입니다. 느리지만 복잡한 경계에 유리합니다.",
  studio: "품질을 우선하지만 Ultra보다 가볍습니다. 일반 제품 사진이나 인물에 무난합니다.",
  balanced: "속도와 품질의 중간값입니다. 여러 장을 처리할 때 시작점으로 좋습니다.",
  fast: "가장 빠른 설정입니다. 대략적인 확인이나 단순한 이미지에 적합합니다.",
};

const formatProfiles = {
  png: "투명 배경 보존",
  jpg: "일반 사진",
  webp: "웹 최적화",
  bmp: "호환성",
  tiff: "보관용",
  ico: "Windows 아이콘",
};

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
    showPageDropOverlay();
  });

  window.addEventListener("dragover", (event) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    showPageDropOverlay();
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

function isActionRowVisible(row) {
  if (!row || row.offsetParent === null) return false;
  const rect = row.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

function isDisabledDownload(anchor) {
  return anchor.classList.contains("disabled") || !anchor.hasAttribute("href");
}

function mirrorActionState(target, source) {
  target.textContent = source.textContent;
  target.classList.toggle("is-busy", source.classList.contains("is-busy"));
  target.setAttribute("aria-busy", source.classList.contains("is-busy") ? "true" : "false");
}

function bindCutoutEvents() {
  bindFilePicker(fileInput, dropzone, setFile);

  document.querySelectorAll(".segment").forEach((button) => {
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
  document.querySelectorAll("input[name='icoSize']").forEach((input) => {
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

function showPageDropOverlay() {
  pageDropText.textContent = getActiveView() === "convert" ? "변환 탭에 파일 놓기" : "누끼 탭에 이미지 놓기";
  pageDropOverlay.classList.add("visible");
}

function hidePageDropOverlay() {
  pageDropOverlay.classList.remove("visible");
}

function showProgress(title, detail) {
  progressTitle.textContent = title;
  progressDetail.textContent = detail;
  progressOverlay.hidden = false;
}

function hideProgress() {
  progressOverlay.hidden = true;
}

function hasDraggedFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
}

function isSupportedForView(file, view) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const cutoutExtensions = ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"];
  const convertExtensions = [...cutoutExtensions, "ico"];
  const cutoutMimeTypes = ["image/png", "image/jpeg", "image/webp", "image/bmp", "image/tiff"];
  const convertMimeTypes = [...cutoutMimeTypes, "image/x-icon", "image/vnd.microsoft.icon"];
  const allowed = view === "convert" ? convertExtensions : cutoutExtensions;
  const allowedMimeTypes = view === "convert" ? convertMimeTypes : cutoutMimeTypes;
  return allowed.includes(extension) || allowedMimeTypes.includes(file.type);
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

  processButton.disabled = true;
  processButton.textContent = "처리 중";
  processButton.classList.add("is-busy");
  processButton.setAttribute("aria-busy", "true");
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
    processButton.disabled = false;
    processButton.textContent = "누끼 따기";
    processButton.classList.remove("is-busy");
    processButton.setAttribute("aria-busy", "false");
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

  webpDownloadButton.disabled = true;
  webpDownloadButton.textContent = "최적화 중";
  webpDownloadButton.classList.add("is-busy");
  webpDownloadButton.setAttribute("aria-busy", "true");
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
    webpDownloadButton.disabled = false;
    webpDownloadButton.textContent = "WebP 저장";
    webpDownloadButton.classList.remove("is-busy");
    webpDownloadButton.setAttribute("aria-busy", "false");
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

  convertButton.disabled = true;
  convertButton.textContent = "변환 중";
  convertButton.classList.add("is-busy");
  convertButton.setAttribute("aria-busy", "true");
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
    convertButton.disabled = false;
    convertButton.textContent = "변환하기";
    convertButton.classList.remove("is-busy");
    convertButton.setAttribute("aria-busy", "false");
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

  document.querySelectorAll(".segment").forEach((button) => {
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

function loadPreview(image, url, sizeLabel, width, height) {
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

function describeFeather(value) {
  if (value === 0) return "꺼짐: 경계를 가장 선명하게 둡니다. 거칠게 보이면 조금 올리세요.";
  if (value <= 0.4) return "낮음: 선명함을 유지하면서 미세한 계단 현상을 줄입니다.";
  if (value <= 1) return "중간: 테두리가 부드러워지지만 아주 얇은 디테일은 흐려질 수 있습니다.";
  return "높음: 많이 부드러워집니다. 머리카락이나 작은 글자는 뭉개질 수 있습니다.";
}

function describeErode(value) {
  if (value === 0) return "꺼짐: 원래 마스크 크기를 그대로 둡니다.";
  if (value <= 4) return "약함: 바깥쪽에 남은 배경 테두리를 살짝 줄입니다.";
  if (value <= 10) return "중간: 배경 잔여물을 더 줄이지만 피사체 가장자리도 조금 깎일 수 있습니다.";
  return "강함: 테두리를 많이 깎습니다. 흰 선이 심할 때만 사용하세요.";
}

function describeForeground(value) {
  if (value >= 235) return "높음: 확실한 피사체만 또렷하게 잡아 테두리 오염을 줄입니다.";
  if (value >= 180) return "중간: 더 많은 부분을 피사체로 인정합니다. 흐릿한 경계에 쓸 수 있습니다.";
  return "낮음: 애매한 영역까지 피사체로 잡습니다. 배경이 남을 수 있습니다.";
}

function describeBackground(value) {
  if (value <= 20) return "낮음: 배경으로 확실한 부분만 제거해 피사체 손상을 줄입니다.";
  if (value <= 80) return "중간: 배경 제거가 더 적극적입니다. 복잡한 배경에 쓸 수 있습니다.";
  return "높음: 애매한 영역도 배경으로 봅니다. 피사체 가장자리가 사라질 수 있습니다.";
}

function getSelectedIcoSizes() {
  return Array.from(document.querySelectorAll("input[name='icoSize']:checked")).map((input) => input.value);
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function buildCutoutName(name) {
  const stem = name.replace(/\.[^.]+$/, "") || "cutout";
  return `${stem}-cutout.png`;
}

function buildCutoutWebpName(name) {
  const stem = name.replace(/\.[^.]+$/, "") || "cutout";
  return `${stem}-cutout.webp`;
}

function buildConvertedName(name, format) {
  const stem = name.replace(/\.[^.]+$/, "") || "converted";
  const extension = format === "jpeg" ? "jpg" : format;
  return `${stem}.${extension}`;
}

async function saveBlobWithPicker(blob, filename, types) {
  const saveTarget = await prepareSaveTarget(filename, types);
  if (saveTarget.cancelled) return false;
  return writeBlobToSaveTarget(blob, saveTarget, filename);
}

async function prepareSaveTarget(filename, types) {
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

async function writeBlobToSaveTarget(blob, saveTarget, filename) {
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

function getSaveFileTypes(format) {
  const normalizedFormat = normalizeOutputFormat(format);
  const profiles = {
    png: { description: "PNG 이미지", mime: "image/png", extensions: [".png"] },
    jpg: { description: "JPG 이미지", mime: "image/jpeg", extensions: [".jpg", ".jpeg"] },
    webp: { description: "WebP 이미지", mime: "image/webp", extensions: [".webp"] },
    bmp: { description: "BMP 이미지", mime: "image/bmp", extensions: [".bmp"] },
    tiff: { description: "TIFF 이미지", mime: "image/tiff", extensions: [".tif", ".tiff"] },
    ico: { description: "ICO 아이콘", mime: "image/x-icon", extensions: [".ico"] },
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

function normalizeOutputFormat(format) {
  const normalized = String(format || "png").toLowerCase();
  if (normalized === "jpeg") return "jpg";
  if (normalized === "tif") return "tiff";
  return normalized;
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

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
