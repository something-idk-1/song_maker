import {
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
  // 고급 모드의 피아노/드럼 토글로 "지금 화면에 어떤 행을 보여줄지"만 걸러냄. 데이터(activeCells)는
  // 항상 멜로디+드럼이 합쳐진 하나의 세트라서, 안 보이는 쪽도 재생은 계속 같이 됨.
  // undefined면 전부 보여줌(간단 모드 기본 동작).
  visibleRows?: boolean[];
  // 그리드 셀 크기 배율(1 = 기본 44x32). Ctrl+휠이나 설정창의 "그리드 크기"로 바뀜.
  zoom?: number;
  onZoomChange?: (nextZoom: number) => void;
  onCommitDrag: (cells: Set<string>) => void;
  onPreviewNote: (rowIndex: number, noteName: string) => void;
  currentStep: number;
  isPlaying: boolean;
  // 뮤직랩 계열 킷(일렉트로닉/블록/킷/콩가)일 때만 위행=삼각형/아래행=원처럼 종류별 모양을 보여주고,
  // 그 외 비트킷(신스 비트, 8비트 칩튠, 국악 등)은 전부 네모 아이콘으로 통일함.
  useShapedDrumIcons?: boolean;
  // noteRows 안에서 드럼 행이 시작하는 인덱스(= 멜로디 행 개수). 뮤직랩 모양(삼각형/원)을
  // 라벨 텍스트가 아니라 "드럼 블록 안에서 몇 번째 행이냐"로 정하기 위해 씀.
  drumStartIndex?: number;
  // 간단 모드는 레이블(음이름/Kick/Snare 텍스트) 열 자체를 안 보여줌. 고급 모드는 그대로 보여줌.
  showLabels?: boolean;
  // 방향키(←/→)로 옮기는 "재생 시작 위치" 마커 — 해당 스텝 컬럼에 강조색 세로선을 그림.
  startStep?: number;
}

// 키보드로 건반 미리듣기할 때 App에서 이걸 호출해서 해당 음이름의 레이블을 흰색으로 깜빡이게 함.
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

