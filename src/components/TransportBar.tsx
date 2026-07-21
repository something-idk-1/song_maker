import type { Instrument } from "../hooks/useSequencer";

interface TransportBarProps {
  isPlaying: boolean;
  onPlayToggle: () => void;
  instrument: Instrument;
  onInstrumentChange: (instrument: Instrument) => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  currentStep: number;
  stepCount: number;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenSettings: () => void;
  onSave: () => void;
}

// docs/DESIGN.md 의 transport-bar 스펙을 3열 그리드로 구성: 좌측(재생+악기토글+스텝표시) - 중앙(템포) - 우측(undo/redo/설정/저장)
export function TransportBar({
  isPlaying,
  onPlayToggle,
  instrument,
  onInstrumentChange,
  bpm,
  onBpmChange,
  currentStep,
  stepCount,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenSettings,
  onSave,
}: TransportBarProps) {
  return (
    <footer className="transport-bar">
      <div className="transport-left">
        <button className="transport-play-button" onClick={onPlayToggle}>
          {isPlaying ? "■" : "▶"}
        </button>

        <div className="segmented-toggle">
          <button
            className={instrument === "piano" ? "active" : ""}
            onClick={() => onInstrumentChange("piano")}
          >
            피아노
          </button>
          <button
            className={instrument === "drum" ? "active" : ""}
            onClick={() => onInstrumentChange("drum")}
          >
            드럼
          </button>
        </div>

        <span className="transport-step-readout">
          STEP {String(currentStep + 1).padStart(2, "0")}/{stepCount}
        </span>
      </div>

      <div className="transport-center">
        <div className="tempo-group">
          <span className="tempo-label">TEMPO</span>
          <input
            className="tempo-slider"
            type="range"
            min={40}
            max={220}
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value))}
          />
          <div className="bpm-stepper">
            <input
              type="number"
              min={40}
              max={220}
              value={bpm}
              onChange={(e) => onBpmChange(Number(e.target.value))}
            />
            <span>BPM</span>
          </div>
        </div>
      </div>

      <div className="transport-right">
        <button className="button-icon-circular" onClick={onUndo} disabled={!canUndo} title="Undo">
          ↺
        </button>
        <button className="button-icon-circular" onClick={onRedo} disabled={!canRedo} title="Redo">
          ↻
        </button>
        <button className="button-icon-circular" onClick={onOpenSettings} title="Settings">
          ⚙
        </button>
        <button className="button-primary" onClick={onSave}>
          SAVE PROJECT
        </button>
      </div>
    </footer>
  );
}
