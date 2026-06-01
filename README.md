# Toolbox

로컬에서 실행하는 고품질 이미지 작업대입니다. 누끼 탭은 모델이 만든 알파 마스크를 원본 해상도에 합성해 투명 PNG로 저장하고, 결과물을 손실이 거의 없는 WebP로도 저장할 수 있습니다. 파일 변환 탭은 PNG, JPG, WebP, BMP, TIFF, ICO 사이를 로컬에서 변환합니다.

기본 누끼 모델은 Photoshop/Adobe Express류의 원클릭 배경제거에 더 가까운 결과를 노리는 `BiRefNet HQ`입니다. 모델 실행과 파일 저장은 로컬 서버에서 처리합니다.

## 실행

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

브라우저에서 `http://127.0.0.1:8000`을 엽니다. 첫 실행 때는 선택한 모델 파일을 내려받기 때문에 시간이 더 걸릴 수 있습니다. `BiRefNet HQ`는 CPU에서도 동작하지만, 큰 이미지는 느릴 수 있습니다.

## 품질/성능 옵션

- `BiRefNet HQ`: 복잡한 물체, 제품 사진, 머리카락/털 경계를 가장 우선하는 고품질 기본값입니다.
- `ISNet General`: 빠르면서도 깔끔한 기존 기본 모델입니다.
- `U2-Net`: 품질과 속도의 균형이 좋습니다.
- `U2-Netp`: 빠른 미리보기용입니다.
- `Human Segmentation`: 인물 사진에 맞춘 모델입니다.
- `ISNet Anime`: 애니메이션/일러스트 이미지에 적합합니다.

`Ultra` 프리셋은 `BiRefNet HQ`, 머리카락/반투명 보정, 마스크 정리, 테두리 색 번짐 제거를 켭니다. 많은 이미지를 빠르게 처리해야 하면 `Fast` 프리셋이나 `U2-Netp` 모델을 선택하세요.

## 안전/제한

- 업로드 파일은 기본 100 MB까지 허용합니다.
- 이미지는 기본 80 MP까지 처리합니다.
- 이미지 픽셀 수는 파일 전체를 디코딩하기 전에 헤더 기준으로 먼저 검사합니다.
- `BiRefNet HQ`는 Hugging Face 모델 저장소의 커스텀 코드를 사용하므로 기본 revision을 고정해 실행합니다. 다른 revision을 쓰려면 `TOOLBOX_BIREFNET_REVISION`을 명시하세요.
- 브라우저 저장 API를 지원하지 않는 환경에서는 로컬 서버가 저장 위치 선택 대화상자를 띄웁니다.

## 환경 변수

새 설정 이름은 `TOOLBOX_*`입니다. 기존 `NUKKI_*` 이름도 호환됩니다.

- `TOOLBOX_MODEL`: 기본 모델명입니다. 기본값은 `birefnet-hq`입니다.
- `TOOLBOX_BIREFNET_REPO`: BiRefNet 모델 저장소입니다. 기본값은 `ZhengPeng7/BiRefNet`입니다.
- `TOOLBOX_BIREFNET_REVISION`: BiRefNet 모델 revision입니다. 기본값은 `e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4`입니다.
- `TOOLBOX_BIREFNET_SIZE`: BiRefNet 추론 입력 크기입니다. 기본값은 `1024`이며 256부터 2048 사이를 허용합니다.
- `TOOLBOX_TORCH_THREADS`: CPU 추론에 사용할 PyTorch 스레드 수입니다.
- `TOOLBOX_MAX_PIXELS`: 허용할 최대 픽셀 수입니다. 기본값은 `80000000`입니다.
- `TOOLBOX_MAX_UPLOAD_BYTES`: 허용할 최대 업로드 파일 크기입니다. 기본값은 `104857600`입니다.

잘못된 숫자 설정값은 앱을 즉시 중단하지 않고 기본값으로 되돌립니다.

## API

### 배경 제거

```http
POST /api/remove
Content-Type: multipart/form-data
```

필드:

- `file`: 이미지 파일
- `model_name`: `birefnet-hq`, `isnet-general-use`, `u2net`, `u2netp`, `u2net_human_seg`, `isnet-anime`
- `alpha_matting`: `true` 또는 `false`
- `post_process_mask`: `true` 또는 `false`
- `foreground_refine`: `true` 또는 `false`
- `foreground_threshold`, `background_threshold`, `erode_size`, `edge_feather`
- `png_compression`: PNG 압축 레벨입니다. 0부터 9 사이로 보정됩니다.

응답은 투명 배경의 PNG입니다.

### 파일 변환

```http
POST /api/convert
Content-Type: multipart/form-data
```

필드:

- `file`: 이미지 파일
- `output_format`: `png`, `jpg`, `webp`, `bmp`, `tiff`, `ico`
- `background_color`: JPG/BMP처럼 알파 채널이 없는 형식으로 저장할 때 사용할 배경색입니다.
- `quality`: JPG/WebP 품질입니다.
- `webp_lossless`: WebP를 무손실로 저장할지 여부입니다.
- `ico_sizes`: `16,32,48,64,128,256` 같은 ICO 출력 크기 목록입니다. ICO는 8부터 256 사이만 허용합니다.
- `output_size`: 긴 변 기준 최대 크기입니다. `0`이면 원본 크기를 유지하고, 8부터 4096 사이 값을 허용합니다.

응답은 선택한 형식의 이미지 파일입니다.

### 로컬 저장

```http
POST /api/save
Content-Type: multipart/form-data
```

필드:

- `file`: 저장할 파일 데이터
- `suggested_name`: 저장 대화상자에 표시할 기본 파일명
- `output_format`: 저장할 파일 형식

응답은 `{ "saved": true }` 또는 `{ "saved": false }`입니다. 저장 위치 선택은 로컬 데스크톱 대화상자로 처리됩니다.
