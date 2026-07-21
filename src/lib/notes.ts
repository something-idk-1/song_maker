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

export function isCNote(noteName: string): boolean {
  return noteName.startsWith("C") && !noteName.startsWith("C#");
}
