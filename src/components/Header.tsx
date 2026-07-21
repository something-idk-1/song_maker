// docs/DESIGN.md 의 header-bar 스펙: 로고(좌측) - 뷰별 툴 클러스터(중앙좌) - nav-pill-group(중앙우) - 설정/프로필(우측)
export type ViewName = "piano-roll" | "playlist";

interface HeaderProps {
  view: ViewName;
  onViewChange: (view: ViewName) => void;
  ttkp: boolean;
  onToggleTtkp: () => void;
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  stepEdit: boolean;
  onToggleStepEdit: () => void;
}

export function Header({
  view,
  onViewChange,
  ttkp,
  onToggleTtkp,
  autoScroll,
  onToggleAutoScroll,
  stepEdit,
  onToggleStepEdit,
}: HeaderProps) {
  return (
    <header className="header-bar">
      <div className="header-left">
        <span className="logo">Music Maker</span>

        {view === "piano-roll" ? (
          <div className="icon-tool-group">
            {/* TTKP: z x c v 등으로 키보드 연주하는 토글 (FL Studio 용어) */}
            <button
              className={`icon-tool-button ${ttkp ? "active" : ""}`}
              onClick={onToggleTtkp}
              title="TTKP (Typing Keyboard To Piano)"
            >
              T
            </button>
            {/* Auto-scroll: 재생 중 그리드가 재생바를 따라가는 토글 */}
            <button
              className={`icon-tool-button ${autoScroll ? "active" : ""}`}
              onClick={onToggleAutoScroll}
              title="Auto-scroll (재생바 따라가기)"
            >
              A
            </button>
            {/* Step-edit: 단축키로 그리드에 노트를 입력하는 토글 */}
            <button
              className={`icon-tool-button ${stepEdit ? "active" : ""}`}
              onClick={onToggleStepEdit}
              title="Step-edit (단축키로 MIDI 입력)"
            >
              S
            </button>
          </div>
        ) : (
          <button className="icon-tool-button" title="패턴 선택">
            패턴 ▾
          </button>
        )}
      </div>

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

      <div className="header-right">
        <button className="icon-button-ghost" title="설정">
          ⚙
        </button>
        <div className="avatar-circle">U</div>
      </div>
    </header>
  );
}
