// docs/DESIGN.md 의 header-bar 스펙: 로고(좌측) - 모드 전환 - 뷰별 툴 클러스터 - nav-pill-group(우측)
import { useEffect, useRef, useState } from "react";

export type ViewName = "piano-roll" | "playlist";
export type AppMode = "simple" | "advanced";

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  view: ViewName;
  onViewChange: (view: ViewName) => void;
  // 간단 모드는 이거 하나로 전체 초기화. 고급 모드는 버튼에 메뉴가 붙어서 멜로디/비트/전체 중에 고름.
  onRestartAll: () => void;
  onRestartMelody: () => void;
  onRestartBeat: () => void;
}

export function Header({
  mode,
  onModeChange,
  view,
  onViewChange,
  onRestartAll,
  onRestartMelody,
  onRestartBeat,
}: HeaderProps) {
  const [restartMenuOpen, setRestartMenuOpen] = useState(false);
  const restartMenuRef = useRef<HTMLDivElement>(null);

  // 메뉴 바깥 클릭하면 닫히게 (트랜스포트바 저장 메뉴랑 같은 패턴).
  useEffect(() => {
    if (!restartMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (restartMenuRef.current && !restartMenuRef.current.contains(e.target as Node)) {
        setRestartMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [restartMenuOpen]);

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
        {mode === "advanced" ? (
          <div className="restart-menu" ref={restartMenuRef}>
            {restartMenuOpen && (
              <div className="restart-menu-panel">
                <button
                  className="restart-menu-item"
                  onClick={() => {
                    onRestartMelody();
                    setRestartMenuOpen(false);
                  }}
                >
                  멜로디 초기화
                </button>
                <button
                  className="restart-menu-item"
                  onClick={() => {
                    onRestartBeat();
                    setRestartMenuOpen(false);
                  }}
                >
                  비트 초기화
                </button>
                <button
                  className="restart-menu-item"
                  onClick={() => {
                    onRestartAll();
                    setRestartMenuOpen(false);
                  }}
                >
                  전체 초기화
                </button>
              </div>
            )}
            <button
              className="header-restart-button"
              onClick={() => setRestartMenuOpen((v) => !v)}
              title="새로 시작"
            >
              재시작 ▾
            </button>
          </div>
        ) : (
          <button className="header-restart-button" onClick={onRestartAll} title="새로 시작">
            재시작
          </button>
        )}
      </div>
    </header>
  );
}
