import { useEffect, useState, type ReactNode } from "react";
import { NOTE_NAMES, SCALE_NAMES, type ScaleName } from "../lib/scales";
import { EXPERIMENTAL_FEATURE_KEYS, t, type Language } from "../lib/i18n";
import { Dropdown } from "./Dropdown";

export interface GridSettings {
  bars: number;
  beatsPerBar: number;
  splitBeatsInto: number;
  scale: ScaleName;
  startNote: string;
  startOctave: number;
  rangeOctaves: number;
}

export type ThemeName = "monochrome";
export type LanguageCode = Language;

interface SettingsModalProps {
  settings: GridSettings;
  onChange: (next: GridSettings) => void;
  onConfirm: () => void;
  onClose: () => void;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  experimentalFeatures: boolean;
  onExperimentalFeaturesChange: (enabled: boolean) => void;
  combinedAdvancedView: boolean;
  onCombinedAdvancedViewChange: (enabled: boolean) => void;
  barCopyPasteEnabled: boolean;
  onBarCopyPasteEnabledChange: (enabled: boolean) => void;
  followPlayhead: boolean;
  onFollowPlayheadChange: (enabled: boolean) => void;
  playlistEnabled: boolean;
  onPlaylistEnabledChange: (enabled: boolean) => void;
}

export const BARS_DEFAULT_MAX = 16;
export const BARS_EXPERIMENTAL_MAX = 25;

// beatsPerBar * splitBeatsInto가 마디당 칸 수(stepsPerBar)가 되고, 여기에 bars까지 곱해지면
// 전체 셀 개수(행 수 x stepCount)가 기하급수적으로 커짐 — 셀 하나하나가 실제 DOM 버튼이라
// 너무 큰 조합(예: 25마디 x 12박자 x 4등분 = 1200칸)이면 브라우저가 버벅임. 그래서 이것도
// bars/BPM이랑 같은 패턴으로 기본값은 낮게, 실험 기능 켰을 때만 더 크게 허용함.
export const BEATS_PER_BAR_DEFAULT_MAX = 6;
export const BEATS_PER_BAR_EXPERIMENTAL_MAX = 12;
export const SPLIT_BEATS_DEFAULT_MAX = 2;
export const SPLIT_BEATS_EXPERIMENTAL_MAX = 4;

const OCTAVE_OPTIONS = [2, 3, 4, 5, 6];
type Tab = "piano-roll" | "personal";

