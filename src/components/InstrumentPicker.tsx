import { INSTRUMENTS, INSTRUMENT_CATEGORIES, getInstrumentDisplayName, getInstrumentCategoryLabel } from "../lib/instruments";
import { t, type Language } from "../lib/i18n";

interface InstrumentPickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  language: Language;
}

// "악기 선택" 버튼을 누르면 뜨는 팝업 — 카테고리(오케스트라/신스/8비트/국악/마인크래프트/기타)별로
// 악기를 나열함. 실제 wav 샘플이 붙기 전까지는 고른 악기에 따라 기본 신스의 파형만 바뀜
// (lib/instruments.ts 참고). 예전엔 2열 그리드(마지막 카테고리만 전체 너비)였는데, 카테고리가
// 계속 늘어나면서(마인크래프트 추가 등) 특정 카테고리(악기 개수 많은 쪽)가 절반 너비에 갇혀서
// 한 줄에 다 안 들어가고 줄바꿈되는 문제가 있었음(BeatKitPicker에서도 같은 문제 겪음). 그래서
// 여기도 카테고리 하나당 한 줄(전체 너비)씩 세로로 쌓는 방식으로 통일함.
export function InstrumentPicker({ selectedId, onSelect, onClose, language }: InstrumentPickerProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="instrument-picker" onClick={(e) => e.stopPropagation()}>
        <div className="instrument-picker-header">
          <span>{t(language, "instrumentPicker.title")}</span>
          <button className="icon-button-ghost" onClick={onClose} aria-label={t(language, "instrumentPicker.close")}>
            ✕
          </button>
        </div>

        <div className="instrument-category-grid">
          {INSTRUMENT_CATEGORIES.map((category) => {
            return (
              <div className="instrument-category instrument-category-full" key={category}>
                <span className="instrument-category-label">{getInstrumentCategoryLabel(category, language)}</span>
                <div className="instrument-category-list">
                  {INSTRUMENTS.filter((i) => i.category === category).map((instrument) => (
                    <button
                      key={instrument.id}
                      className={
                        instrument.id === selectedId
                          ? "instrument-item instrument-item-active"
                          : "instrument-item"
                      }
                      onClick={() => {
                        onSelect(instrument.id);
                        onClose();
                      }}
                    >
                      <span>{getInstrumentDisplayName(instrument, language)}</span>
                      {instrument.note && <span className="instrument-item-note">{instrument.note}</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
