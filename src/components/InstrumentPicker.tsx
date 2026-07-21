import { INSTRUMENTS, INSTRUMENT_CATEGORIES } from "../lib/instruments";

interface InstrumentPickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

// "악기 선택" 버튼을 누르면 뜨는 팝업 — 카테고리(건반/현악/관악/국악)별로 악기를 나열함.
// 실제 wav 샘플이 붙기 전까지는 고른 악기에 따라 기본 신스의 파형만 바뀜(lib/instruments.ts 참고).
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

        {INSTRUMENT_CATEGORIES.map((category) => (
          <div className="instrument-category" key={category}>
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
        ))}
      </div>
    </div>
  );
}
