import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header, type AppMode, type ViewName } from "./components/Header";
import { TransportBar } from "./components/TransportBar";
import { PianoRollGrid, type PianoRollGridHandle } from "./components/PianoRollGrid";
import { PlaylistPlaceholder } from "./components/PlaylistPlaceholder";
import { LoadingScreen } from "./components/LoadingScreen";
import { InstrumentPicker } from "./components/InstrumentPicker";
import { BeatKitPicker } from "./components/BeatKitPicker";
import { ExportNameModal } from "./components/ExportNameModal";
import {
  SettingsModal,
  type GridSettings,
  type LanguageCode,
  type ThemeName,
} from "./components/SettingsModal";
import { buildScaleRows, isDrumRowLabel, keyToNoteName } from "./lib/notes";
import { getNextSimpleModeInstrumentId } from "./lib/instruments";
import {
  DEFAULT_BEAT_KIT_ID,
  getBeatKitById,
  getNextSimpleModeBeatKitId,
} from "./lib/beatKits";
import { buildMidiBytes, midiNotesToCells, parseMidiBytes } from "./lib/midi";
import { decodeProjectFromHash, encodeProjectToUrl } from "./lib/share";
import { renderToAudioBuffer } from "./lib/renderAudio";
import { audioBufferToWavBlob } from "./lib/wav";
import { cellKey, useSequencer, type Instrument } from "./hooks/useSequencer";

const MAX_HISTORY = 4; // undo는 3번까지만 가능하게 — "현재 + 최근 3개"

const DEFAULT_SETTINGS: GridSettings = {
  bars: 4,
  beatsPerBar: 4,
  splitBeatsInto: 2,
  scale: "Major",
  startNote: "C",
  startOctave: 4,
  rangeOctaves: 2,
};

interface SharedPayload {
  settings: GridSettings;
  mode: AppMode;
  instrument: Instrument;
  bpm: number;
  cells: string[];
}

