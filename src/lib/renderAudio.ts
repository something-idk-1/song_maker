import * as Tone from "tone";
import { DRUM_TRIGGER_NOTE, stepDurationSeconds } from "./midi";
import type { Instrument } from "../hooks/useSequencer";

interface RenderArgs {
  noteRows: string[];
  activeCells: Set<string>;
  rowInstruments: Instrument[];
  stepCount: number;
  bpm: number;
}

/**
 * 실제로 재생 중인 라이브 신스가 아니라, Tone.Offline으로 완전히 별도의(오프라인) 오디오 컨텍스트에서
 * 똑같은 노트들을 다시 스케줄링해서 렌더링함. 이렇게 해야 실시간 재생 속도와 무관하게, 그리고 스피커로
 * 소리를 실제로 재생하지 않고도 오디오 데이터를 뽑아낼 수 있음(WAV 내보내기용).
 */
export async function renderToAudioBuffer({
  noteRows,
  activeCells,
  rowInstruments,
  stepCount,
  bpm,
}: RenderArgs): Promise<AudioBuffer> {
  const stepSec = stepDurationSeconds(bpm);
  const totalDuration = stepCount * stepSec + 1; // 마지막 노트 꼬리(release)까지 여유 1초 추가

  const rendered = await Tone.Offline(() => {
    const pianoSynth = new Tone.PolySynth(Tone.Synth).toDestination();
    const drumSynth = new Tone.MembraneSynth().toDestination();

    activeCells.forEach((key) => {
      const [rowStr, stepStr] = key.split(":");
      const rowIndex = Number(rowStr);
      const stepIndex = Number(stepStr);
      const noteName = noteRows[rowIndex];
      if (!noteName) return;
      const kind = rowInstruments[rowIndex] ?? "piano";
      const time = stepIndex * stepSec;

      if (kind === "piano") {
        pianoSynth.triggerAttackRelease(noteName, "16n", time);
      } else {
        const pitch = DRUM_TRIGGER_NOTE[noteName] ?? noteName;
        drumSynth.triggerAttackRelease(pitch, "16n", time);
      }
    });
  }, totalDuration);

  return rendered.get() as AudioBuffer;
}
