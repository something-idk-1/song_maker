// 멜로디 악기(lib/instruments.ts)랑 같은 개념을 드럼에도 적용한 것 — "비트킷".
// 지금은 킷을 고르는 UI가 없어서 항상 DEFAULT_BEAT_KIT_ID(뮤직랩 기본)만 쓰지만,
// 나중에 고급 모드에서 비트킷을 선택할 수 있게 만들 때 이 구조를 그대로 재사용하면 됨.
// (여긴 멜로디 악기 팝업처럼 카테고리로 묶지 않고 그냥 평평한 목록으로 둘 예정.)

// 샘플 없는 킷(신스 비트)에서 행마다 다른 신스 엔진을 쓸 수 있게 함 — 예전엔 MembraneSynth 하나를
// 피치만 다르게 쳐서 Kick/Snare/HiHat을 흉내냈는데, 실제로는 셋이 완전히 다른 발음 방식이라
// (킥=막 진동, 스네어=노이즈+막, 하이햇=금속성 배음) 각 행에 맞는 신스 종류를 따로 줌.
export interface DrumSynthSpec {
  kind: "membrane" | "noise" | "metal";
  pitch?: string; // membrane 전용 — 기본 음높이
}

export interface BeatKitDef {
  id: string;
  name: string;
  // 위에서부터 순서대로 보여줄 행 이름.
  rowLabels: string[];
  // 행 이름 -> wav 샘플 경로. 있으면 Tone.Players로 원샷 재생.
  sampleUrls?: Record<string, string>;
  // 행 이름 -> 신스 스펙. sampleUrls가 없는 킷(신스 비트)에서만 씀.
  rowSynths?: Record<string, DrumSynthSpec>;
}

// 숫자 파일명(1.wav~N.wav)만 있는 킷 — 역할 구분 없이 이름(번호)순 그대로 행 라벨/샘플을 만듦.
function buildNumberedKit(id: string, name: string, baseUrl: string, count: number): BeatKitDef {
  const rowLabels = Array.from({ length: count }, (_, i) => String(i + 1));
  const sampleUrls: Record<string, string> = {};
  rowLabels.forEach((label) => {
    sampleUrls[label] = `${baseUrl}${label}.wav`;
  });
  return { id, name, rowLabels, sampleUrls };
}

export const BEAT_KITS: BeatKitDef[] = [
  {
    id: "musiclab_default",
    name: "뮤직랩 기본",
    rowLabels: ["Kick", "Snare"],
    sampleUrls: {
      Kick: "/samples/beat/musiclab_default/kick.wav",
      Snare: "/samples/beat/musiclab_default/snare.wav",
    },
  },
  {
    id: "synth-beat",
    name: "신스 비트",
    rowLabels: ["Kick", "Snare", "HiHat"],
    rowSynths: {
      Kick: { kind: "membrane", pitch: "C1" },
      Snare: { kind: "noise" },
      HiHat: { kind: "metal" },
    },
  },
  buildNumberedKit("8bitchiptune", "8비트 칩튠", "/samples/beat/8bitchiptune/", 12),
  buildNumberedKit("breakcore", "브레이크코어", "/samples/beat/breakcore/", 12),
  // jazz 폴더엔 .flp 프로젝트 파일도 하나 섞여있어서(샘플 아님) 10개(1~10)만 씀.
  buildNumberedKit("jazz", "재즈", "/samples/beat/jazz/", 10),
  {
    id: "gugak",
    name: "국악",
    rowLabels: ["장구1", "장구2", "징", "좌고", "꽹과리", "꽹과리2", "꽹과리3"],
    sampleUrls: {
      "장구1": "/samples/beat/gugak/janggu1.wav",
      "장구2": "/samples/beat/gugak/janggu2.wav",
      "징": "/samples/beat/gugak/jing.wav",
      "좌고": "/samples/beat/gugak/jwago.wav",
      "꽹과리": "/samples/beat/gugak/kkwaenggwari.wav",
      "꽹과리2": "/samples/beat/gugak/kkwaenggwari2.wav",
      "꽹과리3": "/samples/beat/gugak/kkwaenggwari3.wav",
    },
  },
];

export const DEFAULT_BEAT_KIT_ID = "musiclab_default";

export function getBeatKitById(id: string): BeatKitDef {
  return BEAT_KITS.find((k) => k.id === id) ?? BEAT_KITS[0];
}
