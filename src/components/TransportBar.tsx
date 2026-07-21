import { useEffect, useRef, useState } from "react";
import type { Instrument } from "../hooks/useSequencer";
import type { AppMode } from "./Header";
import { getInstrumentById } from "../lib/instruments";

interface TransportBarProps {
  mode: AppMode;
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
  onImportMidi: (file: File) => void;
  onExportMidi: () => void;
  onExportWav: () => void;
  onShareLink: () => void;
  onOpenSettings: () => void;
  instrumentId: string;
  onOpenInstrumentPicker: () => void;
  experimentalFeatures: boolean;
}

// docs/DESIGN.md 의 transport-bar 스펙을 3열 그리드로 구성: 좌측(재생+악기토글+스텝표시) - 중앙(템포) - 우측(undo/redo/프로젝트 메뉴)
export function TransportBar({
  mode,
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
  onImportMidi,
  onExportMidi,
  onExportWav,
  onShareLink,
  onOpenSettings,
  instrumentId,
  onOpenInstrumentPicker,
  experimentalFeatures,
}: TransportBarProps) {
  const selectedInstrument = getInstrumentById(instrumentId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 바깥 클릭하면 닫히게.
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <footer className="transport-bar">
      <div className="transport-left">
        <button className="transport-play-button" onClick={onPlayToggle}>
          {isPlaying ? "■" : "▶"}
        </button>

        {/* 간단 모드에선 멜로디+드럼이 한 그리드에 같이 있어서 피아노/드럼 화면 토글이 필요 없음 */}
        {mode === "advanced" && (
          <div className="segmented-toggle">
            <button
              className={instrument === "piano" ? "active" : ""}
              onClick={() => {
                // 이미 피아노 화면 보고 있는 상태에서 또 누르면 거기서 악기를 고르게 함.
                // 처음 누를 땐(드럼 보다가) 그냥 화면만 피아노로 전환.
                if (instrument === "piano") onOpenInstrumentPicker();
                else onInstrumentChange("piano");
              }}
            >
              {selectedInstrument.name}
            </button>
            <button
              className={instrument === "drum" ? "active" : ""}
              onClick={() => onInstrumentChange("drum")}
            >
              드럼
            </button>
          </div>
        )}

        {/* 간단 모드는 피아노/드럼 토글 자체가 없으니까 악기 선택 버튼을 따로 보여줌 */}
        {mode === "simple" && (
          <button className="instrument-select-button" onClick={onOpenInstrumentPicker}>
            {selectedInstrument.name} ▾
          </button>
        )}

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
        <button className="button-icon-circular" onClick={onOpenSettings} title="설정">
          ⚙
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".mid,.midi"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImportMidi(file);
            e.target.value = "";
          }}
        />

        <div className="file-menu" ref={menuRef}>
          {menuOpen && (
            <div className="file-menu-panel">
              {experimentalFeatures && (
                <button
                  className="file-menu-item"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setMenuOpen(false);
                  }}
                >
                  MIDI 불러오기(베타)
                </button>
              )}
              <button
                className="file-menu-item"
                onClick={() => {
                  onExportMidi();
                  setMenuOpen(false);
                }}
              >
                MIDI 내보내기
              </button>
              <button
                className="file-menu-item"
                onClick={() => {
                  onExportWav();
                  setMenuOpen(false);
                }}
              >
                WAV로 내보내기
              </button>
              <button
                className="file-menu-item"
                onClick={() => {
                  onShareLink();
                  setMenuOpen(false);
                }}
              >
                링크 복사
              </button>
            </div>
          )}
          <button className="button-primary" onClick={() => setMenuOpen((v) => !v)}>
            저장 ▾
          </button>
        </div>
      </div>
    </footer>
  );
}
