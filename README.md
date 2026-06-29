# Toolbox

로컬에서 실행하는 이미지 작업 도구입니다. 브라우저 UI에서 배경 제거(누끼), 벌크 배경 제거, WebP 최적화, 이미지 형식 변환을 처리하고 결과 파일을 사용자가 고른 위치에 저장합니다.

이 저장소는 Node/Vite 앱이 아니라 **Python FastAPI 서버 + 정적 프론트엔드**입니다. 편의상 `package.json`의 script alias로 `pnpm dev`와 `npm run dev`를 지원하며, 내부에서는 `uvicorn app.main:app`를 실행합니다.

## 현재 실행 스펙

- Backend: FastAPI `0.115.6`
- Frontend: `static/index.html`과 ES module JavaScript
- Server entrypoint: `app.main:app`
- 기본 URL: `http://127.0.0.1:8000`
- Python: 3.11 이상
- Package manager: `pip`
- Node/pnpm: 앱 런타임에는 필요하지 않습니다. 실행 단축 명령과 JS 문법 확인에만 선택적으로 씁니다.

## 빠른 실행

이미 가상환경과 패키지 설치가 끝난 뒤에는 프로젝트 루트에서 아래만 실행합니다.

```bash
pnpm dev
```

pnpm이 없으면 npm으로도 실행할 수 있습니다.

```bash
npm run dev
```

브라우저에서 `http://127.0.0.1:8000`을 엽니다.

8000번 포트가 이미 사용 중이면 포트를 바꿉니다.

```bash
pnpm dev -- --port 8010
```

Windows PowerShell 사용자는 기존 PowerShell 스크립트를 직접 실행할 수도 있습니다.

```powershell
.\scripts\dev.ps1
```

## 최초 1회 설치

처음 받았거나 `.venv`를 새로 만드는 경우에만 실행합니다. 이미 설치가 끝났다면 이 섹션은 매번 반복하지 않아도 됩니다.

macOS/Linux:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

`requirements.txt`가 바뀌었거나 가상환경을 지웠을 때만 패키지를 다시 설치하세요.

PowerShell 실행 정책 때문에 가상환경 활성화가 막히면 현재 터미널 세션에서만 정책을 완화한 뒤 다시 활성화합니다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### Warp에서 `pnpm dev`가 안 켜질 때

pnpm이 설치되어 있지 않으면 `npm run dev`를 쓰세요. Python 패키지 오류가 나면 먼저 최초 1회 설치 섹션의 `pip install -r requirements.txt`까지 끝냈는지 확인하세요.

## 주요 기능

- 고품질 배경 제거: `BiRefNet HQ`, `ISNet General`, `U2-Net`, `U2-Netp`, 인물/애니 특화 모델
- 벌크 배경 제거: 여러 이미지를 순차 처리하고 성공 결과를 ZIP으로 저장
- WebP 최적화: 단일/다중 이미지를 WebP로 변환하고 단일 파일 또는 ZIP으로 저장
- 품질 프리셋: `Ultra`, `Studio`, `Balanced`, `Fast`
- 엣지 보정: 머리카락/반투명 보정, 마스크 정리, 테두리 색 번짐 제거
- 파일 변환: PNG, JPG, WebP, BMP, TIFF, ICO 출력 지원
- 크기 조정: 변환은 최대 128px/256px/512px, WebP 최적화는 최대 512px/1024px/1920px/2048px
- 저장 위치 선택: 브라우저 File System Access API 또는 서버의 로컬 저장 대화상자
- 드래그 앤 드롭: 각 업로드 영역과 페이지 전체 드롭 지원
- 진행 표시: 누끼, 벌크누끼, WebP 최적화, 파일 변환 작업 중 progress overlay 표시

## 요구 사항

- Windows/macOS/Linux 로컬 실행 기준으로 작성되어 있습니다.
- 첫 배경 제거 실행 때 모델 파일을 내려받을 수 있으므로 인터넷 연결이 필요할 수 있습니다.
- `BiRefNet HQ`는 CPU에서도 동작하지만 큰 이미지는 느릴 수 있습니다.
- CUDA를 쓰려면 `requirements.txt`의 CPU PyTorch 구성 대신 환경에 맞는 PyTorch 설치가 필요합니다.
- `/api/save`의 서버 저장 대화상자는 데스크톱 Python의 `tkinter`에 의존합니다.

## 사용 흐름

### 누끼

