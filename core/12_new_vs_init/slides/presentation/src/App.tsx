import "./styles/fonts.css"; // Google Fonts for built-in themes
import "./styles/base.css";
import "./styles/tokens.css"; // active theme — 须在 base.css 之后：同权重 :root 主题性格才不被 base 默认值覆盖（PLAYBOOK 坑 12）
import "./styles/animations.css";

import { useCallback, useState } from "react";
import { AutoStartGate } from "./components/AutoStartGate";
import { AutoToggle } from "./components/AutoToggle";
import { PauseButton } from "./components/PauseButton";
import { ProgressBar } from "./components/ProgressBar";
import { Stage } from "./components/Stage";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useAutoMode } from "./hooks/useAutoMode";
import { useStepper } from "./hooks/useStepper";
import { CHAPTERS } from "./registry/chapters";

/**
 * Estimate spoken duration of a Chinese narration string. Native pace
 * ≈ 4 char/s → 250ms per char. Used as Auto-mode fallback ONLY when the
 * audio file is missing / fails / the narration is empty. When audio plays
 * normally, this value is unused — auto-advance fires on `audio.ended`.
 */
function estimateMs(text: string): number {
  if (!text) return 1500;
  return Math.max(1500, text.length * 250);
}

export default function App() {
  const stepper = useStepper(CHAPTERS);
  const ch = CHAPTERS[stepper.cursor.chapter]!;
  const Cmp = ch.Component;
  const stepText = ch.narrations[stepper.cursor.step] ?? "";

  const { mode, cycleMode, autoStarted, setAutoStarted } = useAutoMode();
  const [paused, setPaused] = useState(false);

  // Audio path follows the convention: /audio/<chapter-id>/<step+1>.mp3
  // (1-indexed file names match what `extract-narrations.ts` outputs.)
  // Empty narration → no audio src, Auto mode falls back to estimate.
  const audioSrc =
    mode === "manual" || stepText === ""
      ? null
      : `${import.meta.env.BASE_URL}audio/${ch.id}/${stepper.cursor.step + 1}.mp3`;

  const onAutoAdvance = useCallback(() => stepper.next(), [stepper]);

  useAudioPlayer({
    src: audioSrc,
    mode,
    trailMs: 200,
    estimateFallbackMs: estimateMs(stepText),
    onAutoAdvance,
    autoStarted,
    paused,
  });

  // Switching mode cancels pause — the new mode starts clean.
  const handleCycleMode = useCallback(() => {
    setPaused(false);
    cycleMode();
  }, [cycleMode]);

  return (
    <>
      <Stage onAdvance={stepper.next}>
        <div key={ch.id} className="scene">
          <Cmp step={stepper.cursor.step} />
        </div>
      </Stage>
      <ProgressBar
        chapters={CHAPTERS}
        cursor={stepper.cursor}
        onJumpChapter={stepper.jumpToChapter}
      />
      <AutoToggle mode={mode} onCycle={handleCycleMode} />
      <PauseButton paused={paused} onToggle={() => setPaused((p) => !p)} />
      <AutoStartGate
        visible={mode === "auto" && !autoStarted}
        onStart={() => {
          setPaused(false);
          setAutoStarted(true);
        }}
      />
    </>
  );
}
