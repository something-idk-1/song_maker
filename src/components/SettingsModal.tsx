import type { ReactNode } from "react";
import { NOTE_NAMES, SCALE_NAMES, type ScaleName } from "../lib/scales";

export interface GridSettings {
  bars: number;
  beatsPerBar: number;
  splitBeatsInto: number;
  scale: ScaleName;
  startNote: string;
  startOctave: number;
  rangeOctaves: number;
}

interface SettingsModalProps {
  settings: GridSettings;
  onChange: (next: GridSettings) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const OCTAVE_OPTIONS = [3, 4, 5, 6];

// Chrome Music Lab 의 Song Maker 설정 화면 레이아웃 참고 — Length/Beats per bar/Split beats into (좌측),
// Scale/Start on/Range (우측), 가운데 확인 버튼.
export function SettingsModal({ settings, onChange, onConfirm, onClose }: SettingsModalProps) {
  const update = (patch: Partial<GridSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-grid">
          <div className="modal-column">
            <SettingRow label="Length">
              <Stepper
                value={settings.bars}
                unit="bars"
                min={1}
                max={16}
                onChange={(v) => update({ bars: v })}
              />
            </SettingRow>
            <SettingRow label="Beats per bar">
              <Stepper
                value={settings.beatsPerBar}
                min={2}
                max={8}
                onChange={(v) => update({ beatsPerBar: v })}
              />
            </SettingRow>
            <SettingRow label="Split beats into">
              <Stepper
                value={settings.splitBeatsInto}
                min={1}
                max={4}
                onChange={(v) => update({ splitBeatsInto: v })}
              />
            </SettingRow>
          </div>

          <div className="modal-column">
            <SettingRow label="Scale">
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
            </SettingRow>
            <SettingRow label="Start on">
              <div className="modal-select-group">
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
            </SettingRow>
            <SettingRow label="Range">
              <Stepper
                value={settings.rangeOctaves}
                unit="octave"
                min={1}
                max={4}
                onChange={(v) => update({ rangeOctaves: v })}
              />
            </SettingRow>
          </div>
        </div>

        <button className="modal-confirm" onClick={onConfirm} aria-label="설정 적용">
          ✓
        </button>
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
  onChange,
}: {
  value: number;
  unit?: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="stepper">
      <span className="stepper-value">
        {value}
        {unit ? ` ${unit}` : ""}
      </span>
      <button
        className="stepper-button"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="감소"
      >
        −
      </button>
      <button
        className="stepper-button"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="증가"
      >
        +
      </button>
    </div>
  );
}
