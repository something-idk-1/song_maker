import { useState } from "react";
import { t, type Language } from "../lib/i18n";

interface ExportNameModalProps {
  // "Export MIDI" / "Export WAV" 처럼 모달 제목에 그대로 쓸 문자열 — App.tsx에서 t()로 미리 만들어서 넘겨줌.
  title: string;
  // 파일 확장자(점 포함, 예: ".mid", ".wav") — 입력창 옆에 붙여서 미리 보여주고, 실제 다운로드 시 그대로 붙임.
  extension: string;
  defaultName: string;
  onConfirm: (name: string) => void;
  onClose: () => void;
  language: Language;
}

// 브라우저 기본 window.prompt() 대신 쓰는 자체 파일 이름 입력 팝업.
// 다른 모달들(SettingsModal/InstrumentPicker)이랑 같은 modal-overlay 패턴을 따름.
export function ExportNameModal({ title, extension, defaultName, onConfirm, onClose, language }: ExportNameModalProps) {
  const [name, setName] = useState(defaultName);
  const trimmed = name.trim();

  const handleConfirm = () => {
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="export-name-modal" onClick={(e) => e.stopPropagation()}>
        <div className="instrument-picker-header">
          <span>{title}</span>
          <button className="icon-button-ghost" onClick={onClose} aria-label={t(language, "export.close")}>
            ✕
          </button>
        </div>

        <div className="export-name-field">
          <span className="modal-field-label">{t(language, "export.fileName")}</span>
          <div className="export-name-input-row">
            <input
              className="export-name-input"
              type="text"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
                if (e.key === "Escape") onClose();
              }}
            />
            <span className="export-name-extension">{extension}</span>
          </div>
        </div>

        <div className="export-name-actions">
          <button className="button-ghost" onClick={onClose}>
            {t(language, "export.cancel")}
          </button>
          <button className="button-primary" onClick={handleConfirm} disabled={!trimmed}>
            {t(language, "export.export")}
          </button>
        </div>
      </div>
    </div>
  );
}