/**
 * 성능 핵심 두 가지:
 *
 * 1) 재생 플래시 — 실제 셀 목록(GridBody)을 React.memo로 분리해서 currentStep이 바뀌는 것만으론
 *    아예 리렌더링 안 하고, 대신 ref로 DOM 클래스만 직접 토글함 (현재 컬럼의 행 개수만큼만).
 *
 * 2) 드래그로 노트 찍기 — 드래그 중엔 React state를 전혀 안 건드리고 ref로 DOM만 직접
 *    바꾸다가, 마우스를 뗄 때(mouseup) 딱 한 번만 state를 커밋함.
 */
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
  // 레이블 드래그하면서 지나가는 행마다 소리 나게 하기 위한 상태.
  // 같은 행에서 mouseenter가 여러 번 안 겹치게 lastDraggedRow로 중복 방지함.
  const labelDraggingRef = useRef(false);
  const lastDraggedRowRef = useRef<number | null>(null);
  const cells = activeCells ?? EMPTY_CELLS;
  const isRowVisible = (rowIndex: number) => !visibleRows || visibleRows[rowIndex];

  const cellWidth = Math.round(BASE_CELL_WIDTH * zoom);
  const rowHeight = Math.round(BASE_ROW_HEIGHT * zoom);
  const labelWidth = showLabels ? Math.round(BASE_LABEL_WIDTH * zoom) : 0;

  // 레이블 눌렀을 때(키보드/클릭 공용)이 행을 잠깐 어둡게 반짝이게 함.
  const flashLabelAt = (rowIndex: number) => {
    const el = labelRefs.current.get(rowIndex);
    if (!el) return;
    // 연타할 때도 애니메이션이 새로 시작되게 클래스를 뺐다가 강제로 리플로우 후 다시 붙임.
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

  // 레이블 눌러서/드래그해서 지나가는 행 소리내고 반짝이게 하는 공용 함수.
  const playLabel = (rowIndex: number) => {
    onPreviewNote(rowIndex, noteRows[rowIndex]);
    flashLabelAt(rowIndex);
    lastDraggedRowRef.current = rowIndex;
  };

  // 마우스를 어디서 떼든(레이블 밖에서 떼도) 드래그 상태를 확실히 풀어줌.
  useEffect(() => {
    const handleMouseUp = () => {
      labelDraggingRef.current = false;
      lastDraggedRowRef.current = null;
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // 옥타브 경계(음이름의 옥타브 숫자가 바뀌는 지점) — 마디 구분선(beat-start)이랑 같은 굵기/색으로 표시함.
  // 안 보이는 행은 건너뛰고, "화면에 실제로 보이는 바로 이전 행"이랑만 비교함.
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

  // 멜로디 구간이 끝나고 드럼 구간이 시작하는 지점에 구분선을 그음(간단 모드에서 멜로디+드럼이
  // 한 화면에 같이 보일 때만 의미가 있음 — 고급 모드에서 드럼만 따로 보는 화면일 땐 "바로 이전
  // 보이는 행"이 드럼이 아닐 일이 없어서 자동으로 안 그려짐. 옥타브 경계선이랑 똑같은 패턴).
  const drumSectionStarts = useMemo(() => {
    const result = noteRows.map(() => false);
    let prevVisibleIndex = -1;
    noteRows.forEach((note, i) => {
      if (!isRowVisible(i)) return;
      if (
        prevVisibleIndex !== -1 &&
        isDrumRowLabel(note) &&
        !isDrumRowLabel(noteRows[prevVisibleIndex])
      ) {
        result[i] = true;
      }
      prevVisibleIndex = i;
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteRows, visibleRows]);

  // 멜로디 행이랑 드럼 행이 한 화면에 같이 보일 때만(=간단 모드) 드럼 행을 하단에 고정함.
  // 고급 모드에서 드럼만 따로 보는 화면일 땐 스크롤해서 가릴 멜로디 행이 없으니까 고정 안 함.
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

  // 드래그 중 임시 상태 (React state 아님 — 리렌더링을 유발하지 않기 위해 ref로 둠)
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
    // 노트를 찍을 때(켤 때)만 소리로 미리 들려줌 — 지울 땐 재생 안 함.
    if (willBeActive) onPreviewNote(rowIndex, noteRows[rowIndex]);
  };

  const handleCellMouseEnter = (rowIndex: number, stepIndex: number) => {
    const working = workingCellsRef.current;
    if (!working) return; // 드래그 중이 아니면 무시
    const key = cellKey(rowIndex, stepIndex);
    const shouldBeActive = dragModeRef.current === "add";
    if (working.has(key) === shouldBeActive) return; // 이미 같은 상태면 아무것도 안 함
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

  // Ctrl+휠 = 브라우저 페이지 확대 대신 그리드 크기만 바꿈 (헤더/트랜스포트바는 그대로 유지됨).
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

  // FL스튜디오처럼 휠(가운데) 버튼 누른 채로 드래그하면 화면이 움직임.
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
            <div
              key={note + rowIndex}
              ref={(el) => {
                if (el) labelRefs.current.set(rowIndex, el);
                else labelRefs.current.delete(rowIndex);
              }}
              className={`piano-roll-row-label ${octaveStarts[rowIndex] ? "octave-start" : ""} ${
                drumSectionStarts[rowIndex] ? "drum-section-start" : ""
              } ${stickyBottom !== null ? "sticky-bottom-row" : ""}`}
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
          );
        })}
      </div>
      )}

      <GridBody
        noteRows={noteRows}
        stepCount={stepCount}
        stepsPerBar={stepsPerBar}
        octaveStarts={octaveStarts}
        drumSectionStarts={drumSectionStarts}
        drumStickyOffsets={drumStickyOffsets}
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
  drumSectionStarts: boolean[];
  drumStickyOffsets: (number | null)[];
  visibleRows?: boolean[];
  activeCells: Set<string>;
  useShapedDrumIcons: boolean;
  drumStartIndex: number;
  startStep: number;
  onCellMouseDown: (rowIndex: number, stepIndex: number) => void;
  onCellMouseEnter: (rowIndex: number, stepIndex: number) => void;
  registerCellRef: (key: string, el: HTMLButtonElement | null) => void;
}

// noteRows/stepCount/activeCells 등 "실제 그리드 내용"이 바뀔 때만 다시 그림.
// 드래그 중엔 activeCells(=committed 상태)가 안 바뀌므로 이 컴포넌트는 리렌더링되지 않음.
const GridBody = memo(function GridBody({
  noteRows,
  stepCount,
  stepsPerBar,
  octaveStarts,
  drumSectionStarts,
  drumStickyOffsets,
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
        // 뮤직랩 계열 킷일 때만 위행=삼각형/아래행=원 모양을 씀 — 라벨 텍스트(Kick/Snare/block1..)가
        // 킷마다 달라서, 텍스트 대신 "드럼 블록 안에서 몇 번째 행이냐"로 모양을 정함.
        // 뮤직랩 킷은 전부 2행이라 0번째=위=삼각형(snare 모양 재사용), 1번째=아래=원(kick 모양 재사용).
        // 그 외 비트킷은 drum-${type} 수정자 클래스를 안 붙여서 기본 네모 모양만 나옴.
        const drumType =
          isDrum && useShapedDrumIcons
            ? (rowIndex - drumStartIndex) % 2 === 0
              ? "snare"
              : "kick"
            : null;
        return (
          <div
            key={note + rowIndex}
            className={`piano-roll-row ${octaveStarts[rowIndex] ? "octave-start" : ""} ${
              drumSectionStarts[rowIndex] ? "drum-section-start" : ""
            } ${stickyBottom !== null ? "sticky-bottom-row" : ""}`}
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
                    if (e.button !== 0) return; // 휠(가운데) 버튼은 화면 이동용이라 노트는 안 찍음
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
        );
      })}
    </div>
  );
});
