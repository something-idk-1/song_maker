import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";

export type Instrument = "piano" | "drum";

interface UseSequencerArgs {
  noteRows: string[];
  activeCells: Set<string>;
  stepCount: number;
  bpm: number;
  isPlaying: boolean;
  instrument: Instrument;
}

// 셀 키는 "행인덱스:스텝인덱스" 형태로 저장함 (예: "3:7").
export function cellKey(rowIndex: number, stepIndex: number): string {
  return `${rowIndex}:${stepIndex}`;
}

/**
 * 오디오 스케줄링 훅.
 *
 * 왜 setTimeout이 아니라 Tone.Sequence를 쓰는가:
 * setTimeout/setInterval은 브라우저 메인 스레드 지연에 취약해서 박자가 밀린다.
 * Tone.js의 Transport + Sequence는 Web Audio의 정밀한 클럭을 기준으로 스케줄링하기 때문에
 * 메인 스레드가 바쁘더라도 오디오 타이밍이 흔들리지 않는다.
 *
 * TODO: 지금은 기본 신스(Tone.PolySynth / Tone.MembraneSynth)로 소리를 냄.
 * 실제 wav 샘플이 준비되면 아래 synthRef 생성부를 Tone.Sampler로 교체하면 됨:
 *   new Tone.Sampler({ urls: { C4: "C4.wav", ... }, baseUrl: "/samples/piano/" })
 */
export function useSequencer({
  noteRows,
  activeCells,
  stepCount,
  bpm,
  isPlaying,
  instrument,
}: UseSequencerArgs) {
  const [currentStep, setCurrentStep] = useState(0);
  const pianoSynthRef = useRef<Tone.PolySynth | null>(null);
  const drumSynthRef = useRef<Tone.MembraneSynth | null>(null);
  const sequenceRef = useRef<Tone.Sequence | null>(null);

  // 신스는 한 번만 생성 (매 렌더마다 새로 만들면 노드가 계속 쌓임)
  useEffect(() => {
    pianoSynthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
    drumSynthRef.current = new Tone.MembraneSynth().toDestination();
    return () => {
      pianoSynthRef.current?.dispose();
      drumSynthRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // activeCells/noteRows/instrument가 바뀔 때마다 시퀀스를 다시 만들어서 최신 그리드 상태를 반영함.
  useEffect(() => {
    const steps = Array.from({ length: stepCount }, (_, i) => i);

    const sequence = new Tone.Sequence(
      (time, step: number) => {
        noteRows.forEach((noteName, rowIndex) => {
          if (!activeCells.has(cellKey(rowIndex, step))) return;
          if (instrument === "piano") {
            pianoSynthRef.current?.triggerAttackRelease(noteName, "16n", time);
          } else {
            drumSynthRef.current?.triggerAttackRelease(noteName, "16n", time);
          }
        });
        // UI 업데이트는 Tone.Draw로 오디오 클럭에 맞춰 다음 애니메이션 프레임에 실행함.
        Tone.Draw.schedule(() => setCurrentStep(step), time);
      },
      steps,
      "16n",
    );

    sequenceRef.current = sequence;
    return () => {
      sequence.dispose();
    };
  }, [activeCells, noteRows, stepCount, instrument]);

  useEffect(() => {
    if (!isPlaying) {
      Tone.Transport.stop();
      sequenceRef.current?.stop(0);
      setCurrentStep(0);
      return;
    }

    Tone.start().then(() => {
      sequenceRef.current?.start(0);
      Tone.Transport.start();
    });

    return () => {
      Tone.Transport.stop();
      sequenceRef.current?.stop(0);
    };
  }, [isPlaying]);

  return { currentStep };
}
