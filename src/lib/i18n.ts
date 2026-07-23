export type Language = "en" | "ko" ;

type StringKey = keyof typeof STRINGS;

const STRINGS = {
  "header.selectPattern": { en: "Select pattern", ko: "패턴 선택" },
  "header.pattern": { en: "Pattern ▾", ko: "패턴 ▾" },
  "header.playlist": { en: "Playlist", ko: "플레이리스트" },
  "header.pianoRoll": { en: "Piano Roll", ko: "피아노 롤" },
  "header.restartMelody": { en: "Restart Melody", ko: "멜로디 초기화" },
  "header.restartBeat": { en: "Restart Beat", ko: "비트 초기화" },
  "header.restartAll": { en: "Restart All", ko: "전체 초기화" },
  "header.startOver": { en: "Start over", ko: "새로 시작" },
  "header.restartMenu": { en: "Restart ▾", ko: "재시작 ▾" },
  "header.restart": { en: "Restart", ko: "재시작" },

  "transport.mergeToAverage": { en: "Merge to average", ko: "평균으로 합치기" },
  "transport.adjustSeparately": { en: "Adjust melody/beat separately", ko: "멜로디/비트 따로 조절" },
  "transport.masterVolume": { en: "Master volume", ko: "마스터 볼륨" },
  "transport.melody": { en: "Melody", ko: "멜로디" },
  "transport.beat": { en: "Beat", ko: "비트" },
  "transport.melodyVolume": { en: "Melody volume", ko: "멜로디 볼륨" },
  "transport.beatVolume": { en: "Beat volume", ko: "비트 볼륨" },
  "transport.settings": { en: "Settings", ko: "설정" },
  "transport.importMidiBeta": { en: "Import MIDI (beta)", ko: "MIDI 불러오기(베타)" },
  "transport.exportMidi": { en: "Export MIDI", ko: "MIDI 내보내기" },
  "transport.exportWav": { en: "Export WAV", ko: "WAV로 내보내기" },
  "transport.copyLink": { en: "Copy Link", ko: "링크 복사" },
  "transport.save": { en: "Save ▾", ko: "저장 ▾" },

  "settings.pianoRollTab": { en: "Piano Roll Settings", ko: "피아노 롤 설정" },
  "settings.personalTab": { en: "Personal Settings", ko: "개별 설정" },
  "settings.applySettings": { en: "Apply settings", ko: "설정 적용" },
  "settings.theme": { en: "Theme", ko: "테마 설정" },
  "settings.monochromeDefault": { en: "Monochrome (default)", ko: "모노크롬 (기본)" },
  "settings.language": { en: "Language", ko: "언어 설정" },
  "settings.experimentalFeatures": { en: "Experimental Features", ko: "실험 기능" },
  "settings.combinedAdvancedView": {
    en: "Combine melody + drum view (Advanced mode)",
    ko: "멜로디+드럼 화면 합치기 (고급 모드 전용)",
  },
  "settings.hint": {
    en: "More themes and languages are coming soon. You can resize the grid with Ctrl+Scroll (shrinking only works at the 4-octave range).",
    ko: "테마/언어는 곧 더 추가될 예정이에요. 그리드 크기는 Ctrl+휠로 바꿀 수 있어요(4옥타브일 때만 축소 가능).",
  },
  "settings.decrease": { en: "Decrease", ko: "감소" },
  "settings.increase": { en: "Increase", ko: "증가" },
  "settings.experimentalPrefix": { en: "Currently testing:", ko: "현재 실험 중:" },

  "experimental.midiImport": { en: "MIDI Import", ko: "MIDI 불러오기" },
  "experimental.octaveTranspose": { en: "Ctrl+Arrow Octave Transpose", ko: "Ctrl+화살표 옥타브 이동" },
  "experimental.longerBars": { en: "Extended Length (up to 25 bars)", ko: "마디 길이 확장 (최대 25마디)" },
  "experimental.higherBpm": { en: "Extended BPM (up to 500)", ko: "BPM 확장 (최대 500)" },

  "export.close": { en: "Close", ko: "닫기" },
  "export.fileName": { en: "File name", ko: "파일 이름" },
  "export.cancel": { en: "Cancel", ko: "취소" },
  "export.export": { en: "Export", ko: "내보내기" },
  "export.titleMidi": { en: "Export MIDI", ko: "MIDI 내보내기" },
  "export.titleWav": { en: "Export WAV", ko: "WAV로 내보내기" },

  "instrumentPicker.title": { en: "Choose Instrument", ko: "악기 선택" },
  "instrumentPicker.close": { en: "Close", ko: "닫기" },

  "beatKitPicker.title": { en: "Choose Beat Kit", ko: "비트킷 선택" },
  "beatKitPicker.close": { en: "Close", ko: "닫기" },

  "playlist.placeholder": {
    en: "Playlist view is P1 — not implemented yet",
    ko: "플레이리스트 화면은 P1 — 아직 구현 전",
  },

  "app.midiImportFailed": {
    en: "Couldn't find any notes in the imported MIDI that fit the current grid (bars/range). Try increasing Length or Range and import again.",
    ko: "가져온 MIDI에서 지금 그리드(마디 수/음역대)에 맞는 노트를 못 찾았어요. Length나 Range 설정을 넉넉히 늘리고 다시 시도해보세요.",
  },
  "app.shareCopied": { en: "Share link copied to clipboard!", ko: "공유 링크가 클립보드에 복사됐어요!" },
  "app.shareCopyPrompt": { en: "Copy the link below:", ko: "아래 링크를 복사하세요:" },

  "tip.middleDrag": {
    en: "Tip: Hold the middle mouse button and drag to pan around the grid.",
    ko: "Tip: 마우스 휠(가운데) 버튼을 누른 채로 드래그하면 화면이 움직여요.",
  },
  "tip.dragNotes": {
    en: "Tip: Click and drag across cells to draw multiple notes at once.",
    ko: "Tip: 여러 칸을 드래그하면 노트를 한 번에 여러 개 찍을 수 있어요.",
  },
  "tip.keyboardPreview": {
    en: "Tip: Use your keyboard (Z, S, X, D, C...) to preview notes like a piano.",
    ko: "Tip: 키보드(Z, S, X, D, C...)로 건반처럼 음을 미리 들어볼 수 있어요.",
  },
  "tip.octaveTranspose": {
    en: "Tip: Ctrl+Up / Ctrl+Down moves every note up or down an octave.",
    ko: "Tip: Ctrl+위쪽/아래쪽 화살표를 누르면 모든 노트가 한 옥타브씩 이동해요.",
  },
  "tip.playbackStart": {
    en: "Tip: Left/Right arrow keys move the playback start marker — press Space to play from there.",
    ko: "Tip: 좌/우 방향키로 재생 시작 위치를 옮기고, 스페이스바를 누르면 거기서부터 재생돼요.",
  },
  "tip.spacePlay": { en: "Tip: Press Space to play or pause.", ko: "Tip: 스페이스바로 재생/정지할 수 있어요." },
  "tip.undoRedo": {
    en: "Tip: Ctrl+Z undoes, Ctrl+Shift+Z redoes.",
    ko: "Tip: Ctrl+Z로 되돌리고, Ctrl+Shift+Z로 다시 실행할 수 있어요.",
  },
  "tip.zoom": {
    en: "Tip: Ctrl+Scroll zooms the grid in and out.",
    ko: "Tip: Ctrl+휠로 그리드를 확대/축소할 수 있어요.",
  },
} as const;

export function t(language: Language, key: StringKey): string {
  return STRINGS[key]?.[language] ?? STRINGS[key]?.en ?? key;
}

export const EXPERIMENTAL_FEATURE_KEYS: StringKey[] = [
  "experimental.midiImport",
  "experimental.octaveTranspose",
  "experimental.longerBars",
  "experimental.higherBpm",
];

export const LOADING_TIP_KEYS: StringKey[] = [
  "tip.spacePlay",
  "tip.undoRedo",
  "tip.zoom",
  "tip.middleDrag",
  "tip.dragNotes",
  "tip.keyboardPreview",
  "tip.octaveTranspose",
  "tip.playbackStart",
];
