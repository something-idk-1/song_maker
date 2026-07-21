# Music Maker

브라우저에서 그리드를 클릭해서 MIDI 패턴을 만들고, 여러 악기로 재생해보는 미니 작곡 툴. BandLab/FL Studio를 참고한 화이트모드 UI, 헤더+캔버스+트랜스포트바 구조.

## 문서

- [`docs/PRD.md`](docs/PRD.md) — 기획 문서 (문제정의, 유저스토리, 핵심 기능 스펙, 제외 스코프)
- [`docs/DESIGN.md`](docs/DESIGN.md) — 디자인 시스템 (컬러/타이포/컴포넌트 스펙, 헤더·트랜스포트바 레이아웃 규칙)
- [`AGENT.md`](AGENT.md) — AI 코딩 도구(Antigravity 등)에게 알려줄 기술 스택/코딩 규칙

## 기술 스택 (예정)

- Vite + React + TypeScript
- Tone.js (오디오 재생/스케줄링)
- Tone.Sampler + 직접 보유한 wav 샘플 (기본 신스 대신 사용)

## 현재 우선순위 (MVP)

1. 스텝 시퀀서 그리드 화면 (피아노 롤) — 그리드 클릭으로 노트 입력, 재생
2. 악기 선택 (2~3종)
3. 재생 컨트롤 (재생/정지, 템포, undo/redo, 저장)

플레이리스트(패턴 타임라인)와 저장/공유 기능은 시간이 남으면 진행하는 확장 스코프.

## 실행 방법

```bash
npm install
npm run dev
```

(프로젝트 초기 세팅 전 — Vite 스캐폴딩 예정)
