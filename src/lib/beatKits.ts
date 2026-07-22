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

export type BeatKitCategory = "Music Lab" | "Other";

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

// 실제 파일명이 제각각(공백/이모지 포함)인 킷용 — 화면에 보여줄 라벨과 실제 디스크 파일명을
// 따로 매핑해줌. 파일명은 encodeURIComponent로 인코딩해서 URL에 넣음 — 공백이나 이모지가
// 그대로 들어가면 브라우저/서버에 따라 fetch가 깨질 수 있어서(예전에 '#' 문자로 한 번 겪음) 안전하게 처리.
function buildNamedKit(
  id: string,
  name: string,
  category: BeatKitCategory,
  baseUrl: string,
  files: { label: string; file: string }[],
): BeatKitDef {
  const rowLabels = files.map((f) => f.label);
  const sampleUrls: Record<string, string> = {};
  files.forEach(({ label, file }) => {
    sampleUrls[label] = `${baseUrl}${encodeURIComponent(file)}`;
  });
  return { id, name, category, rowLabels, sampleUrls };
}

// "something" 킷 — 밈/효과음 원샷 모음. 파일명이 공백 있는 것도 있고 이모지 파일명도 있어서
// buildNamedKit으로 라벨<->실제 파일명을 따로 매핑함.
const SOMETHING_FILES: { label: string; file: string }[] = [
  { label: "FAH", file: "FAH.wav" },
  { label: "GETOUT", file: "GETOUT.wav" },
  { label: "Baby Explode", file: "baby explode.wav" },
  { label: "Cat Laugh", file: "catlaugh.wav" },
  { label: "Chomp", file: "chomp.wav" },
  { label: "Clock", file: "clock.wav" },
  { label: "Discord", file: "discord.wav" },
  { label: "Dwuh Bluetooth", file: "dwuh bluetooth.wav" },
  { label: "Fart", file: "fart.wav" },
  { label: "France", file: "france.wav" },
  { label: "Hey", file: "hey.wav" },
  { label: "Inib", file: "inib.wav" },
  { label: "KakaoTalk", file: "kakaotalk.wav" },
  { label: "Level Up", file: "levelup.wav" },
  { label: "Metal Pipe", file: "metalpipe.wav" },
  { label: "Missing", file: "missing.wav" },
  { label: "Oof", file: "oof.wav" },
  { label: "Op", file: "op.wav" },
  { label: "Parry", file: "parry.wav" },
  { label: "Sans", file: "sans.wav" },
  { label: "Sound", file: "sound.wav" },
  { label: "Staggered", file: "staggered.wav" },
  { label: "Teemo", file: "teemo.wav" },
  { label: "Tungtungtung", file: "tungtungtung.wav" },
  { label: "Win XP", file: "winxp.wav" },
  { label: "Yippee", file: "yippee.wav" },
  { label: "🗿", file: "🗿.wav" },
];

