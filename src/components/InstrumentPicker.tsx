import { INSTRUMENTS, INSTRUMENT_CATEGORIES } from "../lib/instruments";

interface InstrumentPickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

// "악기 선택" 버튼을 누르면 뜨는 팝업 — 카테고리(오케스트라/신스/8비트/국악/기타)별로 악기를 나열함.
// 실제 wav 샘플이 붙기 전까지는 고른 악기에 따라 기본 신스의 파형만 바뀜(lib/instruments.ts 참고).
// 레이아웃: 2열 그리드로 1행(오케스트라/신스), 2행(8비트/국악)을 나란히 두고, 마지막 "기타"만
// 전체 너비로 펼쳐서 보여줌(카테고리 개수가 홀수라 마지막 하나가 남기 때문).
export function InstrumentPicker({ selectedId, onSelect, onClose }: InstrumentPickerProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="instrument-picker" onClick={(e) => e.stopPropagation()}>
        <div className="instrument-picker-header">
          <span>악기 선택</span>
          <button className="icon-button-ghost" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="instrument-category-grid">
          {INSTRUMENT_CATEGORIES.map((category, index) => {
            const isLast = index === INSTRUMENT_CATEGORIES.length - 1;
            return (
              <div
                className={isLast ? "instrument-category instrument-category-full" : "instrument-category"}
                key={category}
              >
                <span className="instrument-category-label">{category}</span>
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
                      <span>{instrument.name}</span>
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