1. `누끼` 탭에서 이미지를 선택하거나 페이지에 드롭합니다.
2. 품질 프리셋을 고릅니다. 처음에는 `Ultra`가 기본값입니다.
3. 필요하면 모델, 엣지, 임계값을 조정합니다.
4. `누끼 따기`를 누릅니다.
5. 결과를 `PNG 저장` 또는 `WebP 저장`으로 저장합니다.

### 벌크누끼

1. `벌크누끼` 탭에서 여러 이미지를 선택하거나 페이지에 드롭합니다.
2. 품질 프리셋과 모델을 고릅니다.
3. 필요하면 엣지, 임계값, 보정 옵션을 조정합니다.
4. `벌크 누끼`를 누르면 파일별로 순차 처리합니다.
5. 완료된 결과는 ZIP으로 묶이며 `ZIP 저장`으로 저장합니다.

### WebP 최적화

1. `WebP 최적화` 탭에서 한 장 또는 여러 이미지를 선택하거나 페이지에 드롭합니다.
2. 표준 품질 값을 조정하거나 `무손실 WebP`를 켭니다.
3. 필요하면 긴 변 기준 출력 최대 크기를 선택합니다.
4. `WebP 최적화`를 누르면 파일별로 순차 변환합니다.
5. 한 장이면 WebP 파일로, 여러 장이면 ZIP으로 저장합니다.

### 파일 변환

1. `파일 변환` 탭에서 이미지를 선택하거나 페이지에 드롭합니다.
2. 출력 형식을 고릅니다.
3. JPG/BMP는 배경색, JPG/WebP는 품질, ICO는 포함할 아이콘 크기를 조정합니다.
4. 필요하면 긴 변 기준 출력 최대 크기를 선택합니다.
5. `변환하기` 후 `파일 저장`으로 저장합니다.

## 모델과 품질 옵션

### 모델

| 모델 | 용도 |
| --- | --- |
| `birefnet-hq` | 만능 최고 품질. 복잡한 배경, 제품 윤곽, 머리카락에 적합 |
| `birefnet-massive` | 캐릭터, 피규어, 복잡한 실루엣 같은 어려운 경계용 |
| `birefnet-hrsod` | 로고, 제품, 고해상도 피사체 윤곽용 |
| `birefnet-portrait` | 인물과 프로필 사진용 |
| `isnet-anime` | 애니메이션, 일러스트, 2D 캐릭터 이미지용 |
| `bria-rmbg` | 제품, 로고, 문자 요소가 섞인 이미지용. 비상업/별도 라이선스 확인 필요 |
| `birefnet-general` | 일반 사진용 최신 BiRefNet 계열 |
| `birefnet-general-lite` | 벌크 작업에 쓰기 좋은 가벼운 BiRefNet 계열 |
| `isnet-general-use` | 품질과 속도의 균형이 좋은 기존 일반 사진용 모델 |
| `u2net_human_seg` | 사람 중심 이미지를 빠르게 처리하는 모델 |
| `u2net` | 빠르고 안정적인 기존 균형형 모델 |
| `u2netp` | 가장 빠른 미리보기용 모델 |
| `silueta` | 빠른 일반 배경 제거 후보 |

### 프리셋

| 프리셋 | 기본 모델 | 설명 |
| --- | --- | --- |
| `Ultra` | `birefnet-hq` | 가장 정밀합니다. 느리지만 복잡한 경계에 유리합니다. |
| `Studio` | `birefnet-general` | 품질 우선입니다. 일반 제품 사진이나 인물에 무난합니다. |
| `Balanced` | `isnet-general-use` | 속도와 품질의 중간값입니다. |
| `Fast` | `u2netp` | 가장 빠릅니다. 대략적인 확인이나 단순한 이미지에 적합합니다. |

### 세부 옵션

- 머리카락/반투명 보정: 얇은 머리카락, 털, 비치는 천 같은 가장자리를 자연스럽게 살립니다.
- 마스크 정리: 배경에 남은 점이나 작은 구멍을 정리합니다.
- 테두리 색 번짐 제거: 기존 배경색이 피사체 가장자리에 묻은 현상을 줄입니다.
- 부드럽게: 경계의 계단 현상을 줄입니다. 많이 올리면 얇은 디테일이 흐려질 수 있습니다.
- 안쪽으로 줄이기: 배경 잔여 테두리를 줄입니다. 많이 올리면 피사체 윤곽이 깎일 수 있습니다.
- 피사체 확신/배경 확신: alpha matting이 켜졌을 때 쓰는 기준값입니다.

