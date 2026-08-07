# Toolbox

로컬 이미지 작업 도구입니다. 배경 제거(누끼), 벌크 배경 제거, WebP 최적화와 이미지 형식 변환을 FastAPI 서버와 정적 브라우저 UI로 제공합니다. 누끼 자동화는 서버 없이 실행되는 CLI도 지원합니다.

누끼 기능의 정책은 **Maximum only**입니다. 속도·Lite·Balanced 경로, 품질을 낮추는 모델, 수동 알파 임계값은 제공하지 않습니다. 작업 종류마다 허용된 최고 품질 전문 모델만 사용합니다.

## 현재 실행 스펙

- Backend: FastAPI `0.115.6`
- rembg runtime: `2.0.77`
- Frontend: `static/index.html`과 ES module JavaScript
- Server entrypoint: `app.main:app`
- 누끼 자동화 entrypoint: `python -m app.cutout_cli`
- 기본 URL: `http://127.0.0.1:8000`
- Python: 3.11 이상
- Package manager: `pip`
- 로컬 가속: CUDA → Apple MPS → CPU 순서

## 빠른 실행

가상환경과 패키지 설치가 끝났다면 프로젝트 루트에서 실행합니다.

```bash
pnpm dev
```

pnpm이 없으면 다음 명령도 같습니다.

```bash
npm run dev
```

브라우저에서 `http://127.0.0.1:8000`을 엽니다. 포트가 사용 중이면 바꿀 수 있습니다.

```bash
pnpm dev -- --port 8010
```

Toolbox는 로컬 전용이므로 실행 호스트는 `127.0.0.1`, `localhost`, `::1`만 허용합니다. Windows PowerShell에서는 `scripts/dev.ps1`도 사용할 수 있습니다.

### macOS 로그인 자동 실행

Life OS에서 항상 연결하려면 이 Mac에서 한 번 설치합니다.

```bash
pnpm service:install
```

사용자 LaunchAgent `me.lenol.toolbox`가 `127.0.0.1:8000`에만 바인딩하고, 로그인 시 시작하며 종료되면 다시 실행합니다. 설치 명령은 같은 설정을 안전하게 갱신하므로 연결 복구가 필요할 때 다시 실행해도 됩니다. 로그는 `~/Library/Logs/Toolbox/`에 기록됩니다.

## 최초 1회 설치

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

`requirements.txt`가 바뀌었거나 가상환경을 새로 만들 때만 다시 설치하면 됩니다. 첫 추론에서는 선택된 모델 체크포인트를 내려받으므로 인터넷 연결과 디스크 여유 공간이 필요합니다. 이후에는 Hugging Face 또는 rembg 캐시를 재사용합니다.

## 최고 품질 모델 정책

2026-08-06 기준으로 라이선스와 공식 배포 상태를 다시 확인해 아래 네 모델만 노출합니다. Transformer 체크포인트는 재현성과 공급망 변경 방지를 위해 revision을 고정했습니다.

