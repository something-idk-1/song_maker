import { useEffect, useRef, useState } from "react";
import type { Instrument } from "../hooks/useSequencer";
import type { AppMode } from "./Header";
import { getInstrumentById, getInstrumentDisplayName } from "../lib/instruments";
import { getBeatKitById, getBeatKitDisplayName } from "../lib/beatKits";
import { t, type Language } from "../lib/i18n";

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
  onCycleInstrument: () => void;
  experimentalFeatures: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  melodyVolume: number;
  onMelodyVolumeChange: (volume: number) => void;
  beatVolume: number;
  onBeatVolumeChange: (volume: number) => void;
  beatKitId: string;
  onOpenBeatKitPicker: () => void;
  onCycleBeatKit: () => void;
  combinedAdvancedView: boolean;
  language: Language;
}

export const BPM_DEFAULT_MAX = 220;
export const BPM_EXPERIMENTAL_MAX = 500;

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
  onCycleInstrument,
  experimentalFeatures,
  volume,
  onVolumeChange,
  melodyVolume,
  onMelodyVolumeChange,
  beatVolume,
  onBeatVolumeChange,
  beatKitId,
  onOpenBeatKitPicker,
  onCycleBeatKit,
  combinedAdvancedView,
  language,
}: TransportBarProps) {
  const selectedInstrument = getInstrumentById(instrumentId);
  const selectedBeatKit = getBeatKitById(beatKitId);
  const bpmMax = experimentalFeatures ? BPM_EXPERIMENTAL_MAX : BPM_DEFAULT_MAX;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [volumeExpanded, setVolumeExpanded] = useState(false);
  const handleToggleVolumeExpand = () => {
    if (volumeExpanded) {
      onVolumeChange(Math.round((melodyVolume + beatVolume) / 2));
    }
    setVolumeExpanded((v) => !v);
  };

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

        {mode === "advanced" && (
          combinedAdvancedView ? (
            <div className="segmented-toggle">
              <button className="active" onClick={onOpenInstrumentPicker}>
                {getInstrumentDisplayName(selectedInstrument, language)}
              </button>
              <button className="active" onClick={onOpenBeatKitPicker}>
                {getBeatKitDisplayName(selectedBeatKit, language)}
              </button>
            </div>
          ) : (
            <div className="segmented-toggle">
              <button
                className={instrument === "piano" ? "active" : ""}
                onClick={() => {
                  if (instrument === "piano") onOpenInstrumentPicker();
                  else onInstrumentChange("piano");
                }}
              >
                {getInstrumentDisplayName(selectedInstrument, language)}
              </button>
              <button
                className={instrument === "drum" ? "active" : ""}
                onClick={() => {
                  if (instrument === "drum") onOpenBeatKitPicker();
                  else onInstrumentChange("drum");
                }}
              >
                {getBeatKitDisplayName(selectedBeatKit, language)}
              </button>
            </div>
          )
        )}

        {mode === "simple" && (
          <button className="instrument-select-button" onClick={onCycleInstrument}>
            {getInstrumentDisplayName(selectedInstrument, language)}
          </button>
        )}

        {mode === "simple" && (
          <button className="instrument-select-button" onClick={onCycleBeatKit}>
            {getBeatKitDisplayName(selectedBeatKit, language)}
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
            max={bpmMax}
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value))}
          />
          <div className="bpm-stepper">
            <input
              type="number"
              min={40}
              max={bpmMax}
              value={bpm}
              onChange={(e) => onBpmChange(Number(e.target.value))}
            />
            <span>BPM</span>
          </div>
        </div>
      </div>

      <div className="transport-right">
        <div className="volume-capsule">
          <button
            className="volume-expand-toggle"
            onClick={handleToggleVolumeExpand}
            title={t(language, volumeExpanded ? "transport.mergeToAverage" : "transport.adjustSeparately")}
          >
            {volumeExpanded ? "›" : "‹"}
          </button>

          <div className="volume-group" title={t(language, "transport.masterVolume")}>
            <span className="volume-label">VOL</span>
            <div className={`volume-collapse ${volumeExpanded ? "volume-collapse-hidden" : ""}`}>
              <input
                className="volume-slider"
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
              />
            </div>
          </div>

          <div className={`volume-expand-panel ${volumeExpanded ? "volume-expand-panel-open" : ""}`}>
            <div className="volume-group" title={t(language, "transport.melodyVolume")}>
              <span className="volume-label">{t(language, "transport.melody")}</span>
              <input
                className="volume-slider"
                type="range"
                min={0}
                max={100}
                value={melodyVolume}
                onChange={(e) => onMelodyVolumeChange(Number(e.target.value))}
              />
            </div>

            <div className="volume-group" title={t(language, "transport.beatVolume")}>
              <span className="volume-label">{t(language, "transport.beat")}</span>
              <input
                className="volume-slider"
                type="range"
                min={0}
                max={100}
                value={beatVolume}
                onChange={(e) => onBeatVolumeChange(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <button className="button-icon-circular" onClick={onUndo} disabled={!canUndo} title="Undo">
          ↺
        </button>
        <button className="button-icon-circular" onClick={onRedo} disabled={!canRedo} title="Redo">
          ↻
        </button>
        <button className="button-icon-circular" onClick={onOpenSettings} title={t(language, "transport.settings")}>
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
                  {t(language, "transport.importMidiBeta")}
                </button>
              )}
              <button
                className="file-menu-item"
                onClick={() => {
                  onExportMidi();
                  setMenuOpen(false);
                }}
              >
                {t(language, "transport.exportMidi")}
              </button>
              <button
                className="file-menu-item"
                onClick={() => {
                  onExportWav();
                  setMenuOpen(false);
                }}
              >
                {t(language, "transport.exportWav")}
              </button>
              <button
                className="file-menu-item"
                onClick={() => {
                  onShareLink();
                  setMenuOpen(false);
                }}
              >
                {t(language, "transport.copyLink")}
              </button>
            </div>
          )}
          <button className="button-primary" onClick={() => setMenuOpen((v) => !v)}>
            {t(language, "transport.save")}
          </button>
        </div>
      </div>
    </footer>
  );
}
