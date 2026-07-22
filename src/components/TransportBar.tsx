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
  // 간단 모드 전용 — 악기 버튼 누를 때마다 정해진 순서로 다음 악기로 바로 넘어감(팝업 없음).
  onCycleInstrument: () => void;
  experimentalFeatures: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  // 멜로디/드럼 채널만 따로 조절하는 볼륨(0~100) — 마스터 볼륨(volume)이랑은 별개로 적용됨.
  melodyVolume: number;
  onMelodyVolumeChange: (volume: number) => void;
  beatVolume: number;
  onBeatVolumeChange: (volume: number) => void;
  // 고급 모드 전용 — 드럼 화면에서 비트킷 선택 팝업 열기(피아노 쪽 악기 선택 팝업이랑 같은 패턴).
  beatKitId: string;
  onOpenBeatKitPicker: () => void;
  // 간단 모드 전용 — 비트 버튼 누를 때마다 뮤직랩 킷 순서(일렉트로닉→블록→킷→콩가→...)로 넘어감.
  onCycleBeatKit: () => void;
  language: Language;
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
  language,
}: TransportBarProps) {
  const selectedInstrument = getInstrumentById(instrumentId);
  const selectedBeatKit = getBeatKitById(beatKitId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // 처음엔 전체(마스터) 볼륨 슬라이더 하나만 보이다가, 화살표 버튼을 누르면 왼쪽으로 늘어나면서
  // 멜로디/비트 슬라이더 2개로 펼쳐짐. 다시 접으면(오른쪽 화살표) 멜로디/비트의 평균으로
  // 전체 볼륨을 맞추고 원래 하나짜리 모습으로 되돌아감.
  const [volumeExpanded, setVolumeExpanded] = useState(false);
  const handleToggleVolumeExpand = () => {
    if (volumeExpanded) {
      onVolumeChange(Math.round((melodyVolume + beatVolume) / 2));
    }
    setVolumeExpanded((v) => !v);
  };

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
              {getInstrumentDisplayName(selectedInstrument, language)}
            </button>
            <button
              className={instrument === "drum" ? "active" : ""}
              onClick={() => {
                // 피아노 쪽이랑 같은 패턴 — 이미 드럼 화면 보고 있으면 비트킷 선택 팝업을 열고,
                // 처음 누를 땐(피아노 보다가) 그냥 화면만 드럼으로 전환.
                if (instrument === "drum") onOpenBeatKitPicker();
                else onInstrumentChange("drum");
              }}
            >
              {getBeatKitDisplayName(selectedBeatKit, language)}
            </button>
          </div>
        )}

        {/* 간단 모드는 피아노/드럼 토글 자체가 없고, 팝업으로 고르는 대신 누를 때마다
            마림바→피아노→바이올린→플루트→신스→마림바... 순서로 바로 넘어감 */}
        {mode === "simple" && (
          <button className="instrument-select-button" onClick={onCycleInstrument}>
            {getInstrumentDisplayName(selectedInstrument, language)}
          </button>
        )}

        {/* 비트도 똑같은 방식 — 뮤직랩 4개(일렉트로닉→블록→킷→콩가→...)를 순서대로 돌아가며 씀 */}
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
        {/* 볼륨 전체를 캡슐(알약) 모양 하나로 묶음 — 화살표가 맨 왼쪽에 붙어있고, 눌러서 펼치면
            같은 캡슐 안에서 오른쪽으로 늘어나며 멜로디/비트 슬라이더가 나타남. */}
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
            {/* 접혀있을 때만 보여줌 — 펼쳐지면 아래 멜로디/비트 슬라이더가 대신 보임 */}
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
