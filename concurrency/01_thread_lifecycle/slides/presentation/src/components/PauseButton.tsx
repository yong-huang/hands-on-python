import { useEffect, useRef } from "react";
import "./PauseButton.css";

interface Props {
  paused: boolean;
  onToggle(): void;
}

/**
 * Pause / resume for audio + auto-advance, fixed top-right next to the mode
 * toggle (same hidden-on-hover convention as AutoToggle). `P` key toggles.
 * `data-no-advance` so clicking the button doesn't advance the stage.
 */
export function PauseButton({ paused, onToggle }: Props) {
  const toggleRef = useRef(onToggle);
  toggleRef.current = onToggle;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        toggleRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pb-hover" data-no-advance>
      <button
        className={`pb-btn ${paused ? "pb-paused" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleRef.current();
        }}
        title="暂停 / 继续（P）"
      >
        <span className="pb-icon">{paused ? "▶" : "❚❚"}</span>
        <span className="pb-label">{paused ? "RESUME" : "PAUSE"}</span>
      </button>
    </div>
  );
}
