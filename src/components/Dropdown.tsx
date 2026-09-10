import { useEffect, useRef, useState } from "react";

// 네이티브 <select>는 닫혀있을 때는 CSS로 스타일 줄 수 있는데, 펼쳤을 때 나오는 옵션 목록은
// 브라우저가 강제로 자기 기본 스타일(회색 배경, OS 기본 파란 호버)을 씀 — CSS로 못 건드림.
// 그래서 이 프로젝트의 모노크롬 톤에 맞게 옵션 목록까지 직접 그리는 드롭다운을 따로 만듦.
export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  align?: "left" | "right";
}

export function Dropdown({ value, options, onChange, className, align = "right" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className={`dropdown ${className ?? ""}`} ref={rootRef}>
      <button
        type="button"
        className="dropdown-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected?.label ?? value}</span>
        <span className="dropdown-arrow" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul className={`dropdown-list dropdown-list-${align}`} role="listbox">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                className={`dropdown-option ${opt.value === value ? "selected" : ""}`}
                role="option"
                aria-selected={opt.value === value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