export function SettingsModal({
  settings,
  onChange,
  onConfirm,
  onClose,
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  experimentalFeatures,
  onExperimentalFeaturesChange,
  combinedAdvancedView,
  onCombinedAdvancedViewChange,
  barCopyPasteEnabled,
  onBarCopyPasteEnabledChange,
  followPlayhead,
  onFollowPlayheadChange,
  playlistEnabled,
  onPlaylistEnabledChange,
}: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>("piano-roll");
  const update = (patch: Partial<GridSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-tabs">
          <button
            className={tab === "piano-roll" ? "modal-tab active" : "modal-tab"}
            onClick={() => setTab("piano-roll")}
          >
            {t(language, "settings.pianoRollTab")}
          </button>
          <button
            className={tab === "personal" ? "modal-tab active" : "modal-tab"}
            onClick={() => setTab("personal")}
          >
            {t(language, "settings.personalTab")}
          </button>
        </div>

        {tab === "piano-roll" ? (
          <>
            <div className="modal-settings">
              <div className="modal-settings-row modal-settings-row-2">
                <div className="setting-row">
                  <span className="setting-label">Length</span>
                  <Stepper
                    value={settings.bars}
                    unit="bars"
                    min={1}
                    max={experimentalFeatures ? BARS_EXPERIMENTAL_MAX : BARS_DEFAULT_MAX}
                    onChange={(v) => update({ bars: v })}
                    language={language}
                  />
                </div>
                <div className="setting-row">
                  <span className="setting-label">Scale</span>
                  <Dropdown
                    value={settings.scale}
                    options={SCALE_NAMES.map((name) => ({ value: name, label: name }))}
                    onChange={(v) => update({ scale: v as ScaleName })}
                  />
                </div>
              </div>

              <div className="modal-settings-row modal-settings-row-2">
                <div className="setting-row">
                  <span className="setting-label">Beats per bar</span>
                  <Stepper
                    value={settings.beatsPerBar}
                    min={1}
                    max={experimentalFeatures ? BEATS_PER_BAR_EXPERIMENTAL_MAX : BEATS_PER_BAR_DEFAULT_MAX}
                    onChange={(v) => update({ beatsPerBar: v })}
                    language={language}
                  />
                </div>
                <div className="setting-row">
                  <span className="setting-label">Start on</span>
                  <div className="modal-select-group">
                    <Dropdown
                      value={String(settings.startOctave)}
                      options={OCTAVE_OPTIONS.map((oct) => ({
                        value: String(oct),
                        label: oct === 4 ? "Middle" : `Octave ${oct}`,
                      }))}
                      onChange={(v) => update({ startOctave: Number(v) })}
                    />
                    <Dropdown
                      value={settings.startNote}
                      options={NOTE_NAMES.map((name) => ({ value: name, label: name }))}
                      onChange={(v) => update({ startNote: v })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-settings-row modal-settings-row-2">
                <div className="setting-row">
                  <span className="setting-label">Split beats into</span>
                  <Stepper
                    value={settings.splitBeatsInto}
                    min={1}
                    max={experimentalFeatures ? SPLIT_BEATS_EXPERIMENTAL_MAX : SPLIT_BEATS_DEFAULT_MAX}
                    onChange={(v) => update({ splitBeatsInto: v })}
                    language={language}
                  />
                </div>
                <div className="setting-row">
                  <span className="setting-label">Range</span>
                  <Stepper
                    value={settings.rangeOctaves}
                    unit="octave"
                    min={1}
                    max={4}
                    onChange={(v) => {
                      if (v === 4 && settings.startOctave === 4) {
                        update({ rangeOctaves: v, startOctave: 2 });
                      } else {
                        update({ rangeOctaves: v });
                      }
                    }}
                    language={language}
                  />
                </div>
              </div>
            </div>

            <button className="modal-confirm" onClick={onConfirm} aria-label={t(language, "settings.applySettings")}>
              ✓
            </button>
          </>
        ) : (
          <div className="modal-grid modal-grid-single">
            <div className="modal-column">
              <SettingRow label={t(language, "settings.theme")}>
                <Dropdown
                  value={theme}
                  options={[{ value: "monochrome", label: t(language, "settings.monochromeDefault") }]}
                  onChange={(v) => onThemeChange(v as ThemeName)}
                />
              </SettingRow>
              <SettingRow label={t(language, "settings.language")}>
                <Dropdown
                  value={language}
                  options={[
                    { value: "en", label: "English" },
                    { value: "ko", label: "한국어" },
                  ]}
                  onChange={(v) => onLanguageChange(v as LanguageCode)}
                />
              </SettingRow>
              <SettingRow label={t(language, "settings.experimentalFeatures")}>
                <label className="modal-toggle">
                  <input
                    type="checkbox"
                    checked={experimentalFeatures}
                    onChange={(e) => onExperimentalFeaturesChange(e.target.checked)}
                  />
                  <span className="modal-toggle-track" />
                </label>
              </SettingRow>
              {experimentalFeatures && (
                <p className="modal-hint-experimental">
                  {t(language, "settings.experimentalPrefix")}{" "}
                  {EXPERIMENTAL_FEATURE_KEYS.map((key) => t(language, key)).join(", ")}
                </p>
              )}
              <SettingRow label={t(language, "settings.combinedAdvancedView")}>
                <label className={`modal-toggle ${playlistEnabled ? "modal-toggle-disabled" : ""}`}>
                  <input
                    type="checkbox"
                    checked={combinedAdvancedView}
                    disabled={playlistEnabled}
                    onChange={(e) => onCombinedAdvancedViewChange(e.target.checked)}
                  />
                  <span className="modal-toggle-track" />
                </label>
              </SettingRow>
              {playlistEnabled && (
                <p className="modal-hint-inline">{t(language, "settings.playlistLockHint")}</p>
              )}
              <SettingRow label={t(language, "settings.playlistEnabled")}>
                <label className="modal-toggle">
                  <input
                    type="checkbox"
                    checked={playlistEnabled}
                    onChange={(e) => onPlaylistEnabledChange(e.target.checked)}
                  />
                  <span className="modal-toggle-track" />
                </label>
              </SettingRow>
              <SettingRow label={t(language, "settings.barCopyPaste")}>
                <label className="modal-toggle">
                  <input
                    type="checkbox"
                    checked={barCopyPasteEnabled}
                    onChange={(e) => onBarCopyPasteEnabledChange(e.target.checked)}
                  />
                  <span className="modal-toggle-track" />
                </label>
              </SettingRow>
              <SettingRow label={t(language, "settings.followPlayhead")}>
                <label className="modal-toggle">
                  <input
                    type="checkbox"
                    checked={followPlayhead}
                    onChange={(e) => onFollowPlayheadChange(e.target.checked)}
                  />
                  <span className="modal-toggle-track" />
                </label>
              </SettingRow>
              <p className="modal-hint">{t(language, "settings.hint")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="setting-row">
      <span className="setting-label">{label}</span>
      {children}
    </div>
  );
}

function Stepper({
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
  language,
}: {
  value: number;
  unit?: string;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  language: Language;
}) {
  // 입력창에 타이핑하는 중간 값("1"만 친 상태처럼)까지 매 글자마다 클램프해버리면 타이핑이
  // 막혀서 불편함 — 그래서 입력 중엔 그냥 문자열로 자유롭게 받아두고, 포커스를 벗어나거나
  // 엔터를 눌렀을 때(commit)만 실제로 검증/클램프해서 onChange로 반영함.
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, Math.round(parsed)));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div className="stepper">
      <button
        className="stepper-button"
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label={t(language, "settings.decrease")}
      >
        −
      </button>
      <input
        className="stepper-input"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {unit && <span className="stepper-unit">{unit}</span>}
      <button
        className="stepper-button"
        onClick={() => onChange(Math.min(max, value + step))}
        aria-label={t(language, "settings.increase")}
      >
        +
      </button>
    </div>
  );
}
