import { useState, type ReactNode } from "react";
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

export type ThemeName = "monochrome";
export type LanguageCode = "ko" | "en";

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

const BARS_RECOMMENDED_MAX = 16;

// 2는 목록에 직접 넣어서 고를 수 있게 하진 않지만, Range 4옥타브 + Middle 조합일 때
// 자동으로 2로 내려가는 경우가 있어서(Middle을 진짜 가운데로 두려고) 드롭다운에 그 값이
// 선택된 채로 정상 표시되려면 옵션 목록에도 있어야 함.
const OCTAVE_OPTIONS = [2, 3, 4, 5, 6];
type Tab = "piano-roll" | "personal";

// Chrome Music Lab 의 Song Maker 설정 화면 레이아웃 참고 — Length(좌측), Scale/Start on/Range(우측), 가운데 확인 버튼.
// Beats per bar / Split beats into는 사용자 요청으로 UI에서 뺐음 (내부적으로는 기본값 4/2로 고정 사용).
// 설정을 "피아노 롤 설정"(그리드 구조 — 확인 버튼 눌러야 적용)과 "개별 설정"(테마/언어 — 바로 적용)
// 두 탭으로 나눔. 개별 설정은 그리드를 안 건드리니까 onChange 즉시 반영, 확인 버튼과 무관하게 동작함.
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
            피아노 롤 설정
          </button>
          <button
            className={tab === "personal" ? "modal-tab active" : "modal-tab"}
            onClick={() => setTab("personal")}
          >
            개별 설정
          </button>
        </div>

        {tab === "piano-roll" ? (
          <>
            <div className="modal-settings">
              <div className="modal-settings-row modal-settings-row-2">
                <div className="modal-field">
                  <span className="modal-field-label">
                    Length
                    {settings.bars > BARS_RECOMMENDED_MAX && (
                      <span
                        className="modal-field-warning"
                        title={`${BARS_RECOMMENDED_MAX}마디까지가 권장 크기예요. 그 이상은 그리드가 무거워질 수 있어요.`}
                      >
                        !
                      </span>
                    )}
                  </span>
                  <Stepper
                    value={settings.bars}
                    unit="bars"
                    min={1}
                    max={25}
                    onChange={(v) => update({ bars: v })}
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
                      // Range를 4옥타브로 올릴 때 시작 옥타브가 "Middle"(4)이면, 정말로 4를
                      // 가운데로 두고 위아래로 펼쳐지게 함 — 4옥타브 범위는 시작 옥타브부터 위로
                      // 4칸을 쌓으니까(startOctave ~ startOctave+4), 2에서 시작해야 2~6옥타브가
                      // 되면서 한가운데가 딱 4(Middle)가 됨. (예전엔 3으로만 낮춰서 3~7옥타브가
                      // 됐는데, 그러면 가운데가 5가 돼버려서 Middle을 골랐는데도 안 가운데였음.)
                      if (v === 4 && settings.startOctave === 4) {
                        update({ rangeOctaves: v, startOctave: 2 });
                      } else {
                        update({ rangeOctaves: v });
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <button className="modal-confirm" onClick={onConfirm} aria-label="설정 적용">
              ✓
            </button>
          </>
        ) : (
          <div className="modal-grid modal-grid-single">
            <div className="modal-column">
              <SettingRow label="테마 설정">
                <select
                  className="modal-select"
                  value={theme}
                  onChange={(e) => onThemeChange(e.target.value as ThemeName)}
                >
                  <option value="monochrome">모노크롬 (기본)</option>
                </select>
              </SettingRow>
              <SettingRow label="언어 설정">
                <select
                  className="modal-select"
                  value={language}
                  onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </SettingRow>
              <SettingRow label="실험 기능">
                <label className="modal-toggle">
                  <input
                    type="checkbox"
                    checked={experimentalFeatures}
                    onChange={(e) => onExperimentalFeaturesChange(e.target.checked)}
                  />
                  <span className="modal-toggle-track" />
                </label>
              </SettingRow>
              <p className="modal-hint">
                테마/언어는 곧 더 추가될 예정이에요. 그리드 크기는 Ctrl+휠로 바꿀 수 있어요(4옥타브일
                때만 축소 가능).
              </p>
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
}: {
  value: number;
  unit?: string;
  min: number;
  max: number;
  step?: number;
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
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label="감소"
      >
        −
      </button>
      <button
        className="stepper-button"
        onClick={() => onChange(Math.min(max, value + step))}
        aria-label="증가"
      >
        +
      </button>
    </div>
  );
}
