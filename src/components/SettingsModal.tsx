import { useState, type ReactNode } from "react";
import { NOTE_NAMES, SCALE_NAMES, type ScaleName } from "../lib/scales";
import { EXPERIMENTAL_FEATURE_KEYS, t, type Language } from "../lib/i18n";

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
}

export const BARS_DEFAULT_MAX = 16;
export const BARS_EXPERIMENTAL_MAX = 25;

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
                <div className="modal-field">
                  <span className="modal-field-label">Length</span>
                  <Stepper
                    value={settings.bars}
                    unit="bars"
                    min={1}
                    max={experimentalFeatures ? BARS_EXPERIMENTAL_MAX : BARS_DEFAULT_MAX}
                    onChange={(v) => update({ bars: v })}
                    language={language}
                  />
                </div>
                <div className="modal-field">
                  <span className="modal-field-label">Scale</span>
                  <select
                    className="modal-select"
                    value={settings.scale}
                    onChange={(e) => update({ scale: e.target.value as ScaleName })}
                  >
                    {SCALE_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-settings-row modal-settings-row-3">
                <div className="modal-field">
                  <span className="modal-field-label">Octave</span>
                  <select
                    className="modal-select"
                    value={settings.startOctave}
                    onChange={(e) => update({ startOctave: Number(e.target.value) })}
                  >
                    {OCTAVE_OPTIONS.map((oct) => (
                      <option key={oct} value={oct}>
                        {oct === 4 ? "Middle" : `Octave ${oct}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="modal-field">
                  <span className="modal-field-label">Note</span>
                  <select
                    className="modal-select"
                    value={settings.startNote}
                    onChange={(e) => update({ startNote: e.target.value })}
                  >
                    {NOTE_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="modal-field">
                  <span className="modal-field-label">Range</span>
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
                <select
                  className="modal-select"
                  value={theme}
                  onChange={(e) => onThemeChange(e.target.value as ThemeName)}
                >
                  <option value="monochrome">{t(language, "settings.monochromeDefault")}</option>
                </select>
              </SettingRow>
              <SettingRow label={t(language, "settings.language")}>
                <select
                  className="modal-select"
                  value={language}
                  onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
                >
                  <option value="en">English</option>
                  <option value="ko">한국어</option>
                </select>
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
  return (
    <div className="stepper">
      <span className="stepper-value">
        {value}
        {unit ? ` ${unit}` : ""}
      </span>
      <button
        className="stepper-button"
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label={t(language, "settings.decrease")}
      >
        −
      </button>
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
