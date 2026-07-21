import { Midi } from "@tonejs/midi";
import { isDrumRowLabel } from "./notes";

// 드럼 행(Kick/Snare/HiHat)은 실제 음이름이 아니라서, MIDI로 내보낼 때 쓸 임시 피치.
// 진짜 GM 퍼커션 매핑(채널10, 노트번호 35/38/42 등)은 아니고, 그냥 구분되는 낮은 음 몇 개만 씀.
export const DRUM_TRIGGER_NOTE: Record<string, string> = {
  Kick: "C2",
  Snare: "D2",
  HiHat: "F#2",
};

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
  // @tonejs/midi 버전마다 header.setTempo 유무가 달라서, tempos 배열에 직접 넣는 방식으로 안전하게 처리함.
  midi.header.tempos = [{ bpm, ticks: 0 }];
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
