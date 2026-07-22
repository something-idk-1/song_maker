import { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { DRUM_TRIGGER_NOTE } from "../lib/midi";
import { getInstrumentById, getInstrumentSampleUrls } from "../lib/instruments";
import {
  DEFAULT_BEAT_KIT_ID,
  getBeatKitById,
  createDrumRowSynth,
  triggerDrumRowSynth,
  type BeatKitDef,
  type DrumRowSynth,
} from "../lib/beatKits";

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
  // 멜로디 채널만 따로 조절하는 볼륨(0~100). 악기 자체 볼륨 보정(instruments.ts의 volumePercent)이랑
  // 곱해져서(=dB 합산) 적용됨 — 마스터랑은 별개로 멜로디만 줄이거나 키울 때 씀.
  melodyVolumePercent: number;
  // 드럼 채널만 따로 조절하는 볼륨(0~100). 마스터/멜로디랑은 별개.
  beatVolumePercent: number;
  // 드럼 행에 쓸 비트킷 id — lib/beatKits.ts 참고. 지금은 고를 UI가 없어서 항상 기본값(뮤직랩 기본)만 옴.
  beatKitId?: string;
  // 재생 시작 위치(스텝 인덱스) — 방향키(←/→)로 옮길 수 있는 "곡 시작 지점" 마커.
  // 재생(스페이스바/재생 버튼)을 누르면 항상 0이 아니라 이 스텝부터 시작함.
  startStep?: number;
}

// 0이면 완전 무음(-Infinity dB), 아니면 20*log10(비율)로 dB 변환.
function percentToDb(percent: number): number {
  return percent <= 0 ? -Infinity : 20 * Math.log10(percent / 100);
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
  melodyVolumePercent,
  beatVolumePercent,
  beatKitId = DEFAULT_BEAT_KIT_ID,
  startStep = 0,
}: UseSequencerArgs) {
  const [currentStep, setCurrentStep] = useState(startStep);
  // 시퀀스 콜백/재시작 effect들이 최신 startStep을 읽을 수 있게 ref로도 들고 있음
  // (activeCellsRef/rowInstrumentsRef랑 같은 패턴 — 재생 중에 값이 바뀌어도 재생 자체는 안 끊기게).
  const startStepRef = useRef(startStep);
  useEffect(() => {
    startStepRef.current = startStep;
    if (!isPlaying) setCurrentStep(startStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startStep]);
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

  // 드럼 채널 볼륨 — 샘플 Players, 행별 신스, 안전망 MembraneSynth 전부에 동일하게 적용함.
  // 위 beatKitId effect 다음에 둬야 함 — 킷이 바뀌어서 Players/신스가 새로 만들어진 직후(기본 0dB
  // 상태)에도 곧바로 지금 볼륨이 반영되게. 순서가 바뀌면 킷 전환 직후 잠깐 원래 볼륨으로 들림.
  useEffect(() => {
    const db = percentToDb(beatVolumePercent);
    if (drumPlayersRef.current) drumPlayersRef.current.volume.value = db;
    drumRowSynthsRef.current.forEach((synth) => {
      synth.volume.value = db;
    });
    if (drumSynthRef.current) drumSynthRef.current.volume.value = db;
  }, [beatVolumePercent, beatKitId]);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // 마스터 볼륨 — 개별 악기 볼륨(instruments.ts의 volumePercent)이랑은 별개로 전체 출력에 적용됨.
  // 0%면 완전 무음(-Infinity dB)으로 처리함.
  useEffect(() => {
    Tone.Destination.volume.value = percentToDb(masterVolumePercent);
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

  // 멜로디 채널 볼륨 — 슬라이더를 움직일 때마다 "지금 붙어있는" 멜로디 보이스에 바로 반영함.
  // 위 instrumentId effect 다음에 둬야 함 — 악기를 바꿔서 보이스가 새로 만들어진 직후에도 곧바로
  // 지금 볼륨이 반영되게. 악기 자체 보정(volumePercent)이랑은 dB 합산으로 같이 적용됨.
  // 볼륨 effect를 악기 생성 effect랑 합치지 않은 이유: 합치면 볼륨 슬라이더만 움직여도 매번
  // Sampler가 다시 로드돼서 소리가 끊기고 네트워크 요청도 다시 나감 — 볼륨은 기존 보이스의
  // .volume만 바꾸면 충분함.
  useEffect(() => {
    const voice = pianoSynthRef.current;
    if (!voice) return;
    const def = getInstrumentById(instrumentId);
    const instrumentDb = def.volumePercent !== undefined ? 20 * Math.log10(def.volumePercent / 100) : 0;
    const channelDb = percentToDb(melodyVolumePercent);
    voice.volume.value = channelDb === -Infinity ? -Infinity : instrumentDb + channelDb;
  }, [instrumentId, melodyVolumePercent]);

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
    // (여기선 startStep 오프셋을 안 씀 — 이미 재생 중이던 Transport 시각에 그냥 이어붙이는
    // 것뿐이라, 오프셋을 또 적용하면 아래 isPlaying effect에서 이미 처리한 시작 위치가 중복/꼬임)
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
      setCurrentStep(startStepRef.current);
      return;
    }

    Tone.start().then(() => {
      // 시퀀스 자체는 항상 오프셋 없이(0) 시작하고, "몇 번째 스텝부터 들리게 할지"는
      // Transport의 시작 오프셋으로 처리함. Sequence.start(time, offset)에 직접 오프셋을
      // 주면(예전 방식) Tone.Part가 오프셋보다 이전 시각인 이벤트들을 전부 "이미 지나간 시각"으로
      // 취급해 한꺼번에 즉시 재생해버려서, 아직 로딩 안 된 샘플까지 한번에 트리거되며
      // "buffer is either not set or not loaded" 에러가 났었음. Transport.start(time, offset)는
      // 이런 용도(중간 지점부터 재생)로 공식 지원되는 방식이라 이 문제가 없음.
      sequenceRef.current?.start(0);
      Tone.Transport.start(undefined, Tone.Time("16n").toSeconds() * startStepRef.current);
    });

    return () => {
      Tone.Transport.stop();
      sequenceRef.current?.stop(0);
    };
  }, [isPlaying]);

  return { currentStep, previewNote, previewPianoNote };
}
