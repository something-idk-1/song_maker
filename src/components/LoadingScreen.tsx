import { useEffect, useState } from "react";

interface LoadingScreenProps {
  onFinish: () => void;
  minDurationMs?: number;
}

// 미니 피아노(흰건반 7개 + 검은건반 5개)가 왼쪽부터 순서대로 눌리는 애니메이션.
// 최소 minDurationMs만큼 보여준 다음 페이드아웃하고, 트랜지션 끝나면 onFinish로 완전히 사라짐을 알림.
const WHITE_KEY_WIDTH = 25;
// 검은건반이 들어가는 자리(흰건반 인덱스 기준: C-D, D-E, F-G, G-A, A-B 사이)
const BLACK_KEY_AFTER_WHITE_INDEX = [0, 1, 3, 4, 5];

export function LoadingScreen({ onFinish, minDurationMs = 2000 }: LoadingScreenProps) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setFadingOut(true), minDurationMs);
    return () => clearTimeout(showTimer);
  }, [minDurationMs]);

  useEffect(() => {
    if (!fadingOut) return;
    const hideTimer = setTimeout(onFinish, 400); // CSS 페이드아웃 트랜지션 시간과 맞춤
    return () => clearTimeout(hideTimer);
  }, [fadingOut, onFinish]);

  return (
    <div className={`loading-screen ${fadingOut ? "loading-screen-fade-out" : ""}`}>
      <div className="loading-piano">
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={`white-${i}`}
            className="loading-key loading-key-white"
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
        {BLACK_KEY_AFTER_WHITE_INDEX.map((whiteIndex) => (
          <div
            key={`black-${whiteIndex}`}
            className="loading-key loading-key-black"
            style={{
              left: (whiteIndex + 1) * WHITE_KEY_WIDTH - 8,
              animationDelay: `${(whiteIndex + 0.5) * 90}ms`,
            }}
          />
        ))}
      </div>
      <span className="loading-spinner" />
    </div>
  );
}
