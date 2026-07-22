import { t, type Language } from "../lib/i18n";

// REQ-04 (P1) 자리 표시자. 시간이 남으면 트랙 헤더 + 패턴 타임라인(FL Studio Playlist 미니버전)으로 구현.
// docs/DESIGN.md의 "Playlist unification" 섹션 참고 — header/transport-bar 공유 + 트랙별 색상 구분 필요.
export function PlaylistPlaceholder({ language }: { language: Language }) {
  return <div className="playlist-placeholder">{t(language, "playlist.placeholder")}</div>;
}
