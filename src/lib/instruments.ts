// 실제 wav 샘플이 붙기 전까지는 Tone.Synth의 파형/엔벨로프만 바꿔서 악기별로 소리 차이를 흉내냄.
// 나중에 진짜 샘플이 들어오면 이 설정 대신 Tone.Sampler({ urls: {...} })로 교체하면 됨
// (AGENT.md/useSequencer.ts에 이미 적어둔 TODO 참고).
export type OscillatorType = "sine" | "triangle" | "square" | "sawtooth";

export interface InstrumentSynthParams {
  oscillatorType: OscillatorType;
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

export type InstrumentCategory = "오케스트라" | "국악" | "신스" | "8비트" | "마인크래프트" | "기타";

export interface InstrumentDef {
  id: string;
  name: string;
  category: InstrumentCategory;
  synth: InstrumentSynthParams;
  /** 실제 wav 샘플 폴더 (public 기준 경로). 있으면 Tone.Sampler로, 없으면 위 synth 파형으로 재생함. */
  sampleBaseUrl?: string;
  /** 국악기처럼 아직 진짜 음색이 없는 경우 표시할 안내 문구 */
  note?: string;
  /**
   * 이 악기만 따로 볼륨을 조절하고 싶을 때 씀. 100 = 원본 그대로, 90 = 원본 대비 90% 크기(더 작게).
   * 생략하면 100(원본)으로 취급함. Tone.js Sampler/Synth의 volume은 dB 단위라서
   * useSequencer.ts에서 20*log10(volumePercent/100)으로 변환해서 넣어줌.
   */
  volumePercent?: number;
}

// 샘플 파일명 규칙: 옥타브당 4개(단3도 간격) — C, D#, F#, A — 로 녹음해서 줌.
// 실제로 준비된 옥타브 범위는 악기별로 다를 수 있어서 SAMPLE_OCTAVES에서 관리함.
export const SAMPLE_ANCHOR_NOTES = ["C", "D#", "F#", "A"] as const;
export const SAMPLE_OCTAVES = [4, 5, 6] as const;

export const INSTRUMENTS: InstrumentDef[] = [
  // --- 오케스트라 ---
  {
    id: "piano",
    name: "피아노",
    category: "오케스트라",
    synth: { oscillatorType: "triangle", envelope: { attack: 0.005, decay: 0.3, sustain: 0.2, release: 0.8 } },
    sampleBaseUrl: "/samples/melodies/orchestra/piano/",
  },
  {
    id: "musicbox",
    name: "뮤직박스",
    category: "오케스트라",
    synth: { oscillatorType: "sine", envelope: { attack: 0.001, decay: 0.4, sustain: 0.05, release: 1.2 } },
    sampleBaseUrl: "/samples/melodies/orchestra/musicBox/",
  },
  {
    id: "marimba",
    name: "마림바",
    category: "오케스트라",
    synth: { oscillatorType: "sine", envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.3 } },
    sampleBaseUrl: "/samples/melodies/orchestra/marimba/",
  },
  {
    id: "xylophone",
    name: "실로폰",
    category: "오케스트라",
    synth: { oscillatorType: "sine", envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 } },
    sampleBaseUrl: "/samples/melodies/orchestra/xylophone/",
  },
  {
    id: "strings",
    name: "바이올린",
    category: "오케스트라",
    synth: { oscillatorType: "sawtooth", envelope: { attack: 0.2, decay: 0.2, sustain: 0.6, release: 1 } },
    sampleBaseUrl: "/samples/melodies/orchestra/violin/",
  },
  {
    id: "woodwind",
    name: "플루트",
    category: "오케스트라",
    synth: { oscillatorType: "square", envelope: { attack: 0.08, decay: 0.15, sustain: 0.5, release: 0.4 } },
    sampleBaseUrl: "/samples/melodies/orchestra/flute/",
  },
  // --- 국악(Gugak) ---
  {
    id: "gayageum",
    name: "가야금",
    category: "국악",
    synth: { oscillatorType: "triangle", envelope: { attack: 0.001, decay: 0.6, sustain: 0, release: 0.4 } },
    sampleBaseUrl: "/samples/melodies/gugak/gayageum/",
  },
  {
    id: "danso",
    name: "단소",
    category: "국악",
    synth: { oscillatorType: "sine", envelope: { attack: 0.1, decay: 0.1, sustain: 0.6, release: 0.5 } },
    sampleBaseUrl: "/samples/melodies/gugak/danso/",
  },
  {
    id: "haegeum",
    name: "해금",
    category: "국악",
    synth: { oscillatorType: "sawtooth", envelope: { attack: 0.15, decay: 0.2, sustain: 0.5, release: 0.6 } },
    sampleBaseUrl: "/samples/melodies/gugak/hageum/",
  },
  // --- 신스 ---
  {
    // 지금 마림바가 샘플 없을 때 대체로 쓰던 것과 같은 짧고 통통 튀는 sine 신스.
    // 마림바 실제 샘플이 들어오면 marimba 항목은 sampleBaseUrl로 교체되고, 이 소리는
    // 독립된 신스 악기로 계속 남음.
    id: "synth-pluck",
    name: "신스 플럭",
    category: "신스",
    synth: { oscillatorType: "sine", envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.3 } },
  },
  {
    id: "synth-strings",
    name: "신스 스트링",
    category: "신스",
    synth: { oscillatorType: "sawtooth", envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.6 } },
  },
  {
    id: "synth-lead",
    name: "신스 리드",
    category: "신스",
    synth: { oscillatorType: "square", envelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.2 } },
  },
  // --- 기타(etc) ---
  {
    id: "glass",
    name: "글라스",
    category: "기타",
    synth: { oscillatorType: "sine", envelope: { attack: 0.01, decay: 0.6, sustain: 0.1, release: 1.5 } },
    sampleBaseUrl: "/samples/melodies/etc/glass/",
  },
  {
    id: "darkslateblue",
    name: "darkslateblue",
    category: "기타",
    synth: { oscillatorType: "sine", envelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 0.8 } },
    sampleBaseUrl: "/samples/melodies/etc/darkslateblue/",
  },
  {
    id: "tungtungtung",
    name: "tungtungtung",
    category: "기타",
    synth: { oscillatorType: "triangle", envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.2 } },
    sampleBaseUrl: "/samples/melodies/etc/tungtungtung/",
  },
  {
    id: "inferno",
    name: "인페르노",
    category: "기타",
    synth: { oscillatorType: "sawtooth", envelope: { attack: 0.01, decay: 0.4, sustain: 0.3, release: 0.6 } },
    sampleBaseUrl: "/samples/melodies/etc/inferno/",
  },
  // --- 마인크래프트(노트블록) ---
  {
    id: "mc-banjo",
    name: "밴조",
    category: "마인크래프트",
    synth: { oscillatorType: "triangle", envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.3 } },
    sampleBaseUrl: "/samples/melodies/minecraft/banjo/",
  },
  {
    id: "mc-bell",
    name: "벨",
    category: "마인크래프트",
    synth: { oscillatorType: "sine", envelope: { attack: 0.001, decay: 0.6, sustain: 0, release: 1 } },
    sampleBaseUrl: "/samples/melodies/minecraft/bell/",
  },
  {
    id: "mc-cowbell",
    name: "카우벨",
    category: "마인크래프트",
    synth: { oscillatorType: "square", envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 } },
    sampleBaseUrl: "/samples/melodies/minecraft/cowBell/",
  },
  {
    id: "mc-exp",
    name: "경험치",
    category: "마인크래프트",
    synth: { oscillatorType: "sine", envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.4 } },
    sampleBaseUrl: "/samples/melodies/minecraft/exp/",
  },
  {
    id: "mc-guitar",
    name: "어쿠스틱 기타",
    category: "마인크래프트",
    synth: { oscillatorType: "triangle", envelope: { attack: 0.005, decay: 0.4, sustain: 0.1, release: 0.5 } },
    sampleBaseUrl: "/samples/melodies/minecraft/guitar/",
  },
  {
    id: "mc-harp",
    name: "하프",
    category: "마인크래프트",
    synth: { oscillatorType: "sine", envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.6 } },
    sampleBaseUrl: "/samples/melodies/minecraft/harp/",
  },
  {
    id: "mc-xylobone",
    name: "자일로폰",
    category: "마인크래프트",
    synth: { oscillatorType: "sine", envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.2 } },
    sampleBaseUrl: "/samples/melodies/minecraft/xylobone/",
  },
  // --- 8비트 ---
  {
    id: "square12",
    name: "square(12)",
    category: "8비트",
    synth: { oscillatorType: "square", envelope: { attack: 0.001, decay: 0.1, sustain: 0.2, release: 0.1 } },
    sampleBaseUrl: "/samples/melodies/8bit/square(12)/",
    volumePercent: 90,
  },
  {
    id: "square25",
    name: "square(25)",
    category: "8비트",
    synth: { oscillatorType: "square", envelope: { attack: 0.001, decay: 0.1, sustain: 0.3, release: 0.1 } },
    sampleBaseUrl: "/samples/melodies/8bit/square(25)/",
  },
  {
    id: "square50",
    name: "square(50)",
    category: "8비트",
    synth: { oscillatorType: "square", envelope: { attack: 0.001, decay: 0.1, sustain: 0.5, release: 0.1 } },
    sampleBaseUrl: "/samples/melodies/8bit/square(50)/",
  },
  {
    id: "8bit-triangle",
    name: "triangle",
    category: "8비트",
    synth: { oscillatorType: "triangle", envelope: { attack: 0.001, decay: 0.1, sustain: 0.4, release: 0.1 } },
    sampleBaseUrl: "/samples/melodies/8bit/triangle/",
  },
];

