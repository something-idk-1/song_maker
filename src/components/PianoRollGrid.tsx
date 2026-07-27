import {
  Fragment,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import { cellKey } from "../hooks/useSequencer";
import { isDrumRowLabel } from "../lib/notes";

interface PianoRollGridProps {
  noteRows: string[];
  stepCount: number;
  stepsPerBar: number;
  activeCells: Set<string> | undefined | null;
  visibleRows?: boolean[];
  zoom?: number;
  onZoomChange?: (nextZoom: number) => void;
  onCommitDrag: (cells: Set<string>) => void;
  onPreviewNote: (rowIndex: number, noteName: string) => void;
  currentStep: number;
  isPlaying: boolean;
  useShapedDrumIcons?: boolean;
  drumStartIndex?: number;
  showLabels?: boolean;
  startStep?: number;
  pinDrumsToBottom?: boolean;
  barRulerEnabled?: boolean;
  selectedBar?: number | null;
  copiedBar?: number | null;
  onSelectBar?: (barIndex: number) => void;
  followPlayhead?: boolean;
}

export interface PianoRollGridHandle {
  flashNoteLabel: (noteName: string) => void;
}

const BASE_CELL_WIDTH = 44;
const BASE_ROW_HEIGHT = 32;
const BASE_LABEL_WIDTH = 56;
const EMPTY_CELLS: Set<string> = new Set();

function parseOctave(note: string): number {
  const match = note.match(/-?\d+$/);
  return match ? Number(match[0]) : 0;
}

export const PianoRollGrid = forwardRef<PianoRollGridHandle, PianoRollGridProps>(
  function PianoRollGrid(
    {
      noteRows,
      stepCount,
      stepsPerBar,
      activeCells,
      visibleRows,
      zoom = 1,
      onZoomChange,
      onCommitDrag,
      onPreviewNote,
      currentStep,
      isPlaying,
      useShapedDrumIcons = true,
      drumStartIndex = 0,
      showLabels = true,
      startStep = 0,
      pinDrumsToBottom = true,
      barRulerEnabled = false,
      selectedBar = null,
      copiedBar = null,
      onSelectBar,
      followPlayhead = false,
    },
    ref,
  ) {
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const labelRefs = useRef(new Map<number, HTMLDivElement>());
  const prevFlashStepRef = useRef<number | null>(null);
  const prevPlayheadStepRef = useRef<number>(0);
  const prevIsPlayingRef = useRef<boolean>(false);
  const followTargetScrollLeftRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelDraggingRef = useRef(false);
  const lastDraggedRowRef = useRef<number | null>(null);
  const cells = activeCells ?? EMPTY_CELLS;
  const isRowVisible = (rowIndex: number) => !visibleRows || visibleRows[rowIndex];

  const cellWidth = Math.round(BASE_CELL_WIDTH * zoom);
  const rowHeight = Math.round(BASE_ROW_HEIGHT * zoom);
  const labelWidth = showLabels ? Math.round(BASE_LABEL_WIDTH * zoom) : 0;

  const flashLabelAt = (rowIndex: number) => {
    const el = labelRefs.current.get(rowIndex);
    if (!el) return;
    el.classList.remove("label-flash");
    void el.offsetWidth;
    el.classList.add("label-flash");
  };

  useImperativeHandle(
    ref,
    () => ({
      flashNoteLabel(noteName: string) {
        const rowIndex = noteRows.indexOf(noteName);
        if (rowIndex === -1) return;
        flashLabelAt(rowIndex);
      },
    }),
    [noteRows],
  );

  const playLabel = (rowIndex: number) => {
    onPreviewNote(rowIndex, noteRows[rowIndex]);
    flashLabelAt(rowIndex);
    lastDraggedRowRef.current = rowIndex;
  };

  useEffect(() => {
    const handleMouseUp = () => {
      labelDraggingRef.current = false;
      lastDraggedRowRef.current = null;
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const octaveStarts = useMemo(() => {
    const result = noteRows.map(() => false);
    let prevVisibleIndex = -1;
    noteRows.forEach((note, i) => {
      if (!isRowVisible(i)) return;
      if (prevVisibleIndex !== -1 && parseOctave(note) !== parseOctave(noteRows[prevVisibleIndex])) {
        result[i] = true;
      }
      prevVisibleIndex = i;
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteRows, visibleRows]);

  const drumSectionEnds = useMemo(() => {
    const result = noteRows.map(() => false);
    let lastVisibleIndex = -1;
    noteRows.forEach((note, i) => {
      if (!isRowVisible(i)) return;
      if (
        lastVisibleIndex !== -1 &&
        isDrumRowLabel(note) &&
        !isDrumRowLabel(noteRows[lastVisibleIndex])
      ) {
        result[lastVisibleIndex] = true;
      }
      lastVisibleIndex = i;
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteRows, visibleRows]);

  const drumStickyOffsets = useMemo(() => {
    const offsets: (number | null)[] = noteRows.map(() => null);
    if (!pinDrumsToBottom) return offsets;
    const visibleIndexes = noteRows.map((_, i) => i).filter(isRowVisible);
    const hasVisibleDrum = visibleIndexes.some((i) => isDrumRowLabel(noteRows[i]));
    const hasVisibleMelody = visibleIndexes.some((i) => !isDrumRowLabel(noteRows[i]));
    if (!hasVisibleDrum || !hasVisibleMelody) return offsets;

    let offset = 0;
    for (let k = visibleIndexes.length - 1; k >= 0; k -= 1) {
      const i = visibleIndexes[k];
      if (!isDrumRowLabel(noteRows[i])) break;
      offsets[i] = offset;
      offset += rowHeight;
    }
    return offsets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteRows, visibleRows, rowHeight, pinDrumsToBottom]);

  const drumBlockHeight = useMemo(() => {
    if (!pinDrumsToBottom) return 0;
    const visibleIndexes = noteRows.map((_, i) => i).filter(isRowVisible);
    const hasVisibleDrum = visibleIndexes.some((i) => isDrumRowLabel(noteRows[i]));
    const hasVisibleMelody = visibleIndexes.some((i) => !isDrumRowLabel(noteRows[i]));
    if (!hasVisibleDrum || !hasVisibleMelody) return 0;
    const drumCount = visibleIndexes.filter((i) => isDrumRowLabel(noteRows[i])).length;
    return drumCount * rowHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteRows, visibleRows, rowHeight, pinDrumsToBottom]);

  const workingCellsRef = useRef<Set<string> | null>(null);
  const dragModeRef = useRef<"add" | "remove">("add");

  const applyCellDom = useCallback(
    (rowIndex: number, stepIndex: number, isActive: boolean) => {
      const key = cellKey(rowIndex, stepIndex);
      const el = cellRefs.current.get(key);
      if (!el) return;
      el.classList.toggle("active", isActive);
      const isFlatRow = noteRows[rowIndex]?.includes("#") ?? false;
      el.classList.toggle("flat-row", isFlatRow && !isActive);
    },
    [noteRows],
  );

  // useCallback으로 참조를 고정해둠 — 안 그러면 재생 중 currentStep이 바뀔 때마다(스텝마다)
  // PianoRollGrid가 리렌더되면서 이 함수들이 매번 새로 만들어지고, 그게 GridBody(React.memo)에
  // 새 prop으로 들어가서 memo 비교가 매번 실패 -> 수천 개 셀을 가진 GridBody 전체가 매 스텝마다
  // 다시 렌더링되는 렉의 주범이었음.
  const handleCellMouseDown = useCallback(
    (rowIndex: number, stepIndex: number) => {
      const key = cellKey(rowIndex, stepIndex);
      const working = new Set(cells);
      const willBeActive = !working.has(key);
      dragModeRef.current = willBeActive ? "add" : "remove";
      if (willBeActive) working.add(key);
      else working.delete(key);
      workingCellsRef.current = working;
      applyCellDom(rowIndex, stepIndex, willBeActive);
      if (willBeActive) onPreviewNote(rowIndex, noteRows[rowIndex]);
    },
    [cells, applyCellDom, onPreviewNote, noteRows],
  );

  const handleCellMouseEnter = useCallback(
    (rowIndex: number, stepIndex: number) => {
      const working = workingCellsRef.current;
      if (!working) return;
      const key = cellKey(rowIndex, stepIndex);
      const shouldBeActive = dragModeRef.current === "add";
      if (working.has(key) === shouldBeActive) return;
      if (shouldBeActive) working.add(key);
      else working.delete(key);
      applyCellDom(rowIndex, stepIndex, shouldBeActive);
      if (shouldBeActive) onPreviewNote(rowIndex, noteRows[rowIndex]);
    },
    [applyCellDom, onPreviewNote, noteRows],
  );

  const registerCellRef = useCallback((key: string, el: HTMLButtonElement | null) => {
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      const working = workingCellsRef.current;
      if (working) onCommitDrag(working);
      workingCellsRef.current = null;
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onZoomChange) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      onZoomChange(zoom - e.deltaY * 0.0015);
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [zoom, onZoomChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let panning = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 1) return;
      e.preventDefault();
      panning = true;
      startX = e.clientX;
      startY = e.clientY;
      startScrollLeft = el.scrollLeft;
      startScrollTop = el.scrollTop;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!panning) return;
      el.scrollLeft = startScrollLeft - (e.clientX - startX);
      el.scrollTop = startScrollTop - (e.clientY - startY);
    };
    const handleMouseUp = () => {
      panning = false;
    };

    el.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      el.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const rowCount = noteRows.length;

    if (prevFlashStepRef.current !== null) {
      for (let row = 0; row < rowCount; row += 1) {
        cellRefs.current
          .get(cellKey(row, prevFlashStepRef.current))
          ?.classList.remove("flash-active", "flash-empty");
      }
    }

    if (isPlaying) {
      for (let row = 0; row < rowCount; row += 1) {
        const key = cellKey(row, currentStep);
        const el = cellRefs.current.get(key);
        if (!el) continue;
        el.classList.add(cells.has(key) ? "flash-active" : "flash-empty");
      }
      prevFlashStepRef.current = currentStep;
    } else {
      prevFlashStepRef.current = null;
    }
  }, [currentStep, isPlaying, noteRows.length, cells]);

  // 재생 위치 자동 스크롤 — 목표 위치(재생 헤드가 화면 중앙에 오도록 하는 스크롤 값)만 여기서
  // 계산해서 ref에 저장해두고, 실제로 화면을 움직이는 건 아래의 별도 requestAnimationFrame
  // 루프가 매 프레임 조금씩 따라가는 방식으로 함. 예전엔 스텝(16분음표)마다 el.scrollTo({behavior:
  // "smooth"})를 새로 호출했는데, 템포가 빠르면 스텝 간격이 브라우저 smooth-scroll 애니메이션
  // 지속시간보다 짧아져서 애니메이션이 끝나기도 전에 계속 새로 시작되며 점점 뒤처지다가
  // 결국 재생 헤드가 화면 밖으로 넘어가버리는 문제가 있었음. rAF로 직접 매 프레임 이징하면
  // 템포와 무관하게 항상 일정한 속도로 따라잡아서 이런 문제가 없음.
  useEffect(() => {
    if (!followPlayhead) return;
    const el = containerRef.current;
    if (!el) return;

    const viewportStepWidth = el.clientWidth - labelWidth;
    if (viewportStepWidth <= 0) return;

    const cellCenterX = labelWidth + currentStep * cellWidth + cellWidth / 2;
    const targetScreenX = labelWidth + viewportStepWidth / 2;
    const desiredScrollLeft = Math.max(0, cellCenterX - targetScreenX);

    const justStartedPlaying = isPlaying && !prevIsPlayingRef.current;
    const loopedBack = isPlaying && currentStep < prevPlayheadStepRef.current;

    if (isPlaying && (justStartedPlaying || loopedBack)) {
      el.scrollLeft = desiredScrollLeft;
    }
    followTargetScrollLeftRef.current = desiredScrollLeft;

    prevPlayheadStepRef.current = currentStep;
    prevIsPlayingRef.current = isPlaying;
  }, [currentStep, isPlaying, followPlayhead, cellWidth, labelWidth]);

  useEffect(() => {
    if (!followPlayhead || !isPlaying) return;
    const el = containerRef.current;
    if (!el) return;

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const target = followTargetScrollLeftRef.current;
      const diff = target - el.scrollLeft;
      if (Math.abs(diff) > 0.5) {
        // 프레임 시간에 비례하는 이징 계수 — 프레임레이트가 들쭉날쭉해도 항상 같은 속도로
        // 따라잡음(약 300ms 안에 남은 거리의 대부분을 좁힘).
        const easeFactor = 1 - Math.pow(0.001, dt);
        el.scrollLeft += diff * easeFactor;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [followPlayhead, isPlaying]);

  const gridSizeVars = {
    "--cell-w": `${cellWidth}px`,
    "--cell-h": `${rowHeight}px`,
    "--label-w": `${labelWidth}px`,
  } as CSSProperties;

  return (
    <div className="piano-roll" ref={containerRef} style={gridSizeVars}>
      {showLabels && (
      <div className="piano-roll-labels">
        {barRulerEnabled && <div className="piano-roll-bar-ruler-spacer" />}
        {noteRows.map((note, rowIndex) => {
          if (!isRowVisible(rowIndex)) return null;
          const stickyBottom = drumStickyOffsets[rowIndex];
          return (
            <Fragment key={note + rowIndex}>
              <div
                ref={(el) => {
                  if (el) labelRefs.current.set(rowIndex, el);
                  else labelRefs.current.delete(rowIndex);
                }}
                className={`piano-roll-row-label ${octaveStarts[rowIndex] ? "octave-start" : ""} ${
                  stickyBottom !== null ? "sticky-bottom-row" : ""
                }`}
                style={stickyBottom !== null ? { bottom: stickyBottom } : undefined}
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  labelDraggingRef.current = true;
                  playLabel(rowIndex);
                }}
                onMouseEnter={() => {
                  if (!labelDraggingRef.current) return;
                  if (lastDraggedRowRef.current === rowIndex) return;
                  playLabel(rowIndex);
                }}
              >
                {note}
              </div>
              {drumSectionEnds[rowIndex] && (
                pinDrumsToBottom ? (
                  <div className="piano-roll-divider" style={{ bottom: drumBlockHeight }} />
                ) : (
                  <div className="piano-roll-divider-static" />
                )
              )}
            </Fragment>
          );
        })}
      </div>
      )}

      <GridBody
        noteRows={noteRows}
        stepCount={stepCount}
        stepsPerBar={stepsPerBar}
        octaveStarts={octaveStarts}
        drumSectionEnds={drumSectionEnds}
        drumStickyOffsets={drumStickyOffsets}
        drumBlockHeight={drumBlockHeight}
        pinDrumsToBottom={pinDrumsToBottom}
        visibleRows={visibleRows}
        activeCells={cells}
        useShapedDrumIcons={useShapedDrumIcons}
        drumStartIndex={drumStartIndex}
        startStep={startStep}
        barRulerEnabled={barRulerEnabled}
        selectedBar={selectedBar}
        copiedBar={copiedBar}
        onSelectBar={onSelectBar}
        onCellMouseDown={handleCellMouseDown}
        onCellMouseEnter={handleCellMouseEnter}
        registerCellRef={registerCellRef}
      />
    </div>
  );
  },
);

interface GridBodyProps {
  noteRows: string[];
  stepCount: number;
  stepsPerBar: number;
  octaveStarts: boolean[];
  drumSectionEnds: boolean[];
  drumStickyOffsets: (number | null)[];
  drumBlockHeight: number;
  pinDrumsToBottom: boolean;
  visibleRows?: boolean[];
  activeCells: Set<string>;
  useShapedDrumIcons: boolean;
  drumStartIndex: number;
  startStep: number;
  barRulerEnabled: boolean;
  selectedBar: number | null;
  copiedBar: number | null;
  onSelectBar?: (barIndex: number) => void;
  onCellMouseDown: (rowIndex: number, stepIndex: number) => void;
  onCellMouseEnter: (rowIndex: number, stepIndex: number) => void;
  registerCellRef: (key: string, el: HTMLButtonElement | null) => void;
}

const GridBody = memo(function GridBody({
  noteRows,
  stepCount,
  stepsPerBar,
  octaveStarts,
  drumSectionEnds,
  drumStickyOffsets,
  drumBlockHeight,
  pinDrumsToBottom,
  visibleRows,
  activeCells,
  useShapedDrumIcons,
  drumStartIndex,
  startStep,
  barRulerEnabled,
  selectedBar,
  copiedBar,
  onSelectBar,
  onCellMouseDown,
  onCellMouseEnter,
  registerCellRef,
}: GridBodyProps) {
  const steps = Array.from({ length: stepCount }, (_, i) => i);
  const barCount = Math.max(1, Math.round(stepCount / stepsPerBar));
  const barIndexes = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div className="piano-roll-grid">
      {barRulerEnabled && (
        <div className="piano-roll-bar-ruler">
          {barIndexes.map((barIndex) => (
            <button
              key={barIndex}
              className={`piano-roll-bar-ruler-cell ${selectedBar === barIndex ? "selected" : ""} ${
                copiedBar === barIndex ? "copied" : ""
              }`}
              style={{ width: `calc(var(--cell-w, 44px) * ${stepsPerBar})` }}
              onClick={() => onSelectBar?.(barIndex)}
            >
              {barIndex + 1}
            </button>
          ))}
        </div>
      )}
      {noteRows.map((note, rowIndex) => {
        if (visibleRows && !visibleRows[rowIndex]) return null;
        const isFlatRow = note.includes("#");
        const stickyBottom = drumStickyOffsets[rowIndex];
        const isDrum = isDrumRowLabel(note);
        const drumType =
          isDrum && useShapedDrumIcons
            ? (rowIndex - drumStartIndex) % 2 === 0
              ? "snare"
              : "kick"
            : null;
        return (
          <Fragment key={note + rowIndex}>
            <div
              className={`piano-roll-row ${octaveStarts[rowIndex] ? "octave-start" : ""} ${
                stickyBottom !== null ? "sticky-bottom-row" : ""
              }`}
              style={stickyBottom !== null ? { bottom: stickyBottom } : undefined}
            >
              {steps.map((stepIndex) => {
                const key = cellKey(rowIndex, stepIndex);
                const active = activeCells.has(key);
                const isBarStart = stepIndex % stepsPerBar === 0 && stepIndex > 0;

                const classes = ["grid-cell"];
                if (isBarStart) classes.push("beat-start");
                if (isFlatRow && !active) classes.push("flat-row");
                if (active) classes.push("active");
                if (isDrum) {
                  classes.push("drum-cell");
                  if (drumType) classes.push(`drum-${drumType}`);
                }
                if (stepIndex === startStep) classes.push("start-marker");

                return (
                  <button
                    key={key}
                    ref={(el) => registerCellRef(key, el)}
                    className={classes.join(" ")}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      onCellMouseDown(rowIndex, stepIndex);
                    }}
                    onMouseEnter={() => onCellMouseEnter(rowIndex, stepIndex)}
                    onDragStart={(e) => e.preventDefault()}
                    aria-label={`${note} step ${stepIndex + 1}`}
                  />
                );
              })}
            </div>
            {drumSectionEnds[rowIndex] && (
              pinDrumsToBottom ? (
                <div className="piano-roll-divider" style={{ bottom: drumBlockHeight }} />
              ) : (
                <div className="piano-roll-divider-static" />
              )
            )}
          </Fragment>
        );
      })}
    </div>
  );
});
