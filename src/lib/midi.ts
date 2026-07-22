import { Midi } from "@tonejs/midi";
import { isDrumRowLabel, midiToNoteName } from "./notes";
import { BEAT_KITS } from "./beatKits";

// 드럼 행(Kick/Snare/블록1/장구1 등)은 실제 음이름이 아니라서, MIDI로 내보낼 때 쓸 임시 피치가 필요함.
// 예전엔 Kick/Snare/HiHat 3개만 하드코딩돼 있었는데, 비트킷이 늘어나면서(뮤직랩 블록/콩가, 8비트
// 칩튠 "1".."12", 국악 "장구1" 등) 매핑이 없는 라벨은 그대로 label 문자열을 노트 이름으로 써버려서
// (@tonejs/midi가 "block1" 같은 걸 못 알아들음) MIDI 내보내기가 깨졌었음. 지금 존재하는 모든
// 비트킷의 모든 행 라벨을 모아서 C2(미디 36)부터 반음씩 올려가며 전부 유효한 피치를 배정해둠.
// 진짜 GM 퍼커션 매핑(채널10, 노트번호 35/38/42 등)은 아니고, 그냥 구분되는 낮은 음들만 씀.
const ALL_DRUM_ROW_LABELS_ORDERED = Array.from(new Set(BEAT_KITS.flatMap((kit) => kit.rowLabels)));
export const DRUM_TRIGGER_NOTE: Record<string, string> = {};
ALL_DRUM_ROW_LABELS_ORDERED.forEach((label, i) => {
  DRUM_TRIGGER_NOTE[label] = midiToNoteName(36 + i);
});

// 그리드 한 칸 = 16분음표 하나. Tone.Sequence에서 "16n"으로 재생하는 것과 같은 기준으로 시간을 계산함.
export function stepDurationSeconds(bpm: number): number {
  const secondsPerBeat = 60 / bpm;
  return secondsPerBeat / 4;
}

interface ExportArgs {
  noteRows: string[];
  activeCells: Set<string>;
  bpm: number;
}

export function buildMidiBytes({ noteRows, activeCells, bpm }: ExportArgs): Uint8Array {
  const midi = new Midi();
  // 주의: header.tempos 배열에 직접 대입하면(예: `midi.header.tempos = [{ bpm, ticks: 0 }]`)
  // 각 tempo 항목에 .time 필드가 없는 채로 남아서, addNote가 내부적으로 호출하는
  // secondsToTicks의 이진 탐색이 절대 끝나지 않는 무한루프에 빠짐(= MIDI 내보내기 시 앱이 멈추는 버그의 원인이었음).
  // header.setTempo()를 쓰면 대입 후 내부적으로 update()를 호출해서 .time을 제대로 계산해줌.
  midi.header.setTempo(bpm);
  const track = midi.addTrack();
  const stepSec = stepDurationSeconds(bpm);

  activeCells.forEach((key) => {
    const [rowStr, stepStr] = key.split(":");
    const rowIndex = Number(rowStr);
    const stepIndex = Number(stepStr);
    const label = noteRows[rowIndex];
    if (!label) return;
    const noteName = isDrumRowLabel(label) ? (DRUM_TRIGGER_NOTE[label] ?? label) : label;
    track.addNote({
      name: noteName,
      time: stepIndex * stepSec,
      duration: stepSec * 0.9,
    });
  });

  return midi.toArray();
}

export interface ImportedNote {
  name: string;
  time: number;
  duration: number;
}

export interface ImportedMidi {
  bpm: number;
  notes: ImportedNote[];
}

export function parseMidiBytes(data: ArrayBuffer): ImportedMidi {
  const midi = new Midi(data);
  const bpm = midi.header.tempos[0]?.bpm ?? 120;
  const notes: ImportedNote[] = midi.tracks.flatMap((track) =>
    track.notes.map((note) => ({
      name: note.name,
      time: note.time,
      duration: note.duration,
    })),
  );
  return { bpm: Math.round(bpm), notes };
}

/**
 * 불러온 MIDI 노트들을 지금 그리드(noteRows/stepCount)에 맞는 "row:step" 셀 좌표로 변환함.
 * 현재 그리드에 없는 음(범위 밖 음이나 매칭 안 되는 음이름)이나 스텝 범위를 벗어나는 노트는 건너뜀 —
 * 필요하면 Length/Range 설정을 넉넉히 늘리고 다시 불러오면 더 많이 들어옴.
 */
export function midiNotesToCells(
  notes: ImportedNote[],
  noteRows: string[],
  stepCount: number,
  bpm: number,
): Set<string> {
  const stepSec = stepDurationSeconds(bpm);
  const rowIndexByName = new Map(noteRows.map((name, index) => [name, index]));
  const cells = new Set<string>();

  notes.forEach((note) => {
    const stepIndex = Math.round(note.time / stepSec);
    if (stepIndex < 0 || stepIndex >= stepCount) return;
    const rowIndex = rowIndexByName.get(note.name);
    if (rowIndex === undefined) return;
    cells.add(`${rowIndex}:${stepIndex}`);
  });

  return cells;
}