## 지원 형식과 제한

| 항목 | 현재 값 |
| --- | --- |
| 누끼/벌크/WebP 입력 | PNG, JPG, WebP, BMP, TIFF |
| 파일 변환 입력 | PNG, JPG, WebP, BMP, TIFF, ICO |
| 파일 변환 출력 | PNG, JPG, WebP, BMP, TIFF, ICO |
| 변환 출력 크기 | 원본 유지 또는 긴 변 기준 최대 128px/256px/512px |
| WebP 출력 크기 | 원본 유지 또는 긴 변 기준 최대 512px/1024px/1920px/2048px |
| ICO 크기 | 16, 32, 48, 64, 128, 256 |
| 업로드 제한 | 기본 100 MB |
| 이미지 제한 | 기본 80 MP |

픽셀 수는 파일 전체를 디코딩하기 전에 이미지 헤더 기준으로 먼저 검사합니다. 이 프로젝트는 로컬 작업용이며 외부 네트워크에 공개하는 서버로 설계되어 있지 않습니다.

## 환경 변수

새 설정 이름은 `TOOLBOX_*`입니다. 기존 `NUKKI_*` 이름도 호환됩니다.

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `TOOLBOX_MODEL` | `birefnet-hq` | 기본 누끼 모델 |
| `TOOLBOX_BIREFNET_REPO` | `ZhengPeng7/BiRefNet` | BiRefNet 모델 저장소 |
| `TOOLBOX_BIREFNET_REVISION` | `e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4` | BiRefNet 모델 revision |
| `TOOLBOX_BIREFNET_SIZE` | `1024` | BiRefNet 추론 입력 크기. 256부터 2048 사이 |
| `TOOLBOX_TORCH_THREADS` | `0` | CPU 추론용 PyTorch 스레드 수. 0이면 기본값 사용 |
| `TOOLBOX_MAX_PIXELS` | `80000000` | 허용할 최대 픽셀 수 |
| `TOOLBOX_MAX_UPLOAD_BYTES` | `104857600` | 허용할 최대 업로드 파일 크기 |

잘못된 숫자 설정값은 앱을 즉시 중단하지 않고 기본값으로 되돌립니다.

```powershell
$env:TOOLBOX_MAX_UPLOAD_BYTES = "52428800"
$env:TOOLBOX_TORCH_THREADS = "4"
pnpm dev
```

macOS/Linux에서는 같은 설정을 아래처럼 지정합니다.

```bash
TOOLBOX_MAX_UPLOAD_BYTES=52428800 TOOLBOX_TORCH_THREADS=4 pnpm dev
```

## API

### 상태 확인

```http
GET /api/health
```

```json
{ "status": "ok" }
```

### 모델 목록

```http
GET /api/models
```

사용 가능한 배경 제거 모델과 기본 모델을 반환합니다.

### 변환 형식 목록

```http
GET /api/formats
```

사용 가능한 출력 형식과 기본 형식을 반환합니다.

### 배경 제거

```http
POST /api/remove
Content-Type: multipart/form-data
```

필드:

- `file`: 이미지 파일
- `model_name`: `/api/models`의 `models[].id` 값. 예: `birefnet-hq`, `birefnet-massive`, `birefnet-hrsod`, `birefnet-portrait`, `isnet-anime`, `bria-rmbg`, `birefnet-general`, `birefnet-general-lite`, `isnet-general-use`, `u2net_human_seg`, `u2net`, `u2netp`, `silueta`
- `alpha_matting`: `true` 또는 `false`
- `post_process_mask`: `true` 또는 `false`
- `foreground_refine`: `true` 또는 `false`
- `foreground_threshold`: 피사체 확신 기준값
- `background_threshold`: 배경 확신 기준값
- `erode_size`: 마스크를 안쪽으로 줄이는 정도
- `edge_feather`: 경계 부드럽게 처리할 반경
- `png_compression`: PNG 압축 레벨. 0부터 9 사이로 보정됩니다.

응답은 투명 배경 PNG입니다.

응답 헤더:

- `X-Image-Width`: 결과 이미지 너비
- `X-Image-Height`: 결과 이미지 높이
- `X-Model`: 사용한 모델
- `X-Process-Time-Ms`: 처리 시간

### 파일 변환

```http
POST /api/convert
Content-Type: multipart/form-data
```

필드:

