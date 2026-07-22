import {
  Fragment,
  forwardRef,
  memo,
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
    },
    ref,
  ) {
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const labelRefs = useRef(new Map<number, HTMLDivElement>());
  const prevFlashStepRef = useRef<number | null>(null);
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
  }, [noteRows, visibleRows, rowHeight]);

  const drumBlockHeight = useMemo(() => {
    const visibleIndexes = noteRows.map((_, i) => i).filter(isRowVisible);
    const hasVisibleDrum = visibleIndexes.some((i) => isDrumRowLabel(noteRows[i]));
    const hasVisibleMelody = visibleIndexes.some((i) => !isDrumRowLabel(noteRows[i]));
    if (!hasVisibleDrum || !hasVisibleMelody) return 0;
    const drumCount = visibleIndexes.filter((i) => isDrumRowLabel(noteRows[i])).length;
    return drumCount * rowHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteRows, visibleRows, rowHeight]);

  const workingCellsRef = useRef<Set<string> | null>(null);
  const dragModeRef = useRef<"add" | "remove">("add");

  const applyCellDom = (rowIndex: number, stepIndex: number, isActive: boolean) => {
    const key = cellKey(rowIndex, stepIndex);
    const el = cellRefs.current.get(key);
    if (!el) return;
    el.classList.toggle("active", isActive);
    const isFlatRow = noteRows[rowIndex]?.includes("#") ?? false;
    el.classList.toggle("flat-row", isFlatRow && !isActive);
  };

  const handleCellMouseDown = (rowIndex: number, stepIndex: number) => {
    const key = cellKey(rowIndex, stepIndex);
    const working = new Set(cells);
    const willBeActive = !working.has(key);
    dragModeRef.current = willBeActive ? "add" : "remove";
    if (willBeActive) working.add(key);
    else working.delete(key);
    workingCellsRef.current = working;
    applyCellDom(rowIndex, stepIndex, willBeActive);
    if (willBeActive) onPreviewNote(rowIndex, noteRows[rowIndex]);
  };

  const handleCellMouseEnter = (rowIndex: number, stepIndex: number) => {
    const working = workingCellsRef.current;
    if (!working) return;
    const key = cellKey(rowIndex, stepIndex);
    const shouldBeActive = dragModeRef.current === "add";
    if (working.has(key) === shouldBeActive) return;
    if (shouldBeActive) working.add(key);
    else working.delete(key);
    applyCellDom(rowIndex, stepIndex, shouldBeActive);
    if (shouldBeActive) onPreviewNote(rowIndex, noteRows[rowIndex]);
  };

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

  const gridSizeVars = {
    "--cell-w": `${cellWidth}px`,
    "--cell-h": `${rowHeight}px`,
    "--label-w": `${labelWidth}px`,
  } as CSSProperties;

  return (
    <div className="piano-roll" ref={containerRef} style={gridSizeVars}>
      {showLabels && (
      <div className="piano-roll-labels">
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
                <div className="piano-roll-divider" style={{ bottom: drumBlockHeight }} />
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
        visibleRows={visibleRows}
        activeCells={cells}
        useShapedDrumIcons={useShapedDrumIcons}
        drumStartIndex={drumStartIndex}
        startStep={startStep}
        onCellMouseDown={handleCellMouseDown}
        onCellMouseEnter={handleCellMouseEnter}
        registerCellRef={(key, el) => {
          if (el) cellRefs.current.set(key, el);
          else cellRefs.current.delete(key);
        }}
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
  visibleRows?: boolean[];
  activeCells: Set<string>;
  useShapedDrumIcons: boolean;
  drumStartIndex: number;
  startStep: number;
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
  visibleRows,
  activeCells,
  useShapedDrumIcons,
  drumStartIndex,
  startStep,
  onCellMouseDown,
  onCellMouseEnter,
  registerCellRef,
}: GridBodyProps) {
  const steps = Array.from({ length: stepCount }, (_, i) => i);

  return (
    <div className="piano-roll-grid">
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
              <div className="piano-roll-divider" style={{ bottom: drumBlockHeight }} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
});