// 악기 선택 팝업 카테고리 순서 — 카테고리가 계속 늘어나서(마인크래프트 추가 등) 이제 2열 그리드
// 대신 한 줄에 카테고리 하나씩 세로로 쌓는 레이아웃을 씀(InstrumentPicker.tsx 참고).
export const INSTRUMENT_CATEGORIES: InstrumentCategory[] = [
  "오케스트라",
  "신스",
  "8비트",
  "국악",
  "마인크래프트",
  "기타",
];

export function getInstrumentById(id: string): InstrumentDef {
  return INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0];
}

// 간단 모드 전용 악기 순환 순서. 팝업으로 고르는 대신 버튼 한 번 누를 때마다 여기 순서대로
// 다음 악기로 넘어감(마지막 다음엔 다시 처음=마림바로 돌아옴). 기본값도 마림바로 시작함.
export const SIMPLE_MODE_INSTRUMENT_CYCLE = ["marimba", "piano", "strings", "woodwind", "synth-lead"];

export function getNextSimpleModeInstrumentId(currentId: string): string {
  const currentIndex = SIMPLE_MODE_INSTRUMENT_CYCLE.indexOf(currentId);
  const nextIndex = (currentIndex + 1) % SIMPLE_MODE_INSTRUMENT_CYCLE.length;
  return SIMPLE_MODE_INSTRUMENT_CYCLE[nextIndex];
}

