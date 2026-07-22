import * as Tone from "tone";
import { DRUM_TRIGGER_NOTE, stepDurationSeconds } from "./midi";
import type { Instrument } from "../hooks/useSequencer";
import { getInstrumentById, getInstrumentSampleUrls } from "./instruments";
import {
  DEFAULT_BEAT_KIT_ID,
  getBeatKitById,
  createDrumRowSynth,
  triggerDrumRowSynth,
  type DrumRowSynth,
} from "./beatKits";

interface RenderArgs {
  noteRows: string[];
  activeCells: Set<string>;
  rowInstruments: Instrument[];
  stepCount: number;
  bpm: number;
  // 지금 선택된 멜로디 악기/비트킷 — 예전엔 이거 없이 그냥 기본 PolySynth/MembraneSynth로만
  // 렌더링해서 실제로 화면에서 듣던 소리(피아노 샘플, 뮤직랩 킥/스네어 샘플 등)랑 WAV 파일
  // 소리가 달랐음. 지금은 useSequencer.ts랑 똑같은 방식(Sampler/Players/행별 신스)으로 맞춰서 렌더함.
  instrumentId: string;
  beatKitId: string;
  // 멜로디/드럼 채널 볼륨(0~100) — 화면에서 슬라이더로 조절한 값을 그대로 반영해서 렌더함.
  melodyVolumePercent: number;
  beatVolumePercent: number;
}

function percentToDb(percent: number): number {
  return percent <= 0 ? -Infinity : 20 * Math.log10(percent / 100);
}

/**
 * 실제로 재생 중인 라이브 신스가 아니라, Tone.Offline으로 완전히 별도의(오프라인) 오디오 컨텍스트에서
 * 똑같은 노트들을 다시 스케줄링해서 렌더링함. 이렇게 해야 실시간 재생 속도와 무관하게, 그리고 스피커로
 * 소리를 실제로 재생하지 않고도 오디오 데이터를 뽑아낼 수 있음(WAV 내보내기용).
 *
 * useSequencer.ts의 triggerRow랑 최대한 똑같은 로직을 씀 — 그래야 화면에서 듣던 소리 그대로
 * WAV로 나옴 (예전엔 여기서 그냥 기본 신스만 써서 실제 악기 소리랑 다르게 나오는 버그가 있었음).
 */
export async function renderToAudioBuffer({
  noteRows,
  activeCells,
  rowInstruments,
  stepCount,
  bpm,
  instrumentId,
  beatKitId = DEFAULT_BEAT_KIT_ID,
  melodyVolumePercent,
  beatVolumePercent,
}: RenderArgs): Promise<AudioBuffer> {
  const stepSec = stepDurationSeconds(bpm);
  const totalDuration = stepCount * stepSec + 1; // 마지막 노트 꼬리(release)까지 여유 1초 추가

  const instrumentDef = getInstrumentById(instrumentId);
  const melodySampleUrls = getInstrumentSampleUrls(instrumentId);
  const kit = getBeatKitById(beatKitId);

  const rendered = await Tone.Offline(async () => {
    // 멜로디 보이스 — 실제 wav 샘플 있는 악기는 Sampler, 없으면 Synth 파형(useSequencer.ts랑 동일 로직).
    let melodyVoice: Tone.PolySynth | Tone.Sampler;
    if (melodySampleUrls) {
      melodyVoice = new Tone.Sampler({ urls: melodySampleUrls, release: 1 }).toDestination();
    } else {
      const synth = new Tone.PolySynth(Tone.Synth).toDestination();
      synth.set({
        oscillator: { type: instrumentDef.synth.oscillatorType },
        envelope: instrumentDef.synth.envelope,
      });
      melodyVoice = synth;
    }
    // 악기 자체 보정 + 멜로디 채널 볼륨을 dB 합산해서 적용(useSequencer.ts랑 동일 방식).
    const instrumentDb =
      instrumentDef.volumePercent !== undefined
        ? 20 * Math.log10(instrumentDef.volumePercent / 100)
        : 0;
    const melodyChannelDb = percentToDb(melodyVolumePercent);
    melodyVoice.volume.value = melodyChannelDb === -Infinity ? -Infinity : instrumentDb + melodyChannelDb;

    // 드럼 — 킷에 실제 샘플 있으면 Players, 없고 행별 신스 정의돼 있으면(신스 비트) 그걸로,
    // 둘 다 없으면 공용 MembraneSynth를 피치만 바꿔서 침(안전망).
    const drumPlayers = kit.sampleUrls
      ? new Tone.Players({ urls: kit.sampleUrls }).toDestination()
      : null;
    const drumRowSynths = new Map<string, DrumRowSynth>();
    if (kit.rowSynths) {
      Object.entries(kit.rowSynths).forEach(([rowLabel, spec]) => {
        drumRowSynths.set(rowLabel, createDrumRowSynth(spec));
      });
    }
    const fallbackDrumSynth = new Tone.MembraneSynth().toDestination();

    // 드럼 채널 볼륨 — Players/행별 신스/안전망 전부에 동일하게 적용.
    const drumDb = percentToDb(beatVolumePercent);
    if (drumPlayers) drumPlayers.volume.value = drumDb;
    drumRowSynths.forEach((synth) => {
      synth.volume.value = drumDb;
    });
    fallbackDrumSynth.volume.value = drumDb;

    // Sampler/Players는 wav 로딩이 비동기라서, 노트를 스케줄링하기 전에 다 로드될 때까지 기다림.
    await Tone.loaded();

    activeCells.forEach((key) => {
      const [rowStr, stepStr] = key.split(":");
      const rowIndex = Number(rowStr);
      const stepIndex = Number(stepStr);
      const noteName = noteRows[rowIndex];
      if (!noteName) return;
      const kind = rowInstruments[rowIndex] ?? "piano";
      const time = stepIndex * stepSec;

      if (kind === "piano") {
        melodyVoice.triggerAttackRelease(noteName, "16n", time);
        return;
      }

      const rowSynthSpec = kit.rowSynths?.[noteName];
      const rowSynth = drumRowSynths.get(noteName);
      if (drumPlayers && kit.sampleUrls?.[noteName]) {
        drumPlayers.player(noteName).start(time);
      } else if (rowSynth && rowSynthSpec) {
        triggerDrumRowSynth(rowSynth, rowSynthSpec, time);
      } else {
        const pitch = DRUM_TRIGGER_NOTE[noteName] ?? noteName;
        fallbackDrumSynth.triggerAttackRelease(pitch, "16n", time);
      }
    });
  }, totalDuration);

  return rendered.get() as AudioBuffer;
}
