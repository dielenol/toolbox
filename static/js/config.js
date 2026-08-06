export const fallbackModelGroups = [
  {
    id: "recommended",
    name: "목적별 최고 품질",
    models: [
      {
        id: "lucida",
        name: "Lucida",
        profile: "투명/디자인 최고",
        description: "투명 소재, 로고와 글자, 일러스트, 발광 효과, 위장 배경을 가장 정밀하게 보존합니다.",
        engine: "transformers",
        license_id: "MIT",
      },
      {
        id: "birefnet-hr-matting",
        name: "BiRefNet HR Matting",
        profile: "인물/머리카락 최고",
        description: "2048 입력으로 인물, 머리카락, 털, 부드러운 경계와 고해상도 사진을 정밀하게 처리합니다.",
        engine: "transformers",
        license_id: "MIT",
      },
      {
        id: "birefnet-hr",
        name: "BiRefNet HR",
        profile: "제품/고해상도 최고",
        description: "2048 입력으로 제품, 3D 캐릭터, 복잡한 실루엣과 다중 피사체의 경계를 선명하게 분리합니다.",
        engine: "transformers",
        license_id: "MIT",
      },
      {
        id: "isnet-anime",
        name: "ISNet Anime",
        profile: "2D 애니 최고",
        description: "애니메이션과 셀 셰이딩 2D 캐릭터의 선화와 내부 구멍을 전용 체크포인트로 분리합니다.",
        engine: "rembg",
        license_id: "Apache-2.0",
      },
    ],
  },
];

export const modelProfiles = {
  lucida: "투명/디자인 최고",
  "birefnet-hr-matting": "인물/머리카락 최고",
  "birefnet-hr": "제품/고해상도 최고",
  "isnet-anime": "2D 애니 최고",
};

export const modelHelps = {
  lucida: "투명 소재, 로고와 글자, 일러스트, 발광 효과, 위장 배경을 가장 정밀하게 보존합니다.",
  "birefnet-hr-matting": "2048 입력으로 인물, 머리카락, 털, 부드러운 경계와 고해상도 사진을 정밀하게 처리합니다.",
  "birefnet-hr": "2048 입력으로 제품, 3D 캐릭터, 복잡한 실루엣과 다중 피사체의 경계를 선명하게 분리합니다.",
  "isnet-anime": "애니메이션과 셀 셰이딩 2D 캐릭터의 선화와 내부 구멍을 전용 체크포인트로 분리합니다.",
};

export const formatProfiles = {
  png: "투명 배경 보존",
  jpg: "일반 사진",
  webp: "웹 최적화",
  bmp: "호환성",
  tiff: "보관용",
  ico: "Windows 아이콘",
};
