import { useEffect } from "react";
import "./AutoStartGate.css";

interface Props {
  visible: boolean;
  onStart(): void;
}

/**
 * Full-screen overlay shown ONCE when `?auto=1` is loaded. Browsers block
 * audio playback until the page receives a user gesture, so we show this
 * gate and let the user press Space (or click) to release auto playback.
 *
 * After the user starts, the gate is hidden for the rest of the session.
 */
export function AutoStartGate({ visible, onStart }: Props) {
  const unattended = new URLSearchParams(window.location.search).get("go") === "1";

  useEffect(() => {
    if (!visible || !unattended) return;
    const t = window.setTimeout(onStart, 2500);
    return () => window.clearTimeout(t);
  }, [visible, unattended, onStart]);

  if (!visible) return null;
  return (
    <div
      className="auto-gate"
      data-no-advance
      onClick={onStart}
      role="button"
      tabIndex={0}
    >
      <div className="auto-gate-card">
        <div className="auto-gate-kicker">AUTO PLAYBACK</div>
        <div className="auto-gate-title">点击任意处 或 按 空格键 开始</div>
        <div className="auto-gate-sub">
          Audio plays per step and advances automatically.
          <br />
          播放过程全自动；随时按 <kbd>M</kbd> 切换手动模式。
        </div>
      </div>
    </div>
  );
}
