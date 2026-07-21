// 실제 wav 샘플이 붙기 전까지는 Tone.Synth의 파형/엔벨로프만 바꿔서 악기별로 소리 차이를 흉내냄.
// 나중에 진짜 샘플이 들어오면 이 설정 대신 Tone.Sampler({ urls: {...} })로 교체하면 됨
// (AGENT.md/useSequencer.ts에 이미 적어둔 TODO 참고).
export type OscillatorType = "sine" | "triangle" | "square" | "sawtooth";

export interface InstrumentSynthParams {
  oscillatorType: OscillatorType;
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

export type InstrumentCategory = "건반" | "현악" | "관악" | "국악";

export interface InstrumentDef {
  id: string;
  name: string;
  category: InstrumentCategory;
  synth: InstrumentSynthParams;
  /** 국악기처럼 아직 진짜 음색이 없는 경우 표시할 안내 문구 */
  note?: string;
}

export const INSTRUMENTS: InstrumentDef[] = [
  {
    id: "piano",
    name: "피아노",
    category: "건반",
    synth: { oscillatorType: "triangle", envelope: { attack: 0.005, decay: 0.3, sustain: 0.2, release: 0.8 } },
  },
  {
    id: "musicbox",
    name: "뮤직박스",
    category: "건반",
    synth: { oscillatorType: "sine", envelope: { attack: 0.001, decay: 0.4, sustain: 0.05, release: 1.2 } },
  },
  {
    id: "marimba",
    name: "마림바",
    category: "건반",
    synth: { oscillatorType: "sine", envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.3 } },
  },
  {
    id: "strings",
    name: "스트링",
    category: "현악",
    synth: { oscillatorType: "sawtooth", envelope: { attack: 0.2, decay: 0.2, sustain: 0.6, release: 1 } },
  },
  {
    id: "synth-strings",
    name: "신스 스트링",
    category: "현악",
    synth: { oscillatorType: "sawtooth", envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.6 } },
  },
  {
    id: "woodwind",
    name: "목관",
    category: "관악",
    synth: { oscillatorType: "square", envelope: { attack: 0.08, decay: 0.15, sustain: 0.5, release: 0.4 } },
  },
  {
    id: "synth-lead",
    name: "신스 리드",
    category: "관악",
    synth: { oscillatorType: "square", envelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.2 } },
  },
  {
    id: "gayageum",
    name: "가야금",
    category: "국악",
    synth: { oscillatorType: "triangle", envelope: { attack: 0.001, decay: 0.6, sustain: 0, release: 0.4 } },
    note: "실제 국악기 음색은 샘플 준비되면 교체 예정",
  },
  {
    id: "daegeum",
    name: "대금",
    category: "국악",
    synth: { oscillatorType: "sine", envelope: { attack: 0.1, decay: 0.1, sustain: 0.6, release: 0.5 } },
    note: "실제 국악기 음색은 샘플 준비되면 교체 예정",
  },
];

export const INSTRUMENT_CATEGORIES: InstrumentCategory[] = ["건반", "현악", "관악", "국악"];

export function getInstrumentById(id: string): InstrumentDef {
  return INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0];
}
