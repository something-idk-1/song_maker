import { cellKey } from "../hooks/useSequencer";

interface PianoRollGridProps {
  noteRows: string[];
  stepCount: number;
  stepsPerBar: number;
  stepsPerBeat: number;
  activeCells: Set<string>;
  onToggleCell: (rowIndex: number, stepIndex: number) => void;
  currentStep: number;
  isPlaying: boolean;
}

// 그리드 구조(셀 크기)는 이전 롤백 버전 유지 — 이번엔 색상/음영 스타일만 참고자료 반영.
const CELL_WIDTH = 44;

export function PianoRollGrid({
  noteRows,
  stepCount,
  stepsPerBar,
  stepsPerBeat,
  activeCells,
  onToggleCell,
  currentStep,
  isPlaying,
}: PianoRollGridProps) {
  const steps = Array.from({ length: stepCount }, (_, i) => i);

  return (
    <div className="piano-roll">
      <div className="piano-roll-labels">
        {noteRows.map((note, rowIndex) => (
          <div key={note + rowIndex} className="piano-roll-row-label">
            {note}
          </div>
        ))}
      </div>

      <div className="piano-roll-grid">
        {isPlaying && (
          <div
            className="playhead-cursor"
            style={{ left: currentStep * CELL_WIDTH }}
          />
        )}
        {noteRows.map((note, rowIndex) => (
          <div key={note + rowIndex} className="piano-roll-row">
            {steps.map((stepIndex) => {
              const key = cellKey(rowIndex, stepIndex);
              const active = activeCells.has(key);
              // 마디(bar) 시작 지점마다 조금 더 진한 세로선을 그어서 박자 구분을 눈에 띄게 함
              const isBarStart = stepIndex % stepsPerBar === 0 && stepIndex > 0;
              // Song Maker 스타일: 박자(beat) 단위로 세로 밴드를 교차 음영 (색은 우리 톤인 연회색 사용, 파란색은 무시)
              const isShadedBeat = Math.floor(stepIndex / stepsPerBeat) % 2 === 1;
              return (
                <button
                  key={key}
                  className={`grid-cell ${active ? "active" : ""} ${
                    isBarStart ? "beat-start" : ""
                  } ${isShadedBeat ? "shaded" : ""}`}
                  style={{ width: CELL_WIDTH }}
                  onClick={() => onToggleCell(rowIndex, stepIndex)}
                  aria-label={`${note} step ${stepIndex + 1}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