- `file`: 이미지 파일
- `output_format`: `png`, `jpg`, `webp`, `bmp`, `tiff`, `ico`
- `background_color`: JPG/BMP처럼 알파 채널이 없는 형식으로 저장할 때 사용할 배경색
- `quality`: JPG/WebP 품질. 1부터 100 사이로 보정됩니다.
- `webp_lossless`: WebP를 무손실로 저장할지 여부
- `ico_sizes`: `16,32,48,64,128,256` 같은 ICO 출력 크기 목록. ICO는 8부터 256 사이만 허용합니다.
- `output_size`: 긴 변 기준 최대 크기. `0`이면 원본 크기를 유지하고, 8부터 4096 사이 값을 허용합니다.

응답은 선택한 형식의 이미지 파일입니다.

응답 헤더:

- `X-Image-Width`: 결과 이미지 너비
- `X-Image-Height`: 결과 이미지 높이
- `X-Output-Format`: 출력 형식
- `X-Optimization-Mode`: `lossless` 또는 `standard`
- `X-Process-Time-Ms`: 처리 시간

### ZIP 묶기

```http
POST /api/archive
Content-Type: multipart/form-data
```

필드:

- `files`: ZIP에 넣을 파일 목록
- `archive_name`: 내려받을 ZIP 파일명

응답은 ZIP 압축 파일입니다.

응답 헤더:

- `X-Archive-Count`: ZIP에 포함된 파일 수

### 로컬 저장

```http
POST /api/save
Content-Type: multipart/form-data
```

필드:

- `file`: 저장할 파일 데이터
- `suggested_name`: 저장 대화상자에 표시할 기본 파일명
- `output_format`: 저장할 파일 형식

응답:

```json
{ "saved": true }
```

사용자가 저장을 취소하면 다음처럼 응답합니다.

```json
{ "saved": false }
```

## 개발

프로젝트 구조:

```text
app/
  main.py        FastAPI 엔드포인트
  remover.py     배경 제거 모델 실행과 후처리
  converter.py   이미지 형식 변환
  local_save.py  로컬 저장 대화상자
  settings.py    환경 변수와 제한값
static/
  index.html     브라우저 UI
  app.js         UI 이벤트와 API 호출
  js/            프론트 유틸 모듈
tests/
  test_converter.py
```

Python 검증:

```powershell
python -m compileall app tests
python -m unittest discover -s tests
```

JS 문법 확인:

```powershell
Get-ChildItem -Path static -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

## 문제 해결

### `pnpm dev`가 동작하지 않음

`pnpm dev`는 루트의 `package.json`에서 `scripts/dev.mjs`를 호출합니다. 이 스크립트는 macOS/Linux에서는 `.venv/bin/python`, Windows에서는 `.venv\Scripts\python.exe`를 우선 사용하고, 가상환경이 없으면 `PYTHON` 환경 변수 또는 시스템 Python을 사용합니다. pnpm이 없으면 `npm run dev`를 사용하세요.

### 브라우저에서 서버 확인 필요로 표시됨

FastAPI 서버가 켜져 있는지 확인하고 `http://127.0.0.1:8000`으로 접속했는지 확인하세요. 포트를 바꿔 실행했다면 접속 URL도 같은 포트로 바꿔야 합니다.

### 첫 누끼 실행이 오래 걸림

첫 실행 때 모델 파일을 내려받고 로딩합니다. 이후 실행은 캐시를 사용하므로 더 빨라집니다.

### `BiRefNet HQ`가 너무 느림

`Studio`, `Balanced`, `Fast` 프리셋을 쓰거나 모델을 `ISNet General`, `U2-Net`, `U2-Netp`로 바꿔보세요. CPU 환경에서는 큰 이미지가 오래 걸릴 수 있습니다.

### 저장 위치 선택창이 뜨지 않음

브라우저가 File System Access API를 지원하지 않으면 서버의 로컬 저장 대화상자로 대체됩니다. 이때 Python 환경에 `tkinter`가 필요합니다.

### 파일이 너무 크다는 오류가 남

기본 제한은 업로드 100 MB, 이미지 80 MP입니다. 필요하면 `TOOLBOX_MAX_UPLOAD_BYTES`, `TOOLBOX_MAX_PIXELS`를 조정하세요.

### WebP가 생각보다 큼

누끼 결과의 `WebP 저장`은 품질 손실을 피하기 위해 무손실 WebP를 사용합니다. 더 작은 파일이 필요하면 파일 변환 탭이나 WebP 최적화 탭에서 품질 값을 낮춰 저장하세요.
