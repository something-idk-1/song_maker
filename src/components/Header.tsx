// docs/DESIGN.md 의 header-bar 스펙: 로고(좌측) - 모드 전환 - 뷰별 툴 클러스터 - nav-pill-group(우측)
// 아 집에 가고 싶 다 시 바 아 ㅏㅏㅏ 아니 왜 벌써 6시 42분이야집가고싶다집가고싶다집가고싶다집가고싶다집가고싶다집가고싶다집가고싶다집가고싶다집가고싶다집가고싶다집가고싶다집가고싶다집가고싶다집가고싶다집가고싶다집가고싶다집가고싶다집가고싳다집가쇄머ㅣ나어먼엄ㄴ아ㅣ미ㅓㅇ미ㅏㄴ어ㅏㅣㅁㅇ
export type ViewName = "piano-roll" | "playlist";
export type AppMode = "simple" | "advanced";

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  view: ViewName;
  onViewChange: (view: ViewName) => void;
  onRestart: () => void;
}

export function Header({ mode, onModeChange, view, onViewChange, onRestart }: HeaderProps) {
  return (
    <header className="header-bar">
      <div className="header-left">
        <span className="logo">Song Maker</span>

        <div className="segmented-toggle">
          <button
            className={mode === "simple" ? "active" : ""}
            onClick={() => onModeChange("simple")}
          >
            SIMPLE
          </button>
          <button
            className={mode === "advanced" ? "active" : ""}
            onClick={() => onModeChange("advanced")}
          >
            ADVANCED
          </button>
        </div>

        {mode === "advanced" && view === "playlist" && (
          <button className="icon-tool-button" title="패턴 선택">
            패턴 ▾
          </button>
        )}
      </div>

      {mode === "advanced" && (
        <div className="nav-pill-group">
          <button
            className={`nav-pill ${view === "playlist" ? "active" : ""}`}
            onClick={() => onViewChange("playlist")}
          >
            플레이리스트
          </button>
          <button
            className={`nav-pill ${view === "piano-roll" ? "active" : ""}`}
            onClick={() => onViewChange("piano-roll")}
          >
            피아노 롤
          </button>
        </div>
      )}

      <div className="header-right">
        <button className="header-restart-button" onClick={onRestart} title="새로 시작">
          재시작
        </button>
      </div>
    </header>
  );
}
