import "./StepIndicator.css";

interface Props {
  chapter: number; // 0-based
  totalChapters: number;
  step: number; // 0-based
  chapterTotalSteps: number;
  globalIndex: number; // 0-based
  totalGlobal: number;
}

/**
 * Bottom-left position readout for manual browsing: global "12 / 29" plus
 * per-chapter "ch3/6 · s4/8". Hidden entirely in `?auto=1` recording mode
 * so screen captures never catch it — same convention as the hover-only
 * ProgressBar.
 */
export function StepIndicator({
  chapter,
  totalChapters,
  step,
  chapterTotalSteps,
  globalIndex,
  totalGlobal,
}: Props) {
  if (new URLSearchParams(window.location.search).get("auto") === "1") {
    return null;
  }
  return (
    <div className="step-indicator" data-no-advance>
      <span className="si-global">
        {globalIndex + 1} / {totalGlobal}
      </span>
      <span className="si-sub">
        ch{chapter + 1}/{totalChapters} · s{step + 1}/{chapterTotalSteps}
      </span>
    </div>
  );
}
