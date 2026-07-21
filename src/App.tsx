import { useCallback, useMemo, useRef, useState } from "react";
import { Header, type ViewName } from "./components/Header";
import { TransportBar } from "./components/TransportBar";
import { PianoRollGrid } from "./components/PianoRollGrid";
import { PlaylistPlaceholder } from "./components/PlaylistPlaceholder";
import { SettingsModal, type GridSettings } from "./components/SettingsModal";
import { buildScaleRows } from "./lib/notes";
import { cellKey, useSequencer, type Instrument } from "./hooks/useSequencer";

const SAVE_KEY = "music-maker:project";

const DEFAULT_SETTINGS: GridSettings = {
  bars: 4,
  beatsPerBar: 4,
  splitBeatsInto: 2,
  scale: "Major",
  startNote: "C",
  startOctave: 4,
  rangeOctaves: 2,
};

function App() {
  const [view, setView] = useState<ViewName>("piano-roll");
  const [ttkp, setTtkp] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [stepEdit, setStepEdit] = useState(false);

  const [instrument, setInstrument] = useState<Instrument>("piano");
  const [bpm, setBpm] = useState(96);
  const [isPlaying, setIsPlaying] = useState(false);

  const [settings, setSettings] = useState<GridSettings>(DEFAULT_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<GridSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  // Length/Beats per bar/Split beats into 로 총 스텝 수를 계산함 (예: 4마디 x 4박자 x 2분할 = 32스텝)
  const stepCount = settings.bars * settings.beatsPerBar * settings.splitBeatsInto;

  const noteRows = useMemo(
    () =>
      buildScaleRows(
        settings.scale,
        settings.startNote,
        settings.startOctave,
        settings.rangeOctaves,
      ),
    [settings],
  );

  // undo/redo: 활성 셀 스냅샷을 히스토리 배열로 관리.
  const [history, setHistory] = useState<Set<string>[]>([new Set()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const activeCells = history[historyIndex];

  const commitCells = useCallback(
    (next: Set<string>) => {
      setHistory((prev) => {
        const truncated = prev.slice(0, historyIndex + 1);
        return [...truncated, next];
      });
      setHistoryIndex((i) => i + 1);
    },
    [historyIndex],
  );

  const handleToggleCell = useCallback(
    (rowIndex: number, stepIndex: number) => {
      const key = cellKey(rowIndex, stepIndex);
      const next = new Set(activeCells);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      commitCells(next);
    },
    [activeCells, commitCells],
  );

  const handleUndo = useCallback(() => {
    setHistoryIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryIndex((i) => Math.min(history.length - 1, i + 1));
  }, [history.length]);

  const handleSave = useCallback(() => {
    const payload = {
      bpm,
      instrument,
      settings,
      cells: Array.from(activeCells),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  }, [bpm, instrument, settings, activeCells]);

  const handleOpenSettings = useCallback(() => {
    setDraftSettings(settings);
    setShowSettings(true);
  }, [settings]);

  const handleConfirmSettings = useCallback(() => {
    setSettings(draftSettings);
    // 그리드 크기(행/열)가 바뀌면 기존 셀 좌표가 더는 맞지 않을 수 있어서 초기화함.
    // TODO: 나중에 여유 되면 좌표를 새 범위에 맞게 옮기는 로직으로 개선 가능.
    setHistory([new Set()]);
    setHistoryIndex(0);
    setShowSettings(false);
  }, [draftSettings]);

  const { currentStep } = useSequencer({
    noteRows,
    activeCells,
    stepCount,
    bpm,
    isPlaying,
    instrument,
  });

  const ttkpRef = useRef(ttkp);
  ttkpRef.current = ttkp;

  return (
    <div className="app">
      <Header
        view={view}
        onViewChange={setView}
        ttkp={ttkp}
        onToggleTtkp={() => setTtkp((v) => !v)}
        autoScroll={autoScroll}
        onToggleAutoScroll={() => setAutoScroll((v) => !v)}
        stepEdit={stepEdit}
        onToggleStepEdit={() => setStepEdit((v) => !v)}
      />

      <main className="main-content">
        {view === "piano-roll" ? (
          <PianoRollGrid
            noteRows={noteRows}
            stepCount={stepCount}
            stepsPerBar={settings.beatsPerBar * settings.splitBeatsInto}
            stepsPerBeat={settings.splitBeatsInto}
            activeCells={activeCells}
            onToggleCell={handleToggleCell}
            currentStep={currentStep}
            isPlaying={isPlaying}
          />
        ) : (
          <PlaylistPlaceholder />
        )}
      </main>

      <TransportBar
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
        onOpenSettings={handleOpenSettings}
        onSave={handleSave}
      />

      {showSettings && (
        <SettingsModal
          settings={draftSettings}
          onChange={setDraftSettings}
          onConfirm={handleConfirmSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default App;