export const BEAT_KITS: BeatKitDef[] = [
  // --- Music Lab (the 4 that cycle in order in simple mode) ---
  {
    id: "musiclab_electronic",
    name: "Electronic",
    category: "Music Lab",
    rowLabels: ["Snare", "Kick"],
    sampleUrls: {
      Kick: "/samples/beat/musiclab_electronic/kick.wav",
      Snare: "/samples/beat/musiclab_electronic/snare.wav",
    },
  },
  {
    id: "musiclab_blocks",
    name: "Blocks",
    category: "Music Lab",
    rowLabels: ["block1", "block2"],
    sampleUrls: {
      block1: "/samples/beat/musiclab_blocks/block1.wav",
      block2: "/samples/beat/musiclab_blocks/block2.wav",
    },
  },
  {
    id: "musiclab_kit",
    name: "Kit",
    category: "Music Lab",
    rowLabels: ["Snare", "Kick"],
    sampleUrls: {
      Kick: "/samples/beat/musiclab_kit/kick.wav",
      Snare: "/samples/beat/musiclab_kit/snare.wav",
    },
  },
  {
    id: "musiclab_conga",
    name: "Conga",
    category: "Music Lab",
    rowLabels: ["conga1", "conga2"],
    sampleUrls: {
      conga1: "/samples/beat/musiclab_conga/conga1.wav",
      conga2: "/samples/beat/musiclab_conga/conga2.wav",
    },
  },
  // --- Other (everything that isn't Music Lab) ---
  {
    id: "synth-beat",
    name: "Synth Beat",
    category: "Other",
    rowLabels: ["Kick", "Snare", "HiHat"],
    rowSynths: {
      Kick: { kind: "membrane", pitch: "C1" },
      Snare: { kind: "noise" },
      HiHat: { kind: "metal" },
    },
  },
  buildNumberedKit("8bitchiptune", "8-bit Chiptune", "Other", "/samples/beat/8bitchiptune/", 12),
  buildNumberedKit("breakcore", "Breakcore", "Other", "/samples/beat/breakcore/", 12),
  // jazz 폴더엔 .flp 프로젝트 파일도 하나 섞여있어서(샘플 아님) 10개(1~10)만 씀.
  buildNumberedKit("jazz", "Jazz", "Other", "/samples/beat/jazz/", 10),
  {
    id: "gugak",
    name: "Gugak",
    category: "Other",
    rowLabels: ["Janggu 1", "Janggu 2", "Jing", "Jwago", "Kkwaenggwari", "Kkwaenggwari 2", "Kkwaenggwari 3"],
    sampleUrls: {
      "Janggu 1": "/samples/beat/gugak/janggu1.wav",
      "Janggu 2": "/samples/beat/gugak/janggu2.wav",
      "Jing": "/samples/beat/gugak/jing.wav",
      "Jwago": "/samples/beat/gugak/jwago.wav",
      "Kkwaenggwari": "/samples/beat/gugak/kkwaenggwari.wav",
      "Kkwaenggwari 2": "/samples/beat/gugak/kkwaenggwari2.wav",
      "Kkwaenggwari 3": "/samples/beat/gugak/kkwaenggwari3.wav",
    },
  },
  buildNamedKit("something", "Something", "Other", "/samples/beat/something/", SOMETHING_FILES),
];

export const BEAT_KIT_CATEGORIES: BeatKitCategory[] = ["Music Lab", "Other"];

export const DEFAULT_BEAT_KIT_ID = "musiclab_electronic";

export function getBeatKitById(id: string): BeatKitDef {
  return BEAT_KITS.find((k) => k.id === id) ?? BEAT_KITS[0];
}

// instruments.ts의 getInstrumentDisplayName이랑 같은 패턴 — 킷/카테고리 이름 자체(BeatKitDef.name,
// BeatKitCategory)는 항상 영어(App.tsx의 category === "Music Lab" 비교 등에 쓰임)라서, 한국어
// 설정일 때 화면에 보여줄 한글 이름은 따로 여기서 관리함.
const BEAT_KIT_NAME_KO: Record<string, string> = {
  musiclab_electronic: "일렉트로닉",
  musiclab_blocks: "블록",
  musiclab_kit: "킷",
  musiclab_conga: "콩가",
  "synth-beat": "신스 비트",
  "8bitchiptune": "8비트 칩튠",
  breakcore: "브레이크코어",
  jazz: "재즈",
  gugak: "국악",
  something: "밈 사운드",
};

const BEAT_KIT_CATEGORY_LABEL_KO: Record<BeatKitCategory, string> = {
  "Music Lab": "뮤직랩",
  Other: "기타",
};

export function getBeatKitDisplayName(kit: BeatKitDef, language: "en" | "ko"): string {
  if (language === "ko") return BEAT_KIT_NAME_KO[kit.id] ?? kit.name;
  return kit.name;
}

export function getBeatKitCategoryLabel(category: BeatKitCategory, language: "en" | "ko"): string {
  if (language === "ko") return BEAT_KIT_CATEGORY_LABEL_KO[category] ?? category;
  return category;
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
