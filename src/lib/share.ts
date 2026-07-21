// 로그인/서버 없이 URL 해시에 프로젝트 상태를 통째로 인코딩해서 "링크로 공유"를 구현함.
// 데이터가 커지면(마디를 아주 많이 늘리면) URL이 길어질 수 있음 — 지금 스코프에선 충분함.
export function encodeProjectToUrl(payload: unknown): string {
  const json = JSON.stringify(payload);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return `${location.origin}${location.pathname}#data=${encoded}`;
}

export function decodeProjectFromHash<T>(): T | null {
  const match = location.hash.match(/data=([^&]+)/);
  if (!match) return null;
  try {
    const json = decodeURIComponent(escape(atob(match[1])));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
