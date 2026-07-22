import { BEAT_KIT_CATEGORIES, BEAT_KITS, getBeatKitDisplayName, getBeatKitCategoryLabel } from "../lib/beatKits";
import { t, type Language } from "../lib/i18n";

interface BeatKitPickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  language: Language;
}

// 고급 모드 전용 "비트킷 선택" 팝업 — 악기 선택 팝업이랑 똑같은 카테고리 그리드 CSS를 재사용함.
// InstrumentPicker는 카테고리가 5개(홀수)라 마지막 하나만 전체 너비로 펼치는 방식이 맞는데,
// 여기(비트킷)는 카테고리가 "Music Lab"/"Other" 2개뿐이고 "Music Lab"에 4개(Electronic/Blocks/Kit/Conga)가
// 몰려있어서, 그 카테고리만 절반 너비(2열 그리드의 1칸)에 갇히면 4개가 한 줄에 다 안 들어가고
// Conga가 2번째 줄로 밀림. 그래서 여기선 두 카테고리 다 항상 전체 너비로 펼쳐서 한 줄에 나열함.
// 킷마다 행 개수/이름이 달라서(뮤직랩=2행, 8비트 칩튠=12행 등) 킷을 바꾸면 드럼 그리드의 행
// 구성 자체가 바뀜 — 이때 기존에 찍어둔 드럼 노트는 App.tsx에서 정리됨.
export function BeatKitPicker({ selectedId, onSelect, onClose, language }: BeatKitPickerProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="instrument-picker" onClick={(e) => e.stopPropagation()}>
        <div className="instrument-picker-header">
          <span>{t(language, "beatKitPicker.title")}</span>
          <button className="icon-button-ghost" onClick={onClose} aria-label={t(language, "beatKitPicker.close")}>
            ✕
          </button>
        </div>

        <div className="instrument-category-grid">
          {BEAT_KIT_CATEGORIES.map((category) => {
            return (
              <div className="instrument-category instrument-category-full" key={category}>
                <span className="instrument-category-label">{getBeatKitCategoryLabel(category, language)}</span>
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
                      <span>{getBeatKitDisplayName(kit, language)}</span>
                      <span className="instrument-item-note">
                        {language === "ko" ? `${kit.rowLabels.length}행` : `${kit.rowLabels.length} rows`}
                      </span>
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
