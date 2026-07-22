// 멜로디 악기(lib/instruments.ts)랑 같은 개념을 드럼에도 적용한 것 — "비트킷".
// 고급 모드에서 비트킷 선택 팝업으로 카테고리별로 고를 수 있고(BeatKitPicker.tsx),
// 간단 모드에서는 "뮤직랩" 계열 4개(일렉트로닉/블록/킷/콩가)만 버튼 눌러서 순서대로 돌아가며 씀.
import * as Tone from "tone";

// 샘플 없는 킷(신스 비트)에서 행마다 다른 신스 엔진을 쓸 수 있게 함 — 예전엔 MembraneSynth 하나를
// 피치만 다르게 쳐서 Kick/Snare/HiHat을 흉내냈는데, 실제로는 셋이 완전히 다른 발음 방식이라
// (킥=막 진동, 스네어=노이즈+막, 하이햇=금속성 배음) 각 행에 맞는 신스 종류를 따로 줌.
export interface DrumSynthSpec {
  kind: "membrane" | "noise" | "metal";
  pitch?: string; // membrane 전용 — 기본 음높이
}

// 신스 비트 킷의 행별 신스 인스턴스 — 킥/스네어/하이햇이 서로 다른 발음 방식이라 타입이 다름.
// useSequencer(실시간 재생)랑 renderAudio(WAV 내보내기용 오프라인 렌더)가 똑같은 소리를 내야
// 해서 여기 하나로 모아두고 둘 다 이걸 씀.
export type DrumRowSynth = Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth;

export function createDrumRowSynth(spec: DrumSynthSpec): DrumRowSynth {
  if (spec.kind === "noise") {
    // 스네어 — 노이즈 버스트 + 짧은 감쇠로 "착" 하는 느낌.
    return new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0 },
    }).toDestination();
  }
  if (spec.kind === "metal") {
    // 하이햇 — 금속성 배음 여러 개를 짧게 감쇠시켜서 "치익" 하는 느낌.
    return new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).toDestination();
  }
  // membrane — 킥. 막(振動膜) 진동을 흉내내는 신스, 낮은 고정 피치로 침.
  return new Tone.MembraneSynth().toDestination();
}

export function triggerDrumRowSynth(synth: DrumRowSynth, spec: DrumSynthSpec, time?: number) {
  if (synth instanceof Tone.NoiseSynth) {
    synth.triggerAttackRelease("16n", time);
  } else if (synth instanceof Tone.MetalSynth) {
    // MetalSynth는 note(주파수)를 받긴 하지만 피치보다는 배음 세팅(harmonicity 등)이 음색을
    // 결정해서 값 자체는 크게 중요하지 않음 — 그냥 고정 주파수로 침.
    synth.triggerAttackRelease(200, "32n", time);
  } else {
    synth.triggerAttackRelease(spec.pitch ?? "C2", "16n", time);
  }
}

export type BeatKitCategory = "뮤직랩" | "기타";

export interface BeatKitDef {
  id: string;
  name: string;
  category: BeatKitCategory;
  // 위에서부터 순서대로 보여줄 행 이름.
  rowLabels: string[];
  // 행 이름 -> wav 샘플 경로. 있으면 Tone.Players로 원샷 재생.
  sampleUrls?: Record<string, string>;
  // 행 이름 -> 신스 스펙. sampleUrls가 없는 킷(신스 비트)에서만 씀.
  rowSynths?: Record<string, DrumSynthSpec>;
}

// 숫자 파일명(1.wav~N.wav)만 있는 킷 — 역할 구분 없이 이름(번호)순 그대로 행 라벨/샘플을 만듦.
function buildNumberedKit(
  id: string,
  name: string,
  category: BeatKitCategory,
  baseUrl: string,
  count: number,
): BeatKitDef {
  const rowLabels = Array.from({ length: count }, (_, i) => String(i + 1));
  const sampleUrls: Record<string, string> = {};
  rowLabels.forEach((label) => {
    sampleUrls[label] = `${baseUrl}${label}.wav`;
  });
  return { id, name, category, rowLabels, sampleUrls };
}

export const BEAT_KITS: BeatKitDef[] = [
  // --- 뮤직랩 (간단 모드에서 순서대로 순환하는 4개) ---
  {
    id: "musiclab_electronic",
    name: "일렉트로닉",
    category: "뮤직랩",
    rowLabels: ["Snare", "Kick"],
    sampleUrls: {
      Kick: "/samples/beat/musiclab_electronic/kick.wav",
      Snare: "/samples/beat/musiclab_electronic/snare.wav",
    },
  },
  {
    id: "musiclab_blocks",
    name: "블록",
    category: "뮤직랩",
    rowLabels: ["block1", "block2"],
    sampleUrls: {
      block1: "/samples/beat/musiclab_blocks/block1.wav",
      block2: "/samples/beat/musiclab_blocks/block2.wav",
    },
  },
  {
    id: "musiclab_kit",
    name: "킷",
    category: "뮤직랩",
    rowLabels: ["Snare", "Kick"],
    sampleUrls: {
      Kick: "/samples/beat/musiclab_kit/kick.wav",
      Snare: "/samples/beat/musiclab_kit/snare.wav",
    },
  },
  {
    id: "musiclab_conga",
    name: "콩가",
    category: "뮤직랩",
    rowLabels: ["conga1", "conga2"],
    sampleUrls: {
      conga1: "/samples/beat/musiclab_conga/conga1.wav",
      conga2: "/samples/beat/musiclab_conga/conga2.wav",
    },
  },
  // --- 기타 (뮤직랩 아닌 나머지 전부 여기로 묶음) ---
  {
    id: "synth-beat",
    name: "신스 비트",
    category: "기타",
    rowLabels: ["Kick", "Snare", "HiHat"],
    rowSynths: {
      Kick: { kind: "membrane", pitch: "C1" },
      Snare: { kind: "noise" },
      HiHat: { kind: "metal" },
    },
  },
  buildNumberedKit("8bitchiptune", "8비트 칩튠", "기타", "/samples/beat/8bitchiptune/", 12),
  buildNumberedKit("breakcore", "브레이크코어", "기타", "/samples/beat/breakcore/", 12),
  // jazz 폴더엔 .flp 프로젝트 파일도 하나 섞여있어서(샘플 아님) 10개(1~10)만 씀.
  buildNumberedKit("jazz", "재즈", "기타", "/samples/beat/jazz/", 10),
  {
    id: "gugak",
    name: "국악",
    category: "기타",
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

export const BEAT_KIT_CATEGORIES: BeatKitCategory[] = ["뮤직랩", "기타"];

export const DEFAULT_BEAT_KIT_ID = "musiclab_electronic";

export function getBeatKitById(id: string): BeatKitDef {
  return BEAT_KITS.find((k) => k.id === id) ?? BEAT_KITS[0];
}

// 간단 모드 전용 순환 순서 — 버튼 누를 때마다 다음 뮤직랩 킷으로 넘어감(마지막 다음엔 처음으로).
export const SIMPLE_MODE_BEAT_KIT_CYCLE = [
  "musiclab_electronic",
  "musiclab_blocks",
  "musiclab_kit",
  "musiclab_conga",
];

export function getNextSimpleModeBeatKitId(currentId: string): string {
  const currentIndex = SIMPLE_MODE_BEAT_KIT_CYCLE.indexOf(currentId);
  const nextIndex = (currentIndex + 1) % SIMPLE_MODE_BEAT_KIT_CYCLE.length;
  return SIMPLE_MODE_BEAT_KIT_CYCLE[nextIndex];
}
