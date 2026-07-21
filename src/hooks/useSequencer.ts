import { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { DRUM_TRIGGER_NOTE } from "../lib/midi";
import { getInstrumentById, getInstrumentSampleUrls } from "../lib/instruments";
import { DEFAULT_BEAT_KIT_ID, getBeatKitById, type BeatKitDef, type DrumSynthSpec } from "../lib/beatKits";

// 신스 비트 킷의 행별 신스 인스턴스 — 킥/스네어/하이햇이 서로 다른 발음 방식이라 타입이 다름.
type DrumRowSynth = Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth;

function createDrumRowSynth(spec: DrumSynthSpec): DrumRowSynth {
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

function triggerDrumRowSynth(synth: DrumRowSynth, spec: DrumSynthSpec, time?: number) {
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

// Sampler든 PolySynth든 우리가 쓰는 메서드(triggerAttackRelease)는 동일해서 하나의 타입으로 다룸.
type MelodyVoice = Tone.PolySynth | Tone.Sampler;

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
  // 전체 마스터 볼륨(0~100, 100=원본 그대로). Tone.Destination.volume(dB)으로 변환해서 적용함.
  masterVolumePercent: number;
  // 드럼 행에 쓸 비트킷 id — lib/beatKits.ts 참고. 지금은 고를 UI가 없어서 항상 기본값(뮤직랩 기본)만 옴.
  beatKitId?: string;
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
 * 멜로디 보이스는 악기별로 실제 wav 샘플이 있으면 Tone.Sampler, 없으면 Tone.Synth를 씀
 * (lib/instruments.ts의 sampleBaseUrl 유무로 결정). 드럼은 비트킷(lib/beatKits.ts)에 따라
 * 실제 샘플이나 행별 신스로 재생됨.
 */
export function useSequencer({
  noteRows,
  activeCells,
  stepCount,
  bpm,
  isPlaying,
  rowInstruments,
  instrumentId,
  masterVolumePercent,
  beatKitId = DEFAULT_BEAT_KIT_ID,
}: UseSequencerArgs) {
  const [currentStep, setCurrentStep] = useState(0);
  const pianoSynthRef = useRef<MelodyVoice | null>(null);
  const drumSynthRef = useRef<Tone.MembraneSynth | null>(null);
  // 비트킷이 실제 샘플을 갖고 있으면(뮤직랩 기본) 이 Players로 재생하고, 없으면(신스 비트)
  // 아래 drumRowSynthsRef(행별 신스)로 대체 재생함. triggerRow는 Tone.Sequence의 오래된 클로저
  // 안에서 불려서 최신 값을 못 보므로, activeCellsRef 패턴처럼 ref로 최신 킷을 들고 있음.
  const drumPlayersRef = useRef<Tone.Players | null>(null);
  // 킷이 rowSynths를 갖고 있으면(신스 비트) 행 이름 -> 그 행 전용 신스 인스턴스로 여기 채워짐.
  const drumRowSynthsRef = useRef<Map<string, DrumRowSynth>>(new Map());
  const beatKitRef = useRef<BeatKitDef>(getBeatKitById(beatKitId));
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

  // 드럼 신스는 한 번만 생성 (매 렌더마다 새로 만들면 노드가 계속 쌓임). 샘플/행별 신스도 없는
  // 안전망 상황에서 이걸로 대체 재생함.
  useEffect(() => {
    drumSynthRef.current = new Tone.MembraneSynth().toDestination();
    return () => {
      drumSynthRef.current?.dispose();
    };
  }, []);

  // 비트킷이 바뀌면 샘플 Players/행별 신스를 새로 만듦.
  useEffect(() => {
    const kit = getBeatKitById(beatKitId);
    beatKitRef.current = kit;
    const previousPlayers = drumPlayersRef.current;

    if (kit.sampleUrls) {
      drumPlayersRef.current = new Tone.Players({
        urls: kit.sampleUrls,
        onerror: (err) => console.error(`[beat] ${kit.id} 샘플 로딩 실패`, err),
      }).toDestination();
    } else {
      drumPlayersRef.current = null;
    }

    const previousRowSynths = drumRowSynthsRef.current;
    const nextRowSynths = new Map<string, DrumRowSynth>();
    if (kit.rowSynths) {
      Object.entries(kit.rowSynths).forEach(([rowLabel, spec]) => {
        nextRowSynths.set(rowLabel, createDrumRowSynth(spec));
      });
    }
    drumRowSynthsRef.current = nextRowSynths;

    return () => {
      previousPlayers?.dispose();
      previousRowSynths.forEach((synth) => synth.dispose());
    };
  }, [beatKitId]);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // 마스터 볼륨 — 개별 악기 볼륨(instruments.ts의 volumePercent)이랑은 별개로 전체 출력에 적용됨.
  // 0%면 완전 무음(-Infinity dB)으로 처리함.
  useEffect(() => {
    Tone.Destination.volume.value =
      masterVolumePercent <= 0 ? -Infinity : 20 * Math.log10(masterVolumePercent / 100);
  }, [masterVolumePercent]);

  // 악기 선택이 바뀌면 멜로디 보이스를 다시 만듦.
  // - 실제 wav 샘플이 있는 악기(지금은 피아노)는 Tone.Sampler로.
  // - 아직 샘플 없는 악기는 기존처럼 Tone.Synth 파형/엔벨로프만 바꿔서 흉내냄.
  // 어느 쪽이든 triggerAttackRelease(note, duration, time) 시그니처가 같아서 호출부는 안 건드려도 됨.
  useEffect(() => {
    const def = getInstrumentById(instrumentId);
    const sampleUrls = getInstrumentSampleUrls(instrumentId);
    const previous = pianoSynthRef.current;

    let nextVoice: MelodyVoice;
    if (sampleUrls) {
      // 디버깅: Tone.Sampler를 거치지 않고 직접 fetch해서 서버가 진짜 뭘 돌려주는지 확인.
      // (상태코드/Content-Type/용량을 보면 실제 wav가 오는지, 엉뚱한 응답(예: index.html)이
      // 오는지 바로 구분됨)
      Object.entries(sampleUrls).forEach(([note, url]) => {
        fetch(url).then((res) => {
          console.log(
            `[samples] fetch ${note} -> ${url} : status=${res.status} type=${res.headers.get("content-type")} length=${res.headers.get("content-length")}`,
          );
        });
      });

      // baseUrl 없이 urls 값 자체를 루트 기준 절대경로로 넘김(위 getInstrumentSampleUrls 참고).
      nextVoice = new Tone.Sampler({
        urls: sampleUrls,
        release: 1,
        onload: () => console.log(`[samples] ${instrumentId} 로딩 완료`),
        onerror: (err) => console.error(`[samples] ${instrumentId} 로딩 실패`, err),
      }).toDestination();
    } else {
      const synth = new Tone.PolySynth(Tone.Synth).toDestination();
      synth.set({ oscillator: { type: def.synth.oscillatorType }, envelope: def.synth.envelope });
      nextVoice = synth;
    }

    // 악기별 볼륨 보정 — instruments.ts의 volumePercent(100=원본)를 dB로 변환해서 적용함.
    // 20*log10(비율)이 진폭比 -> dB 변환 공식. 90% -> 약 -0.92dB, 생략(100)이면 0dB(그대로).
    if (def.volumePercent !== undefined) {
      nextVoice.volume.value = 20 * Math.log10(def.volumePercent / 100);
    }

    pianoSynthRef.current = nextVoice;
    // 이전 보이스는 다음 틱에 정리 — Sampler는 로드가 비동기라 바로 dispose하면 로딩 중인
    // 요청이 애매해질 수 있어서 살짝 늦게 정리함.
    return () => {
      previous?.dispose();
    };
  }, [instrumentId]);

  const triggerRow = (rowIndex: number, noteName: string, time?: number) => {
    const kind = rowInstrumentsRef.current[rowIndex] ?? "piano";
    if (kind === "piano") {
      pianoSynthRef.current?.triggerAttackRelease(noteName, "16n", time);
      return;
    }

    // 드럼 — 우선순위: 1) 킷에 실제 샘플이 있으면 그 원샷 재생, 2) 킷이 행별 신스를 정의해뒀으면
    // (신스 비트) 그 행 전용 신스로, 3) 둘 다 없으면 옛날 방식대로 공용 MembraneSynth를 피치만
    // 바꿔서 침(안전망).
    const kit = beatKitRef.current;
    const players = drumPlayersRef.current;
    const rowSynthSpec = kit.rowSynths?.[noteName];
    const rowSynth = drumRowSynthsRef.current.get(noteName);

    if (players && kit.sampleUrls?.[noteName]) {
      players.player(noteName).start(time);
    } else if (rowSynth && rowSynthSpec) {
      triggerDrumRowSynth(rowSynth, rowSynthSpec, time);
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
