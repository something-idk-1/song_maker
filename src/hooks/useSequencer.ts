import { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { DRUM_TRIGGER_NOTE } from "../lib/midi";
import { getInstrumentById } from "../lib/instruments";

export type Instrument = "piano" | "drum";

interface UseSequencerArgs {
  noteRows: string[];
  activeCells: Set<string>;
  stepCount: number;
  bpm: number;
  isPlaying: boolean;
  // 행(row)마다 어떤 악기로 재생할지. 고급 모드에선 전부 같은 값(피아노 또는 드럼)이고,
  // 간단 모드에선 멜로디 행은 "piano", 드럼 행(Kick/Snare/HiHat)은 "drum"으로 섞여 있음.
  rowInstruments: Instrument[];
  // 멜로디("piano" 행)에 쓸 악기 id — lib/instruments.ts 참고. 샘플 없는 동안은 신스 파형만 바뀜.
  instrumentId: string;
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
  rowInstruments,
  instrumentId,
}: UseSequencerArgs) {
  const [currentStep, setCurrentStep] = useState(0);
  const pianoSynthRef = useRef<Tone.PolySynth | null>(null);
  const drumSynthRef = useRef<Tone.MembraneSynth | null>(null);
  const sequenceRef = useRef<Tone.Sequence | null>(null);

  // 재생 중에 노트를 찍으면 activeCells가 바뀌는데, 이걸 시퀀스 재생성 effect의 의존성에
  // 넣으면(예전 방식) 재생 중에도 시퀀스가 dispose+재생성되고 다시 start()를 안 해줘서
  // 소리가 멈추는 버그가 있었음. 그래서 최신 activeCells/rowInstruments는 ref로만 들고,
  // 콜백 안에서 ref.current를 읽게 해서 시퀀스 자체는 재생 중엔 안 건드리게 함.
  const activeCellsRef = useRef(activeCells);
  useEffect(() => {
    activeCellsRef.current = activeCells;
  }, [activeCells]);

  const rowInstrumentsRef = useRef(rowInstruments);
  useEffect(() => {
    rowInstrumentsRef.current = rowInstruments;
  }, [rowInstruments]);

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

  // 악기 선택이 바뀌면 신스를 새로 만들지 않고(재생 중 끊기지 않게) 파형/엔벨로프만 갈아끼움.
  useEffect(() => {
    const def = getInstrumentById(instrumentId);
    pianoSynthRef.current?.set({
      oscillator: { type: def.synth.oscillatorType },
      envelope: def.synth.envelope,
    });
  }, [instrumentId]);

  const triggerRow = (rowIndex: number, noteName: string, time?: number) => {
    const kind = rowInstrumentsRef.current[rowIndex] ?? "piano";
    if (kind === "piano") {
      pianoSynthRef.current?.triggerAttackRelease(noteName, "16n", time);
    } else {
      const drumPitch = DRUM_TRIGGER_NOTE[noteName] ?? noteName;
      drumSynthRef.current?.triggerAttackRelease(drumPitch, "16n", time);
    }
  };

  // 클릭/드래그로 노트를 찍을 때 바로 소리를 들려주기 위한 미리듣기 함수.
  const previewNote = useCallback((rowIndex: number, noteName: string) => {
    Tone.start().then(() => triggerRow(rowIndex, noteName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FL스튜디오처럼 키보드(z,s,x...)로 건반 미리듣기 할 때 씀 — 그리드 행이랑 무관하게 항상 피아노 소리.
  const previewPianoNote = useCallback((noteName: string) => {
    Tone.start().then(() => pianoSynthRef.current?.triggerAttackRelease(noteName, "16n"));
  }, []);

  // noteRows/stepCount(그리드 구조)가 바뀔 때만 시퀀스를 다시 만듦.
  // 노트를 찍고 지우는 건 activeCellsRef를 통해 반영되므로 재생 중에도 끊기지 않음.
  useEffect(() => {
    const steps = Array.from({ length: stepCount }, (_, i) => i);
    const wasPlaying = isPlaying;

    const sequence = new Tone.Sequence(
      (time, step: number) => {
        noteRows.forEach((noteName, rowIndex) => {
          if (!activeCellsRef.current.has(cellKey(rowIndex, step))) return;
          triggerRow(rowIndex, noteName, time);
        });
        Tone.Draw.schedule(() => setCurrentStep(step), time);
      },
      steps,
      "16n",
    );

    sequenceRef.current = sequence;

    // noteRows/stepCount가 바뀔 때(예: 설정 변경)는 시퀀스를 새로 만들었으니,
    // 그 시점에 이미 재생 중이었다면 새 시퀀스도 이어서 재생되게 시작해줌.
    if (wasPlaying) {
      sequence.start(0);
    }

    return () => {
      sequence.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteRows, stepCount]);

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

  return { currentStep, previewNote, previewPianoNote };
}
