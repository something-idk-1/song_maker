import { NOTE_NAMES, SCALES, type ScaleName } from "./scales";

export function midiToNoteName(midi: number): string {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

/** 예전 고정 범위 버전 — 지금은 buildScaleRows로 대체됐지만 참고용으로 남겨둠. */
export function buildNoteRows(highMidi = 84, lowMidi = 48): string[] {
  const rows: string[] = [];
  for (let midi = highMidi; midi >= lowMidi; midi -= 1) {
    rows.push(midiToNoteName(midi));
  }
  return rows;
}

/**
 * 설정 화면(Length/Scale/Start on/Range)에서 고른 값으로 그리드 행(음이름 목록)을 만듦.
 * startNote/startOctave에서 시작해서 rangeOctaves만큼 위로, 선택한 스케일에 속하는 음만 포함.
 * 배열은 높은 음이 위로 오도록 뒤집어서 반환함 (그리드 위쪽 = 높은 음).
 */
export function buildScaleRows(
  scale: ScaleName,
  startNote: string,
  startOctave: number,
  rangeOctaves: number,
): string[] {
  const intervals = SCALES[scale];
  const startIndex = NOTE_NAMES.indexOf(startNote);
  const rows: string[] = [];

  for (let oct = 0; oct <= rangeOctaves; oct += 1) {
    for (const offset of intervals) {
      // 맨 위 옥타브는 루트 음까지만 포함 (예: 2 옥타브면 시작음 포함 총 2옥타브 + 루트 하나 더)
      if (oct === rangeOctaves && offset !== 0) continue;
      const absoluteIndex = startIndex + offset;
      const name = NOTE_NAMES[absoluteIndex % 12];
      const octaveCarry = Math.floor(absoluteIndex / 12);
      rows.push(`${name}${startOctave + oct + octaveCarry}`);
    }
  }

  return rows.reverse();
}

// FL스튜디오 타이핑 키보드랑 똑같은 배치: 아랫줄(Z~M)이 한 옥타브, 윗줄(Q~I)이 그 다음 옥타브.
// 값은 시작 옥타브 기준 반음(semitone) 오프셋 — z=도(0), s=도#(1), x=레(2) ... 순서.
const TYPING_KEYBOARD_SEMITONES: Record<string, number> = {
  z: 0,
  s: 1,
  x: 2,
  d: 3,
  c: 4,
  v: 5,
  g: 6,
  b: 7,
  h: 8,
  n: 9,
  j: 10,
  m: 11,
  q: 12,
  "2": 13,
  w: 14,
  "3": 15,
  e: 16,
  r: 17,
  "5": 18,
  t: 19,
  "6": 20,
  y: 21,
  "7": 22,
  u: 23,
  i: 24,
  "9": 25,
  o: 26,
  "0": 27,
  p: 28,
  "[": 29,
  "=": 30,
  "]": 31,
};

const CHROMATIC_NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

/** 타이핑 키보드 눌렀을 때 재생할 음이름을 구함 (매핑 안 된 키면 null). baseOctave는 "Start on" 옥타브 기준. */
export function keyToNoteName(key: string, baseOctave: number): string | null {
  const semitone = TYPING_KEYBOARD_SEMITONES[key.toLowerCase()];
  if (semitone === undefined) return null;
  const noteIndex = semitone % 12;
  const octaveOffset = Math.floor(semitone / 12);
  return `${CHROMATIC_NOTE_NAMES[noteIndex]}${baseOctave + octaveOffset}`;
}

export function isCNote(noteName: string): boolean {
  return noteName.startsWith("C") && !noteName.startsWith("C#");
}

// 간단 모드에서 멜로디 스케일 행 밑에 추가되는 고정 드럼 행.
export const DRUM_ROW_LABELS = ["Kick", "Snare", "HiHat"] as const;

export function isDrumRowLabel(label: string): boolean {
  return (DRUM_ROW_LABELS as readonly string[]).includes(label);
}

/**
 * 간단 모드용 그리드 행 = 멜로디 스케일 행 + 드럼 행(Kick/Snare/HiHat).
 * 하나의 그리드에서 멜로디랑 드럼을 동시에 찍을 수 있게 함.
 */
export function buildSimpleModeRows(
  scale: ScaleName,
  startNote: string,
  startOctave: number,
  rangeOctaves: number,
): string[] {
  return [...buildScaleRows(scale, startNote, startOctave, rangeOctaves), ...DRUM_ROW_LABELS];
}