function App() {
  const [showLoading, setShowLoading] = useState(true);

  const [mode, setMode] = useState<AppMode>("simple");
  const [view, setView] = useState<ViewName>("piano-roll");

  const [instrument, setInstrument] = useState<Instrument>("piano");
  const [bpm, setBpm] = useState(96);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80); // 마스터 볼륨(0~100)
  const [melodyVolume, setMelodyVolume] = useState(100); // 멜로디 채널만 따로(0~100, 100=보정 없음)
  const [beatVolume, setBeatVolume] = useState(100); // 드럼 채널만 따로(0~100, 100=보정 없음)

  // 멜로디 행에 쓸 악기(피아노/마림바/스트링 등) — 간단/고급 모드 둘 다 공통으로 적용됨.
  // 간단 모드 기본값은 마림바(SIMPLE_MODE_INSTRUMENT_CYCLE 참고).
  const [instrumentId, setInstrumentId] = useState("marimba");
  const [showInstrumentPicker, setShowInstrumentPicker] = useState(false);

  // 드럼 행에 쓸 비트킷(lib/beatKits.ts) — 고급 모드 전용으로 고를 수 있음. 간단 모드는 항상
  // 뮤직랩 기본(Kick/Snare)으로 고정이라 이 값은 무시됨(noteRows 계산 참고).
  const [beatKitId, setBeatKitId] = useState(DEFAULT_BEAT_KIT_ID);
  const [showBeatKitPicker, setShowBeatKitPicker] = useState(false);

  const [settings, setSettings] = useState<GridSettings>(DEFAULT_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<GridSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  // "MIDI 내보내기"/"WAV로 내보내기" 누르면 파일 이름을 정할 수 있는 자체 팝업이 뜸(브라우저 기본
  // window.prompt 대신 씀). null이면 안 열림, "midi"/"wav"면 해당 종류의 이름 입력 팝업이 열림.
  const [exportModalKind, setExportModalKind] = useState<"midi" | "wav" | null>(null);

  // "개별 설정" — 그리드 구조랑 무관해서 확인 버튼 없이 바로 적용됨. 테마/언어 시스템 자체는 아직
  // 없어서 지금은 값만 들고 있는 상태(스텁). 나중에 실제 테마 CSS/i18n 붙일 때 이 state를 그대로 씀.
  const [theme, setTheme] = useState<ThemeName>("monochrome");
  const [language, setLanguage] = useState<LanguageCode>("ko");
  // 그리드 셀 크기 배율 — 1 = 기존 기본 크기(44x32). 기본값을 1.2배로 키워서 시작함.
  // 축소(1보다 작게)는 4옥타브(행이 많아서 화면에 안 들어갈 때)일 때만 허용함 —
  // 그보다 좁은 범위에서 축소하면 그리드가 괜히 작아 보여서 이상함.
  const [gridZoom, setGridZoom] = useState(1.2);
  const clampZoom = useCallback(
    (v: number) => {
      const minZoom = settings.rangeOctaves === 4 ? 0.6 : 1;
      return Math.min(2.5, Math.max(minZoom, v));
    },
    [settings.rangeOctaves],
  );

  // Range를 4옥타브 밑으로 낮췄는데 축소된 상태로 남아있으면 다시 기본 크기로 되돌림.
  useEffect(() => {
    if (settings.rangeOctaves !== 4 && gridZoom < 1) {
      setGridZoom(1);
    }
  }, [settings.rangeOctaves, gridZoom]);
  // 실험 기능 토글 — 켜면 아직 다듬는 중인 기능들이 (베타) 딱지 달고 노출됨. 지금은 MIDI 불러오기부터.
  const [experimentalFeatures, setExperimentalFeatures] = useState(false);

  const stepCount = settings.bars * settings.beatsPerBar * settings.splitBeatsInto;

  // 멜로디 스케일 행 + 드럼 행을 합친 하나의 그리드로 관리함. 그래야 고급 모드에서 피아노/드럼
  // 토글을 눌러도 그 안에 찍힌 노트가 서로 안 섞이고, 재생할 때도 지금 안 보이는 쪽(예: 드럼 보는
  // 동안의 멜로디)까지 같이 소리 남 — FL스튜디오 채널랙처럼 "패턴은 다 같이 재생되고, 화면엔
  // 하나씩만 보여줌". 드럼 행은 두 모드 다 지금 선택된 비트킷(beatKitId)의 행을 그대로 씀 —
  // 간단 모드는 뮤직랩 4개 중에서만 순환(handleCycleBeatKit), 고급 모드는 전체 킷 중에서 고름.
  // 멜로디 행 개수 — 드럼 블록이 noteRows 안에서 어디부터 시작하는지(=드럼 행 안에서 몇 번째인지
  // 계산할 때 기준점)를 알아야 뮤직랩 킷의 위/아래 모양(삼각형/원)을 라벨 텍스트가 아니라 위치로 정할 수 있음.
  const melodyRowCount = useMemo(
    () =>
      buildScaleRows(settings.scale, settings.startNote, settings.startOctave, settings.rangeOctaves)
        .length,
    [settings],
  );

  const noteRows = useMemo(() => {
    const melodyRows = buildScaleRows(
      settings.scale,
      settings.startNote,
      settings.startOctave,
      settings.rangeOctaves,
    );
    const drumRows = getBeatKitById(beatKitId).rowLabels;
    return [...melodyRows, ...drumRows];
  }, [settings, beatKitId]);

  // 행이 멜로디인지 드럼인지로 자동 결정 — 더 이상 instrument 토글이 소리를 바꾸지 않음
  // (토글은 이제 "어떤 행을 화면에 보여줄지"만 담당함. 이후 "악기 선택"이 추가되면 그때 소리를 바꿈).
  const rowInstruments = useMemo<Instrument[]>(
    () => noteRows.map((label) => (isDrumRowLabel(label) ? "drum" : "piano")),
    [noteRows],
  );

  // 고급 모드에서 피아노/드럼 토글로 지금 화면에 어떤 행을 보여줄지 결정함(간단 모드는 항상 전부 다 보임).
  const visibleRows = useMemo<boolean[]>(() => {
    if (mode === "simple") return noteRows.map(() => true);
    return noteRows.map((label) =>
      instrument === "drum" ? isDrumRowLabel(label) : !isDrumRowLabel(label),
    );
  }, [mode, instrument, noteRows]);

  // undo/redo: 활성 셀 스냅샷을 히스토리 배열로 관리.
  const [history, setHistory] = useState<Set<string>[]>([new Set()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  // history[historyIndex]가 상태 리셋 타이밍에 잠깐 어긋나도 안전하게 폴백.
  const activeCells = history[historyIndex] ?? history[history.length - 1] ?? new Set<string>();

  // 드래그로 여러 칸에 노트를 한 번에 찍는 로직은 PianoRollGrid 안에서 ref로 직접 처리함
  // (React state를 안 거쳐야 드래그 중에 그리드 전체가 매번 리렌더링되는 걸 피할 수 있음).
  // 여기서는 드래그가 끝났을 때 최종 결과 한 번만 히스토리에 커밋하면 됨.
  const commitCells = useCallback(
    (next: Set<string>) => {
      setHistory((prev) => {
        const truncated = prev.slice(0, historyIndex + 1);
        let updated = [...truncated, next];
        if (updated.length > MAX_HISTORY) {
          updated = updated.slice(updated.length - MAX_HISTORY);
        }
        return updated;
      });
      setHistoryIndex((i) => Math.min(i + 1, MAX_HISTORY - 1));
    },
    [historyIndex],
  );

  const handleUndo = useCallback(() => {
    setHistoryIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryIndex((i) => Math.min(history.length - 1, i + 1));
  }, [history.length]);

  const gridRef = useRef<PianoRollGridHandle>(null);

  const { currentStep, previewNote, previewPianoNote } = useSequencer({
    noteRows,
    activeCells,
    stepCount,
    bpm,
    isPlaying,
    rowInstruments,
    instrumentId,
    masterVolumePercent: volume,
    melodyVolumePercent: melodyVolume,
    beatVolumePercent: beatVolume,
    beatKitId,
  });

  // 스페이스바로 재생/정지, Ctrl/Cmd+Z로 되돌리기(Shift 누르면 다시하기),
  // FL스튜디오처럼 z/s/x/d/c/v/g/b/h/n/j/m(+윗줄 q~i)로 건반 미리듣기.
  // 입력창(BPM 필드, 드롭다운)에 포커스 있을 땐 무시해서 타이핑을 방해하지 않게 함.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);
      if (isTyping) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((v) => !v);
        return;
      }

      const isUndoKey = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z";
      if (isUndoKey) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      // 조합키(Ctrl/Cmd/Alt) 눌려있으면 건반 미리듣기는 무시 (단축키랑 겹치지 않게).
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const noteName = keyToNoteName(e.key, settings.startOctave);
      if (noteName) {
        previewPianoNote(noteName);
        gridRef.current?.flashNoteLabel(noteName);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, previewPianoNote, settings.startOctave]);

  const handleModeChange = useCallback((next: AppMode) => {
    setMode(next);
    if (next === "simple") setView("piano-roll"); // 간단 모드엔 플레이리스트 화면이 없음
  }, []);

  // 헤더의 "재시작" — 지금 그려놓은 노트를 다 지우고 바로 처음부터 다시 시작함(설정/악기는 유지).
  // 간단 모드는 이거 하나만 씀. 고급 모드는 재시작 버튼에 메뉴가 붙어서 아래 멜로디/비트 초기화도 고를 수 있음.
  const handleRestartAll = useCallback(() => {
    setIsPlaying(false);
    setHistory([new Set()]);
    setHistoryIndex(0);
  }, []);

  // 고급 모드 전용 — 멜로디 노트만 지우고 드럼 노트는 그대로 둠.
  const handleRestartMelody = useCallback(() => {
    setIsPlaying(false);
    const kept = new Set(
      [...activeCells].filter((key) => Number(key.split(":")[0]) >= melodyRowCount),
    );
    commitCells(kept);
  }, [activeCells, melodyRowCount, commitCells]);

  // 고급 모드 전용 — 드럼 노트만 지우고 멜로디 노트는 그대로 둠.
  const handleRestartBeat = useCallback(() => {
    setIsPlaying(false);
    const kept = new Set(
      [...activeCells].filter((key) => Number(key.split(":")[0]) < melodyRowCount),
    );
    commitCells(kept);
  }, [activeCells, melodyRowCount, commitCells]);

  // 간단 모드용 악기 버튼 — 팝업을 여는 대신 정해진 순서(마림바→피아노→바이올린→플루트→신스→마림바...)로
  // 누를 때마다 다음 악기로 바로 넘어감.
  const handleCycleInstrument = useCallback(() => {
    setInstrumentId((current) => getNextSimpleModeInstrumentId(current));
  }, []);

  // 고급 모드 비트킷 선택 — 이제 킷을 바꿔도 찍어둔 노트는 그대로 유지함(멜로디 노트도, 드럼 노트도).
  // 킷마다 행 개수가 달라도(뮤직랩=2행, 8비트 칩튠=12행 등) 그냥 유지하고, 화면에 안 맞는 행은
  // 새 킷 화면에서 단순히 안 보이거나 재생 대상에서 빠질 뿐 — 데이터 자체는 안 지움.
  const handleSelectBeatKit = useCallback((id: string) => {
    setBeatKitId(id);
  }, []);

  // 간단 모드용 비트 버튼 — 악기 버튼이랑 똑같은 방식으로, 뮤직랩 4개(일렉트로닉→블록→킷→콩가→...)를
  // 누를 때마다 순서대로 돌아가며 씀. 뮤직랩 킷은 전부 2행이라 킷이 바뀌어도 찍어둔 드럼 노트는 그대로 씀.
  const handleCycleBeatKit = useCallback(() => {
    setBeatKitId((current) => getNextSimpleModeBeatKitId(current));
  }, []);

  const handleOpenSettings = useCallback(() => {
    setDraftSettings(settings);
    setShowSettings(true);
  }, [settings]);

  const handleConfirmSettings = useCallback(() => {
    // 그리드 크기(행/열)가 바뀌어도 노트를 그냥 날리지 않고, "음이름"과 "스텝 위치" 기준으로
    // 새 그리드에 옮길 수 있는 건 옮김.
    const newStepCount =
      draftSettings.bars * draftSettings.beatsPerBar * draftSettings.splitBeatsInto;
    const newNoteRows = [
      ...buildScaleRows(
        draftSettings.scale,
        draftSettings.startNote,
        draftSettings.startOctave,
        draftSettings.rangeOctaves,
      ),
      ...getBeatKitById(beatKitId).rowLabels,
    ];
    const newRowIndexByNote = new Map(newNoteRows.map((name, index) => [name, index]));

    const migratedCells = new Set<string>();
    activeCells.forEach((key) => {
      const [rowStr, stepStr] = key.split(":");
      const oldRowIndex = Number(rowStr);
      const stepIndex = Number(stepStr);
      if (stepIndex >= newStepCount) return;
      const noteName = noteRows[oldRowIndex];
      const newRowIndex = noteName ? newRowIndexByNote.get(noteName) : undefined;
      if (newRowIndex === undefined) return;
      migratedCells.add(cellKey(newRowIndex, stepIndex));
    });

    setSettings(draftSettings);
    setHistory([migratedCells]);
    setHistoryIndex(0);
    setShowSettings(false);
  }, [draftSettings, activeCells, noteRows, beatKitId]);

  // 실제 다운로드 로직 — 파일 이름(확장자 포함)을 인자로 받음. ExportNameModal에서 이름 정하고
  // 확인 누르면 이게 호출됨(예전엔 "song-maker.mid"로 고정이었는데, 이제 팝업에서 이름을 정함).
  const performExportMidi = useCallback(
    (filename: string) => {
      const bytes = buildMidiBytes({ noteRows, activeCells, bpm });
      // TS 최신 lib.dom 타입에서 Uint8Array가 제네릭(ArrayBufferLike)이 돼서 Blob의 BlobPart랑
      // 타입이 안 맞는 경우가 있음 — 평범한 ArrayBuffer 기반 Uint8Array로 복사해서 넘겨줌.
      const blob = new Blob([new Uint8Array(bytes)], { type: "audio/midi" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [noteRows, activeCells, bpm],
  );

  const handleImportMidi = useCallback(
    async (file: File) => {
      const buffer = await file.arrayBuffer();
      const parsed = parseMidiBytes(buffer);
      const importedBpm = parsed.bpm || bpm;
      const migrated = midiNotesToCells(parsed.notes, noteRows, stepCount, importedBpm);
      setBpm(importedBpm);
      setHistory([migrated]);
      setHistoryIndex(0);
      if (migrated.size === 0) {
        // eslint-disable-next-line no-alert
        alert(
          "가져온 MIDI에서 지금 그리드(마디 수/음역대)에 맞는 노트를 못 찾았어요. Length나 Range 설정을 넉넉히 늘리고 다시 시도해보세요.",
        );
      }
    },
    [noteRows, stepCount, bpm],
  );

  const performExportWav = useCallback(
    async (filename: string) => {
      const buffer = await renderToAudioBuffer({
        noteRows,
        activeCells,
        rowInstruments,
        stepCount,
        bpm,
        instrumentId,
        beatKitId,
        melodyVolumePercent: melodyVolume,
        beatVolumePercent: beatVolume,
      });
      const blob = audioBufferToWavBlob(buffer);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [noteRows, activeCells, rowInstruments, stepCount, bpm, instrumentId, beatKitId, melodyVolume, beatVolume],
  );

  // 저장 메뉴에서 "MIDI 내보내기"/"WAV로 내보내기" 누르면 바로 다운로드하지 않고 이름 입력 팝업부터 염.
  const handleExportMidi = useCallback(() => setExportModalKind("midi"), []);
  const handleExportWav = useCallback(() => setExportModalKind("wav"), []);

  const handleConfirmExportName = useCallback(
    (name: string) => {
      if (exportModalKind === "midi") performExportMidi(`${name}.mid`);
      else if (exportModalKind === "wav") performExportWav(`${name}.wav`);
      setExportModalKind(null);
    },
    [exportModalKind, performExportMidi, performExportWav],
  );

  const handleShareLink = useCallback(() => {
    const payload: SharedPayload = {
      settings,
      mode,
      instrument,
      bpm,
      cells: Array.from(activeCells),
    };
    const url = encodeProjectToUrl(payload);
    navigator.clipboard
      .writeText(url)
      .then(() => {
        // eslint-disable-next-line no-alert
        alert("공유 링크가 클립보드에 복사됐어요!");
      })
      .catch(() => {
        // eslint-disable-next-line no-alert
        prompt("아래 링크를 복사하세요:", url);
      });
  }, [settings, mode, instrument, bpm, activeCells]);

  // 페이지 열릴 때 URL 해시에 공유된 프로젝트 데이터가 있으면 복원함.
  // 복원하고 나면 해시를 바로 지움 — 안 지우면 그 뒤에 노트를 바꾸거나 재시작을 눌러도
  // (예: HMR로 페이지가 다시 마운트되는 등) 주소창에 남아있는 옛날 링크 데이터로 계속
  // 되돌아가는 버그가 있었음. 한 번 불러왔으면 그 링크의 역할은 끝난 거라 지워도 안전함.
  useEffect(() => {
    const restored = decodeProjectFromHash<SharedPayload>();
    if (!restored) return;
    setSettings(restored.settings);
    setDraftSettings(restored.settings);
    setMode(restored.mode);
    setInstrument(restored.instrument);
    setBpm(restored.bpm);
    setHistory([new Set(restored.cells)]);
    setHistoryIndex(0);
    // 여기서 `history`는 위의 React state(노트 히스토리)라서 이름이 겹침 — 브라우저
    // History API는 꼭 window.history로 명시해서 씀.
    window.history.replaceState(null, "", location.pathname + location.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app">
      {showLoading && <LoadingScreen onFinish={() => setShowLoading(false)} minDurationMs={2000} />}
      <Header
        mode={mode}
        onModeChange={handleModeChange}
        view={view}
        onViewChange={setView}
        onRestartAll={handleRestartAll}
        onRestartMelody={handleRestartMelody}
        onRestartBeat={handleRestartBeat}
      />

      <main className="main-content">
        {view === "piano-roll" || mode === "simple" ? (
          <PianoRollGrid
            ref={gridRef}
            noteRows={noteRows}
            stepCount={stepCount}
            stepsPerBar={settings.beatsPerBar * settings.splitBeatsInto}
            activeCells={activeCells}
            visibleRows={visibleRows}
            zoom={gridZoom}
            onZoomChange={(next) => setGridZoom(clampZoom(next))}
            onCommitDrag={commitCells}
            onPreviewNote={previewNote}
            currentStep={currentStep}
            isPlaying={isPlaying}
            useShapedDrumIcons={getBeatKitById(beatKitId).category === "뮤직랩"}
            drumStartIndex={melodyRowCount}
            showLabels={mode === "advanced"}
          />
        ) : (
          <PlaylistPlaceholder />
        )}
      </main>

      <TransportBar
        mode={mode}
        isPlaying={isPlaying}
        onPlayToggle={() => setIsPlaying((v) => !v)}
        instrument={instrument}
        onInstrumentChange={setInstrument}
        bpm={bpm}
        onBpmChange={setBpm}
        currentStep={currentStep}
        stepCount={stepCount}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onImportMidi={handleImportMidi}
        onExportMidi={handleExportMidi}
        onExportWav={handleExportWav}
        onShareLink={handleShareLink}
        onOpenSettings={handleOpenSettings}
        instrumentId={instrumentId}
        onOpenInstrumentPicker={() => setShowInstrumentPicker(true)}
        onCycleInstrument={handleCycleInstrument}
        experimentalFeatures={experimentalFeatures}
        volume={volume}
        onVolumeChange={setVolume}
        melodyVolume={melodyVolume}
        onMelodyVolumeChange={setMelodyVolume}
        beatVolume={beatVolume}
        onBeatVolumeChange={setBeatVolume}
        beatKitId={beatKitId}
        onOpenBeatKitPicker={() => setShowBeatKitPicker(true)}
        onCycleBeatKit={handleCycleBeatKit}
      />

      {showInstrumentPicker && (
        <InstrumentPicker
          selectedId={instrumentId}
          onSelect={setInstrumentId}
          onClose={() => setShowInstrumentPicker(false)}
        />
      )}

      {showBeatKitPicker && (
        <BeatKitPicker
          selectedId={beatKitId}
          onSelect={handleSelectBeatKit}
          onClose={() => setShowBeatKitPicker(false)}
        />
      )}

      {exportModalKind && (
        <ExportNameModal
          title={exportModalKind === "midi" ? "MIDI 내보내기" : "WAV로 내보내기"}
          extension={exportModalKind === "midi" ? ".mid" : ".wav"}
          defaultName="song-maker"
          onConfirm={handleConfirmExportName}
          onClose={() => setExportModalKind(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={draftSettings}
          onChange={setDraftSettings}
          onConfirm={handleConfirmSettings}
          onClose={() => setShowSettings(false)}
          theme={theme}
          onThemeChange={setTheme}
          language={language}
          onLanguageChange={setLanguage}
          experimentalFeatures={experimentalFeatures}
          onExperimentalFeaturesChange={setExperimentalFeatures}
        />
      )}
    </div>
  );
}

export default App;
