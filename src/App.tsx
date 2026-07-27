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
  BARS_DEFAULT_MAX,
  BEATS_PER_BAR_DEFAULT_MAX,
  SPLIT_BEATS_DEFAULT_MAX,
  type GridSettings,
  type LanguageCode,
  type ThemeName,
} from "./components/SettingsModal";
import { BPM_DEFAULT_MAX } from "./components/TransportBar";
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
import { t } from "./lib/i18n";

const MAX_HISTORY = 4;

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
  const [volume, setVolume] = useState(80);
  const [melodyVolume, setMelodyVolume] = useState(100);
  const [beatVolume, setBeatVolume] = useState(100);

  const [instrumentId, setInstrumentId] = useState("marimba");
  const [showInstrumentPicker, setShowInstrumentPicker] = useState(false);

  const [beatKitId, setBeatKitId] = useState(DEFAULT_BEAT_KIT_ID);
  const [showBeatKitPicker, setShowBeatKitPicker] = useState(false);

  const [settings, setSettings] = useState<GridSettings>(DEFAULT_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<GridSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  const [exportModalKind, setExportModalKind] = useState<"midi" | "wav" | null>(null);

  const [theme, setTheme] = useState<ThemeName>("monochrome");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [startStep, setStartStep] = useState(0);

  const [gridZoom, setGridZoom] = useState(1.2);
  const clampZoom = useCallback(
    (v: number) => {
      const minZoom = settings.rangeOctaves === 4 ? 0.4 : 1;
      return Math.min(2.5, Math.max(minZoom, v));
    },
    [settings.rangeOctaves],
  );

  useEffect(() => {
    if (settings.rangeOctaves !== 4 && gridZoom < 1) {
      setGridZoom(1);
    }
  }, [settings.rangeOctaves, gridZoom]);

  const [experimentalFeatures, setExperimentalFeatures] = useState(false);

  const [combinedAdvancedView, setCombinedAdvancedView] = useState(true);

  const [barCopyPasteEnabled, setBarCopyPasteEnabled] = useState(false);
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [barClipboard, setBarClipboard] = useState<Set<string> | null>(null);
  const [copiedFromBar, setCopiedFromBar] = useState<number | null>(null);

  const [followPlayhead, setFollowPlayhead] = useState(true);

  const [shareToastVisible, setShareToastVisible] = useState(false);

  const handleExperimentalFeaturesChange = useCallback((enabled: boolean) => {
    setExperimentalFeatures(enabled);
    if (!enabled) {
      const clampSettings = (s: GridSettings): GridSettings => ({
        ...s,
        bars: Math.min(s.bars, BARS_DEFAULT_MAX),
        beatsPerBar: Math.min(s.beatsPerBar, BEATS_PER_BAR_DEFAULT_MAX),
        splitBeatsInto: Math.min(s.splitBeatsInto, SPLIT_BEATS_DEFAULT_MAX),
      });
      setSettings(clampSettings);
      setDraftSettings(clampSettings);
      setBpm((b) => Math.min(b, BPM_DEFAULT_MAX));
    }
  }, []);

  const stepCount = settings.bars * settings.beatsPerBar * settings.splitBeatsInto;
  const stepsPerBar = settings.beatsPerBar * settings.splitBeatsInto;

  useEffect(() => {
    setStartStep((v) => Math.min(v, stepCount - 1));
  }, [stepCount]);

  useEffect(() => {
    if (!barCopyPasteEnabled || mode !== "advanced") {
      setSelectedBar(null);
      setBarClipboard(null);
      setCopiedFromBar(null);
    }
  }, [barCopyPasteEnabled, mode]);

  const handleSelectBar = useCallback((barIndex: number) => {
    setSelectedBar((cur) => (cur === barIndex ? null : barIndex));
  }, []);

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

  const rowInstruments = useMemo<Instrument[]>(
    () => noteRows.map((label) => (isDrumRowLabel(label) ? "drum" : "piano")),
    [noteRows],
  );

  const visibleRows = useMemo<boolean[]>(() => {
    if (mode === "simple" || combinedAdvancedView) return noteRows.map(() => true);
    return noteRows.map((label) =>
      instrument === "drum" ? isDrumRowLabel(label) : !isDrumRowLabel(label),
    );
  }, [mode, instrument, noteRows, combinedAdvancedView]);

  const [history, setHistory] = useState<Set<string>[]>([new Set()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const activeCells = history[historyIndex] ?? history[history.length - 1] ?? new Set<string>();

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

  const handleCopyBar = useCallback(() => {
    if (selectedBar === null) return;
    const barStart = selectedBar * stepsPerBar;
    const barEnd = barStart + stepsPerBar;
    const copied = new Set<string>();
    activeCells.forEach((key) => {
      const [rowStr, stepStr] = key.split(":");
      const step = Number(stepStr);
      if (step >= barStart && step < barEnd) {
        copied.add(cellKey(Number(rowStr), step - barStart));
      }
    });
    setBarClipboard(copied);
    setCopiedFromBar(selectedBar);
  }, [selectedBar, stepsPerBar, activeCells]);

  const handlePasteBar = useCallback(() => {
    if (selectedBar === null || !barClipboard) return;
    const barStart = selectedBar * stepsPerBar;
    const barEnd = barStart + stepsPerBar;
    const next = new Set<string>();
    activeCells.forEach((key) => {
      const [, stepStr] = key.split(":");
      const step = Number(stepStr);
      if (step >= barStart && step < barEnd) return;
      next.add(key);
    });
    barClipboard.forEach((key) => {
      const [rowStr, relStepStr] = key.split(":");
      next.add(cellKey(Number(rowStr), barStart + Number(relStepStr)));
    });
    commitCells(next);
  }, [selectedBar, barClipboard, stepsPerBar, activeCells, commitCells]);

  const handleTransposeOctave = useCallback(
    (direction: 1 | -1) => {
      const rowIndexByNote = new Map(noteRows.map((name, index) => [name, index]));
      const shifted = new Set<string>();
      activeCells.forEach((key) => {
        const [rowStr, stepStr] = key.split(":");
        const rowIndex = Number(rowStr);
        const noteName = noteRows[rowIndex];
        if (!noteName || isDrumRowLabel(noteName)) {
          shifted.add(key);
          return;
        }
        const match = noteName.match(/^(.*?)(-?\d+)$/);
        if (!match) {
          shifted.add(key);
          return;
        }
        const [, pitch, octaveStr] = match;
        const newNoteName = `${pitch}${Number(octaveStr) + direction}`;
        const newRowIndex = rowIndexByNote.get(newNoteName);
        if (newRowIndex === undefined) return;
        shifted.add(cellKey(newRowIndex, Number(stepStr)));
      });
      commitCells(shifted);
    },
    [noteRows, activeCells, commitCells],
  );

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
    startStep,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // 볼륨/템포 슬라이더(input type=range)는 태그가 INPUT이라 여기 걸리면 스페이스바가
      // 재생/정지 대신 슬라이더를 움직여버리는 문제가 있었음 — range 슬라이더는 "타이핑 중"
      // 취급하지 않고 단축키가 그대로 통하게 해줌(스페이스는 e.preventDefault()로 슬라이더
      // 기본 동작도 같이 막아줌).
      const isRangeInput = target.tagName === "INPUT" && (target as HTMLInputElement).type === "range";
      const isTyping = ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) && !isRangeInput;
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

      if (experimentalFeatures && (e.ctrlKey || e.metaKey) && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        handleTransposeOctave(e.key === "ArrowUp" ? 1 : -1);
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        setStartStep((v) => {
          const next = v + (e.key === "ArrowRight" ? 1 : -1);
          return Math.max(0, Math.min(stepCount - 1, next));
        });
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const noteName = keyToNoteName(e.key, settings.startOctave);
      if (noteName) {
        previewPianoNote(noteName);
        gridRef.current?.flashNoteLabel(noteName);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleUndo,
    handleRedo,
    previewPianoNote,
    settings.startOctave,
    handleTransposeOctave,
    stepCount,
    experimentalFeatures,
  ]);

  const handleModeChange = useCallback((next: AppMode) => {
    setMode(next);
    if (next === "simple") setView("piano-roll");
  }, []);

  const handleRestartAll = useCallback(() => {
    setIsPlaying(false);
    setHistory([new Set()]);
    setHistoryIndex(0);
  }, []);

  const handleRestartMelody = useCallback(() => {
    setIsPlaying(false);
    const kept = new Set(
      [...activeCells].filter((key) => Number(key.split(":")[0]) >= melodyRowCount),
    );
    commitCells(kept);
  }, [activeCells, melodyRowCount, commitCells]);

  const handleRestartBeat = useCallback(() => {
    setIsPlaying(false);
    const kept = new Set(
      [...activeCells].filter((key) => Number(key.split(":")[0]) < melodyRowCount),
    );
    commitCells(kept);
  }, [activeCells, melodyRowCount, commitCells]);

  const handleCycleInstrument = useCallback(() => {
    setInstrumentId((current) => getNextSimpleModeInstrumentId(current));
  }, []);

  const handleSelectBeatKit = useCallback((id: string) => {
    setBeatKitId(id);
  }, []);

  const handleCycleBeatKit = useCallback(() => {
    setBeatKitId((current) => getNextSimpleModeBeatKitId(current));
  }, []);

  const handleOpenSettings = useCallback(() => {
    setDraftSettings(settings);
    setShowSettings(true);
  }, [settings]);

  const handleConfirmSettings = useCallback(() => {
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
    setSelectedBar(null);
    setBarClipboard(null);
    setCopiedFromBar(null);
    setShowSettings(false);
  }, [draftSettings, activeCells, noteRows, beatKitId]);

  const performExportMidi = useCallback(
    (filename: string) => {
      const bytes = buildMidiBytes({ noteRows, activeCells, bpm });
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
        alert(t(language, "app.midiImportFailed"));
      }
    },
    [noteRows, stepCount, bpm, language],
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

  const shareToastTimeoutRef = useRef<number | null>(null);
  const showShareToast = useCallback(() => {
    if (shareToastTimeoutRef.current !== null) window.clearTimeout(shareToastTimeoutRef.current);
    setShareToastVisible(true);
    shareToastTimeoutRef.current = window.setTimeout(() => setShareToastVisible(false), 2200);
  }, []);

  const handleShareLink = useCallback(async () => {
    const payload: SharedPayload = {
      settings,
      mode,
      instrument,
      bpm,
      cells: Array.from(activeCells),
    };
    const url = await encodeProjectToUrl(payload);
    navigator.clipboard
      .writeText(url)
      .then(() => {
        // alert() 대신 메뉴 위에 살짝 떴다 사라지는 토스트로 바꿈 — 링크 복사할 때마다
        // "확인"을 눌러야 하는 모달은 너무 방해됨.
        showShareToast();
      })
      .catch(() => {
        // eslint-disable-next-line no-alert
        prompt(t(language, "app.shareCopyPrompt"), url);
      });
  }, [settings, mode, instrument, bpm, activeCells, showShareToast, language]);

  useEffect(() => {
    (async () => {
      const restored = await decodeProjectFromHash<SharedPayload>();
      if (!restored) return;
      setSettings(restored.settings);
      setDraftSettings(restored.settings);
      setMode(restored.mode);
      setInstrument(restored.instrument);
      setBpm(restored.bpm);
      setHistory([new Set(restored.cells)]);
      setHistoryIndex(0);
      window.history.replaceState(null, "", location.pathname + location.search);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app">
      {showLoading && (
        <LoadingScreen onFinish={() => setShowLoading(false)} minDurationMs={2000} language={language} />
      )}
      <Header
        mode={mode}
        onModeChange={handleModeChange}
        view={view}
        onViewChange={setView}
        onRestartAll={handleRestartAll}
        onRestartMelody={handleRestartMelody}
        onRestartBeat={handleRestartBeat}
        language={language}
      />

      <main className="main-content">
        {mode === "advanced" && barCopyPasteEnabled && selectedBar !== null && (
          <div className="bar-toolbar">
            <span className="bar-toolbar-label">
              {t(language, "barTools.selected")} {selectedBar + 1}
            </span>
            <button onClick={handleCopyBar}>{t(language, "barTools.copy")}</button>
            <button onClick={handlePasteBar} disabled={!barClipboard}>
              {t(language, "barTools.paste")}
            </button>
            <button className="bar-toolbar-close" onClick={() => setSelectedBar(null)} aria-label="close">
              ×
            </button>
          </div>
        )}
        {view === "piano-roll" || mode === "simple" ? (
          <PianoRollGrid
            ref={gridRef}
            noteRows={noteRows}
            stepCount={stepCount}
            stepsPerBar={stepsPerBar}
            activeCells={activeCells}
            visibleRows={visibleRows}
            zoom={gridZoom}
            onZoomChange={(next) => setGridZoom(clampZoom(next))}
            onCommitDrag={commitCells}
            onPreviewNote={previewNote}
            currentStep={currentStep}
            isPlaying={isPlaying}
            useShapedDrumIcons={getBeatKitById(beatKitId).category === "Music Lab"}
            drumStartIndex={melodyRowCount}
            showLabels={mode === "advanced"}
            startStep={startStep}
            pinDrumsToBottom={mode === "simple"}
            barRulerEnabled={mode === "advanced" && barCopyPasteEnabled}
            selectedBar={selectedBar}
            copiedBar={copiedFromBar}
            onSelectBar={handleSelectBar}
            followPlayhead={followPlayhead}
          />
        ) : (
          <PlaylistPlaceholder language={language} />
        )}
      </main>

      {shareToastVisible && <div className="share-toast">{t(language, "app.shareCopied")}</div>}

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
        combinedAdvancedView={combinedAdvancedView}
        language={language}
      />

      {showInstrumentPicker && (
        <InstrumentPicker
          selectedId={instrumentId}
          onSelect={setInstrumentId}
          onClose={() => setShowInstrumentPicker(false)}
          language={language}
        />
      )}

      {showBeatKitPicker && (
        <BeatKitPicker
          selectedId={beatKitId}
          onSelect={handleSelectBeatKit}
          onClose={() => setShowBeatKitPicker(false)}
          language={language}
        />
      )}

      {exportModalKind && (
        <ExportNameModal
          title={t(language, exportModalKind === "midi" ? "export.titleMidi" : "export.titleWav")}
          extension={exportModalKind === "midi" ? ".mid" : ".wav"}
          defaultName="song-maker"
          onConfirm={handleConfirmExportName}
          onClose={() => setExportModalKind(null)}
          language={language}
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
          onExperimentalFeaturesChange={handleExperimentalFeaturesChange}
          combinedAdvancedView={combinedAdvancedView}
          onCombinedAdvancedViewChange={setCombinedAdvancedView}
          barCopyPasteEnabled={barCopyPasteEnabled}
          onBarCopyPasteEnabledChange={setBarCopyPasteEnabled}
          followPlayhead={followPlayhead}
          onFollowPlayheadChange={setFollowPlayhead}
        />
      )}
    </div>
  );
}

export default App;
