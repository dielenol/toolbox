export const presets = {
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

export const modelProfiles = {
  "birefnet-hq": "최고 품질",
  "isnet-general-use": "품질 우선",
  u2net: "균형",
  u2netp: "속도 우선",
  u2net_human_seg: "인물",
  "isnet-anime": "애니/일러스트",
};

export const modelHelps = {
  "birefnet-hq": "가장 정밀한 모델입니다. 머리카락, 제품 윤곽, 복잡한 배경에 강하지만 처리 시간이 더 깁니다.",
  "isnet-general-use": "품질과 속도의 균형이 좋은 기본 모델입니다. 대부분의 일반 사진에 잘 맞습니다.",
  u2net: "빠르고 안정적인 균형형 모델입니다. 대량 작업이나 간단한 배경에 좋습니다.",
  u2netp: "가장 빠른 모델입니다. 미리보기용으로 좋지만 복잡한 가장자리는 덜 정밀할 수 있습니다.",
  u2net_human_seg: "인물 사진 중심 모델입니다. 사람만 따고 싶을 때 선택하세요.",
  "isnet-anime": "애니메이션, 일러스트, 캐릭터 이미지에 맞춘 모델입니다.",
};

export const presetHelps = {
  ultra: "가장 정밀하게 따는 설정입니다. 느리지만 복잡한 경계에 유리합니다.",
  studio: "품질을 우선하지만 Ultra보다 가볍습니다. 일반 제품 사진이나 인물에 무난합니다.",
  balanced: "속도와 품질의 중간값입니다. 여러 장을 처리할 때 시작점으로 좋습니다.",
  fast: "가장 빠른 설정입니다. 대략적인 확인이나 단순한 이미지에 적합합니다.",
};

export const formatProfiles = {
  png: "투명 배경 보존",
  jpg: "일반 사진",
  webp: "웹 최적화",
  bmp: "호환성",
  tiff: "보관용",
  ico: "Windows 아이콘",
};
