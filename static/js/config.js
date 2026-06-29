export const presets = {
  ultra: {
    alphaMatting: true,
    postProcess: true,
    foregroundRefine: true,
    edgeFeather: "0.1",
    erodeSize: "4",
    foregroundThreshold: "240",
    backgroundThreshold: "10",
  },
  studio: {
    alphaMatting: true,
    postProcess: true,
    foregroundRefine: true,
    edgeFeather: "0.4",
    erodeSize: "10",
    foregroundThreshold: "240",
    backgroundThreshold: "10",
  },
  balanced: {
    alphaMatting: true,
    postProcess: true,
    foregroundRefine: false,
    edgeFeather: "0.2",
    erodeSize: "6",
    foregroundThreshold: "235",
    backgroundThreshold: "15",
  },
  fast: {
    alphaMatting: false,
    postProcess: true,
    foregroundRefine: false,
    edgeFeather: "0",
    erodeSize: "3",
    foregroundThreshold: "240",
    backgroundThreshold: "10",
  },
};

export const fallbackModelGroups = [
  {
    id: "recommended",
    name: "목적별 최고 추천",
    models: [
      {
        id: "birefnet-hq",
        name: "BiRefNet HQ",
        profile: "범용 최고",
        description: "사진, 제품, 머리카락처럼 용도가 섞였을 때 가장 먼저 쓰는 최고 품질 선택입니다.",
        engine: "transformers",
        license_note: "",
      },
      {
        id: "birefnet-massive",
        name: "BiRefNet Massive",
        profile: "캐릭터 최고",
        description: "캐릭터, 피규어, 복잡한 실루엣처럼 경계가 많은 이미지에서 먼저 고를 선택입니다.",
        engine: "rembg",
        license_note: "",
      },
      {
        id: "birefnet-hrsod",
        name: "BiRefNet HRSOD",
        profile: "로고/제품 최고",
        description: "로고, 제품, 선명한 물체 윤곽처럼 경계가 또렷해야 하는 이미지에서 먼저 고를 선택입니다.",
        engine: "rembg",
        license_note: "",
      },
      {
        id: "birefnet-portrait",
        name: "BiRefNet Portrait",
        profile: "인물 최고",
        description: "사람 중심 이미지, 프로필, 상반신 사진에서 먼저 고를 선택입니다.",
        engine: "rembg",
        license_note: "",
      },
      {
        id: "isnet-anime",
        name: "ISNet Anime",
        profile: "애니 최고",
        description: "애니메이션, 일러스트, 2D 캐릭터 이미지에서 먼저 고를 선택입니다.",
        engine: "rembg",
        license_note: "",
      },
      {
        id: "birefnet-general-lite",
        name: "BiRefNet General Lite",
        profile: "벌크 최고",
        description: "여러 장을 처리할 때 품질과 속도 균형이 가장 무난한 선택입니다.",
        engine: "rembg",
        license_note: "",
      },
    ],
  },
];

export const modelProfiles = {
  "birefnet-hq": "범용 최고",
  "birefnet-massive": "캐릭터 최고",
  "birefnet-hrsod": "로고/제품 최고",
  "birefnet-portrait": "인물 최고",
  "birefnet-general": "일반 고품질",
  "birefnet-general-lite": "벌크 최고",
  "bria-rmbg": "로고/문자/제품",
  "isnet-general-use": "기존 품질 우선",
  u2net: "균형",
  u2netp: "최고 속도",
  u2net_human_seg: "인물 빠른 처리",
  "isnet-anime": "애니 최고",
  silueta: "소형 일반",
};

export const modelHelps = {
  "birefnet-hq": "사진, 제품, 머리카락처럼 용도가 섞였을 때 가장 먼저 쓰는 최고 품질 선택입니다.",
  "birefnet-massive": "캐릭터, 피규어, 복잡한 실루엣처럼 경계가 많은 이미지에서 먼저 고를 선택입니다.",
  "birefnet-hrsod": "로고, 제품, 선명한 물체 윤곽처럼 경계가 또렷해야 하는 이미지에서 먼저 고를 선택입니다.",
  "birefnet-portrait": "사람 중심 이미지, 프로필, 상반신 사진에서 먼저 고를 선택입니다.",
  "birefnet-general": "일반 사진 전반에 쓰기 좋은 최신 rembg BiRefNet 계열 모델입니다.",
  "birefnet-general-lite": "여러 장을 처리할 때 품질과 속도 균형이 가장 무난한 선택입니다.",
  "bria-rmbg": "제품, 로고, 글자 요소가 섞인 이미지에 강한 모델입니다. 비상업/별도 라이선스 확인 필요.",
  "isnet-general-use": "품질과 속도의 균형이 좋은 기존 일반 사진용 모델입니다.",
  u2net: "빠르고 안정적인 기존 균형형 모델입니다. 대량 작업이나 단순 배경에 적합합니다.",
  u2netp: "가장 빠른 미리보기용 모델입니다. 복잡한 가장자리 정밀도는 낮을 수 있습니다.",
  u2net_human_seg: "사람만 빠르게 따고 싶을 때 선택하는 기존 인물 세그멘테이션 모델입니다.",
  "isnet-anime": "애니메이션, 일러스트, 캐릭터 이미지에 맞춘 모델입니다.",
  silueta: "가벼운 일반 배경 제거 모델입니다. 빠른 처리 후보로 두고 비교하세요.",
};

export const presetHelps = {
  ultra: "선택한 목적별 모델을 유지한 채 가장 정밀한 보정 옵션을 씁니다.",
  studio: "선택한 모델을 유지하고 품질 우선 보정 옵션을 씁니다.",
  balanced: "선택한 모델을 유지하고 속도와 품질의 중간 보정 옵션을 씁니다.",
  fast: "선택한 모델을 유지하고 빠른 확인용 보정 옵션을 씁니다.",
};

export const formatProfiles = {
  png: "투명 배경 보존",
  jpg: "일반 사진",
  webp: "웹 최적화",
  bmp: "호환성",
  tiff: "보관용",
  ico: "Windows 아이콘",
};
