import { BEAT_KITS } from "../lib/beatKits";

interface BeatKitPickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

// 고급 모드 전용 "비트킷 선택" 팝업 — 악기 선택 팝업이랑 다르게 카테고리 구분 없이 그냥 평평한
// 목록으로 보여줌. 킷마다 행 개수/이름이 달라서(뮤직랩 기본=2행, 8비트 칩튠=12행 등) 킷을 바꾸면
// 드럼 그리드의 행 구성 자체가 바뀜 — 이때 기존에 찍어둔 드럼 노트는 App.tsx에서 정리됨.
export function BeatKitPicker({ selectedId, onSelect, onClose }: BeatKitPickerProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="instrument-picker" onClick={(e) => e.stopPropagation()}>
        <div className="instrument-picker-header">
          <span>비트킷 선택</span>
          <button className="icon-button-ghost" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="instrument-category-list">
          {BEAT_KITS.map((kit) => (
            <button
              key={kit.id}
              className={kit.id === selectedId ? "instrument-item instrument-item-active" : "instrument-item"}
              onClick={() => {
                onSelect(kit.id);
                onClose();
              }}
            >
              <span>{kit.name}</span>
              <span className="instrument-item-note">{kit.rowLabels.length}행</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