| 작업 | 모델 | 입력 | 라이선스 | 자동 대체 모델 |
| --- | --- | ---: | --- | --- |
| 범용, 캐릭터, 투명 소재, 효과, 글자/로고 | [`egeorcun/lucida`](https://huggingface.co/egeorcun/lucida) | 1024 | MIT | BiRefNet HR Matting |
| 실사 인물, 머리카락, 털, 부드러운 경계 | [`ZhengPeng7/BiRefNet_HR-matting`](https://huggingface.co/ZhengPeng7/BiRefNet_HR-matting) | 2048 | MIT | Lucida |
| 제품, 장비, 3D, 복잡한 실루엣과 다중 피사체 | [`ZhengPeng7/BiRefNet_HR`](https://huggingface.co/ZhengPeng7/BiRefNet_HR) | 2048 | MIT | Lucida |
| 애니메이션, 셀 셰이딩, 선화 중심 2D 캐릭터 | [`isnet-anime`](https://github.com/SkyTNT/anime-segmentation) | 전용 체크포인트 | Apache-2.0 | Lucida |

고정 revision:

- Lucida: `6cbedc9722652dc9a3df91dd871f0c4f3334e922`
- BiRefNet HR Matting: `5d6b6f8adcb5b417c871b1d84ceaae9871355b7f`
- BiRefNet HR: `a7a562f6fd16021180f2f4348f4de003a2d3d1e1`

모든 경로는 모델별 최고 입력 크기, 정밀 마스크 처리, 전경색 복원을 고정 적용합니다. UI와 API에는 품질을 낮추는 토글이나 임계값이 없습니다. 전경색 복원은 원본 해상도를 유지한 겹침 타일로 처리해 대형 이미지에서도 피크 메모리를 제한합니다. 서버 요청끼리뿐 아니라 Codex CLI와 브라우저 서버도 프로세스 간 파일 락을 공유해 고용량 추론을 한 건씩 실행합니다.

ISNet Anime 경로는 전용 체크포인트의 소프트 알파를 0/255로 이진화하지 않고 보존한 뒤 같은 전경색 복원을 적용합니다. 가는 선의 안티앨리어싱을 유지하면서 구조 검사와 시각 QA에서 배경 잔여를 판정합니다.

Lucida의 가중치와 코드는 MIT이지만 모델 카드에는 일부 학습 데이터셋이 연구 목적 조건으로 배포된다는 주의가 있습니다. 이는 유료 모델 라이선스는 아니지만, 상업 배포에 대한 법률적 보증도 아니므로 상업 서비스에 사용할 때는 데이터 출처 조건을 별도로 검토해야 합니다.

### 제외한 후보

무료로 최고 품질 경로 전체를 사용할 수 없는 후보는 카탈로그에 넣지 않습니다.

- [BRIA RMBG 2.0](https://huggingface.co/briaai/RMBG-2.0): 공개 라이선스가 비상업 용도에 제한되고 상업 사용은 별도 계약이 필요합니다.
- [FeyNoBg](https://huggingface.co/feyninc/FeyNobg): 체크포인트가 `CC-BY-NC-4.0`입니다.
- [FlowDIS](https://huggingface.co/PAIR/FlowDIS/blob/main/LICENSE): 비상업 제한 조건이 있습니다.
- [BEN2](https://github.com/PramaLLC/BEN2): 기본 코드는 MIT지만 최고 품질 learned refiner는 상업 제공 경로이므로 무료 최고 품질 세트에서 제외합니다.

라이선스가 불명확하거나 최고 품질 기능 일부가 유료인 새 후보도 같은 원칙으로 제외합니다.

## Codex용 누끼 CLI

Codex 자동화에서는 브라우저 서버를 켜지 않고 CLI를 사용합니다. Codex가 먼저 원본을 보고 작업을 분류한 뒤 해당 전문 모델을 요청합니다.

CLI는 FastAPI 서버 상태와 무관한 일회성 프로세스입니다. Toolbox 웹 UI가 꺼져 있어도 Codex가 아래 명령을 직접 실행해 모델을 기동하며, `.venv`와 모델 캐시를 재사용합니다.

```bash
.venv/bin/python -m app.cutout_cli \
  --input /absolute/path/source.png \
  --output /absolute/path/source-cutout.png \
  --task character \
  --qa-preview /absolute/path/source-cutout-qa.png
```

지원 작업 분류:

```bash
.venv/bin/python -m app.cutout_cli --list-tasks
```

지원 모델과 자동 대체 모델:

```bash
.venv/bin/python -m app.cutout_cli --list-models
```

작업 분류 대신 특정 모델을 명시하려면 `--model`을 사용합니다.

```bash
.venv/bin/python -m app.cutout_cli \
  --input /absolute/path/source.png \
  --output /absolute/path/source-cutout.png \
  --model birefnet-hr-matting \
  --qa-preview /absolute/path/source-cutout-qa.png
```

CLI 규칙:

- 입력과 출력은 절대 경로 사용을 권장합니다.
- 원본과 같은 경로는 거부합니다.
- 기존 출력은 기본적으로 덮어쓰지 않습니다. 사용자가 교체를 명시한 경우에만 `--force`를 사용합니다.
- 결과는 임시 파일을 완전히 쓴 다음 원자적으로 이동합니다.
- `--publish-cutout`은 시각 QA에서 선택한 PNG만 구조 재검사한 뒤 `~/Downloads`에 새 파일로 발행합니다.
- 마지막 stdout 한 줄은 선택 방식(`selection_mode`), 요청 작업 또는 명시 모델, 실제 사용 모델, 자동 대체 모델, 처리 시간, 알파 구조 검사 결과가 담긴 JSON입니다.
- `--qa-preview`를 항상 함께 사용해 원본·체커보드·흰색·검정 배경 비교판을 만듭니다.

### QA와 실패 복구

알파 구조 검사는 크기 불일치, 완전 불투명, 완전 투명, 투명 배경이 없는 균일한 소프트 알파, 극단적으로 작은 전경/배경 비율을 탐지합니다. 이 검사는 육안 검수를 대신하지 않습니다.

1. 원본을 확인하고 `general`, `character`, `transparent`, `design`, `portrait`, `hair`, `product`, `complex`, `anime` 중 하나로 분류합니다.
2. 첫 모델 결과의 QA 보드를 체커보드·흰색·검정 배경에서 확인합니다.
3. 테두리 halo, 머리카락/털 손실, 내부 구멍 누락, 반투명 효과 손실, 배경 잔여가 있으면 JSON의 `fallback_model`을 별도 결과 경로로 한 번 실행합니다.
4. 두 후보를 비교해 더 나은 결과만 실제 작업에 사용합니다.
5. 둘 다 실패한 드문 경우에는 자동 생성형 수정을 하지 않고 결함 위치를 보고한 뒤 수동 알파 마스크 보정을 요청합니다.
6. 시각 QA를 통과한 선택본 하나만 Downloads에 발행합니다.

즉, 기본 흐름은 `로컬 전문 모델 → Codex 시각 QA → 전문 모델 대체 실행 → 수동 마스크 최후 수단`입니다.

수동 교정본은 모델로 다시 변형하지 않고 검수 전용 모드로 확인합니다.

```bash
.venv/bin/python -m app.cutout_cli \
  --input /absolute/path/source.png \
  --review-cutout /absolute/path/manual-cutout.png \
  --qa-preview /absolute/path/manual-cutout-qa.png
```

선택본의 시각 QA가 끝나면 다음 발행 모드를 실행합니다.

```bash
.venv/bin/python -m app.cutout_cli \
  --input /absolute/path/source.png \
  --publish-cutout /absolute/temp/path/candidate-primary.png
```

기본 결과는 `~/Downloads/source-cutout.png`입니다. 같은 이름이 있으면 `source-cutout-2.png`, `source-cutout-3.png`처럼 빈 번호를 원자적으로 선택하므로 기존 파일을 덮어쓰지 않습니다. 후보와 QA 보드는 임시 작업 경로에 남고 선택된 최종 PNG 하나만 Downloads에 저장됩니다. 발행 직전 구조 검사가 실패하면 아무 파일도 저장하지 않습니다.

## 브라우저 사용 흐름

### 누끼

1. `누끼` 탭에서 이미지를 선택하거나 드롭합니다.
2. 이미지 종류에 맞는 네 전문 모델 중 하나를 고릅니다.
3. `누끼 따기`를 누릅니다.
4. 결과를 투명 PNG 또는 무손실 WebP로 저장합니다.

### 벌크누끼

1. `벌크누끼` 탭에서 같은 유형의 이미지 여러 장을 선택합니다.
2. 해당 유형의 전문 모델을 고릅니다.
3. `벌크 누끼`를 누릅니다.
4. 완료된 결과를 ZIP으로 저장합니다.

### WebP 최적화와 파일 변환

- WebP 최적화는 단일/다중 이미지를 처리하고 한 장이면 WebP, 여러 장이면 ZIP으로 저장합니다.
- 파일 변환은 PNG, JPG, WebP, BMP, TIFF, ICO 출력을 지원합니다.
- JPG/BMP는 배경색, JPG/WebP는 품질, ICO는 포함할 아이콘 크기를 선택할 수 있습니다. 이 옵션은 누끼 모델 품질 정책과 별개입니다.

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

픽셀 수는 전체 디코딩 전에 이미지 헤더로 먼저 검사합니다. 이 프로젝트는 외부 네트워크에 공개하는 서버로 설계하지 않았습니다.

## 환경 변수

새 설정 이름은 `TOOLBOX_*`이며 기존 `NUKKI_*` 제한값도 호환됩니다.

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `TOOLBOX_MODEL` | `lucida` | 브라우저/API 기본 누끼 모델. 허용된 네 모델 중 하나만 사용 가능 |
| `TOOLBOX_TORCH_THREADS` | `0` | CPU 추론용 PyTorch 스레드 수. 0이면 기본값 사용 |
| `TOOLBOX_MAX_PIXELS` | `80000000` | 허용할 최대 픽셀 수 |
| `TOOLBOX_MAX_UPLOAD_BYTES` | `104857600` | 허용할 최대 업로드 파일 크기 |
| `TOOLBOX_ALLOWED_ORIGINS` | `https://lenol.me,https://www.lenol.me` | 쉼표로 구분한 브라우저 교차 출처 허용 목록 |

모델 저장소, revision, 입력 크기는 환경 변수로 낮추거나 바꿀 수 없습니다. 카탈로그에 검증된 값으로 고정됩니다.

```bash
TOOLBOX_MAX_UPLOAD_BYTES=52428800 TOOLBOX_TORCH_THREADS=4 pnpm dev
```

## API

### 상태와 카탈로그

```http
GET /api/health
GET /api/models
GET /api/formats
```

`/api/models`는 `quality_policy: "maximum"`, 기본 모델, 네 모델, 작업 분류와 자동 대체 모델을 반환합니다.

### 배경 제거

```http
POST /api/remove
Content-Type: multipart/form-data
```

허용 필드:

- `file`: 이미지 파일
- `task`: `general`, `character`, `transparent`, `design`, `portrait`, `hair`, `product`, `complex`, `anime`
- `model_name`: `lucida`, `birefnet-hr-matting`, `birefnet-hr`, `isnet-anime`

`task`와 `model_name`은 동시에 지정하지 않습니다. 둘 다 생략하면 기본 모델을 사용하며, Life OS는 `task`로 권장 모델을 선택한 뒤 응답이 선언한 대체 모델을 최대 한 번 요청합니다.

응답은 투명 PNG이며 다음 헤더를 포함합니다.

- `X-Image-Width`, `X-Image-Height`
- `X-Model`
- `X-Quality-Policy: maximum`
- `X-Process-Time-Ms`
- `X-Cutout-Manifest`: URL-safe Base64 JSON으로 인코딩한 작업 선택, 실제 모델, 대체 모델과 알파 구조 QA 결과

브라우저 호출은 `https://lenol.me`, `https://www.lenol.me`와 HTTP loopback Origin만 허용합니다. Origin이 없는 CLI·네이티브 호출은 기존처럼 사용할 수 있고, `TOOLBOX_ALLOWED_ORIGINS`로 정확한 HTTPS Origin을 추가할 수 있습니다.

### 파일 변환

```http
POST /api/convert
Content-Type: multipart/form-data
```

필드: `file`, `output_format`, `background_color`, `quality`, `webp_lossless`, `ico_sizes`, `output_size`.

### ZIP 묶기와 로컬 저장

```http
POST /api/archive
POST /api/save
```

`/api/archive`는 `files`와 `archive_name`을 받고 ZIP을 반환합니다. `/api/save`는 `file`, `suggested_name`, `output_format`을 받아 로컬 저장 대화상자를 엽니다.

## 개발과 검증

프로젝트 구조:

```text
app/
  main.py            FastAPI 엔드포인트
  remover.py         최고 품질 모델 카탈로그, 라우팅, 추론과 후처리
  cutout_cli.py      Codex/자동화용 원자적 누끼 CLI
  cutout_quality.py  알파 구조 검사와 4분할 QA 보드
  converter.py       이미지 형식 변환
  local_save.py      로컬 저장 대화상자
  settings.py        환경 변수와 제한값
static/
  index.html         브라우저 UI
  app.js             UI 이벤트와 API 호출
  js/                프론트 유틸 모듈
tests/
  test_cutout_cli.py
  test_cutout_quality.py
  test_remover_catalog.py
  test_remover_runtime.py
  test_static_contract.py
```

Python 검증:

```bash
.venv/bin/python -m compileall app tests
.venv/bin/python -m unittest discover -s tests
```

JS 문법 확인:

```bash
find static -name '*.js' -print0 | xargs -0 -n1 node --check
```

서버 smoke test:

```bash
pnpm dev -- --port 8010
curl http://127.0.0.1:8010/api/health
curl http://127.0.0.1:8010/api/models
```

## 문제 해결

### 첫 누끼 실행이 오래 걸림

첫 실행은 체크포인트를 내려받고 메모리에 올립니다. Lucida는 약 885 MB, BiRefNet HR 계열은 각각 약 444 MB이므로 네트워크와 장치에 따라 수 분 걸릴 수 있습니다. 이후 실행은 로컬 캐시를 사용합니다.

### 최고 품질 모델이 너무 느림

이 프로젝트는 속도 우선 모델로 자동 강등하지 않습니다. CUDA 또는 Apple Silicon MPS를 사용하거나 작업이 끝날 때까지 기다립니다. 빠른 확인용 저품질 출력이 필요하다면 별도 도구를 사용해야 합니다.

### 결과가 어색함

CLI에서 `--qa-preview`를 만들고 흰색·검정·체커보드에서 확인합니다. 첫 결과에 결함이 있으면 출력 JSON의 `fallback_model`로 별도 후보를 만들고 비교합니다. 두 모델 모두 실패할 때만 수동 알파 마스크 보정을 사용합니다.

### 저장 위치 선택창이 뜨지 않음

브라우저가 File System Access API를 지원하지 않으면 서버의 로컬 저장 대화상자로 대체됩니다. 이때 Python 환경에 `tkinter`가 필요합니다.

### 파일이 너무 크다는 오류가 남

기본 제한은 업로드 100 MB, 이미지 80 MP입니다. 필요하면 `TOOLBOX_MAX_UPLOAD_BYTES`, `TOOLBOX_MAX_PIXELS`를 조정합니다.
