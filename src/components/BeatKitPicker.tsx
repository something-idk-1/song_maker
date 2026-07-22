import { BEAT_KIT_CATEGORIES, BEAT_KITS } from "../lib/beatKits";

interface BeatKitPickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

// 고급 모드 전용 "비트킷 선택" 팝업 — 악기 선택 팝업이랑 똑같은 카테고리 그리드 CSS를 재사용함.
// InstrumentPicker는 카테고리가 5개(홀수)라 마지막 하나만 전체 너비로 펼치는 방식이 맞는데,
// 여기(비트킷)는 카테고리가 "뮤직랩"/"기타" 2개뿐이고 "뮤직랩"에 4개(일렉트로닉/블록/킷/콩가)가
// 몰려있어서, 그 카테고리만 절반 너비(2열 그리드의 1칸)에 갇히면 4개가 한 줄에 다 안 들어가고
// 콩가가 2번째 줄로 밀림. 그래서 여기선 두 카테고리 다 항상 전체 너비로 펼쳐서 한 줄에 나열함.
// 킷마다 행 개수/이름이 달라서(뮤직랩=2행, 8비트 칩튠=12행 등) 킷을 바꾸면 드럼 그리드의 행
// 구성 자체가 바뀜 — 이때 기존에 찍어둔 드럼 노트는 App.tsx에서 정리됨.
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

        <div className="instrument-category-grid">
          {BEAT_KIT_CATEGORIES.map((category) => {
            return (
              <div className="instrument-category instrument-category-full" key={category}>
                <span className="instrument-category-label">{category}</span>
                <div className="instrument-category-list">
                  {BEAT_KITS.filter((k) => k.category === category).map((kit) => (
                    <button
                      key={kit.id}
                      className={
                        kit.id === selectedId ? "instrument-item instrument-item-active" : "instrument-item"
                      }
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