/**
 * Tone.Sampler에 넘길 { 음이름: 전체 경로 } 맵을 만듦. 샘플이 없는 악기면 null.
 *
 * 파일명은 '#' 대신 's'로 씀 (예: D#4 -> Ds4.wav) — '#'을 %23으로 인코딩해서 fetch해봤더니
 * Vite dev 서버가 그 경로를 못 찾고 대신 index.html(SPA 폴백)을 200으로 돌려줘서
 * Tone.Sampler가 그걸 오디오로 디코딩하려다 실패하는 문제가 있었음. 's' 표기가 훨씬 안전함.
 *
 * baseUrl 옵션 대신 매 값마다 루트 기준 절대경로(예: "/samples/melodies/piano/C4.wav")를
 * 통째로 넣음 — Tone.Sampler가 내부적으로 baseUrl + value를 new URL()로 합칠 때 baseUrl이
 * "/"로 시작하는 경로 문자열이면 절대 URL이 아니라서 제대로 안 합쳐지는 경우가 있었음.
 */
export function getInstrumentSampleUrls(id: string): Record<string, string> | null {
  const def = getInstrumentById(id);
  if (!def.sampleBaseUrl) return null;

  const urls: Record<string, string> = {};
  for (const octave of SAMPLE_OCTAVES) {
    for (const note of SAMPLE_ANCHOR_NOTES) {
      const name = `${note}${octave}`; // Tone.js에 줄 실제 음이름 (예: "D#4") — 이건 그대로 둠
      const fileStem = name.replace("#", "s"); // 파일명은 샵 대신 s (예: "Ds4")
      urls[name] = `${def.sampleBaseUrl}${fileStem}.wav`;
    }
  }
  return urls;
}
