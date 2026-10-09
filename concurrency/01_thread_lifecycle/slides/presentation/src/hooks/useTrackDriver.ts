import { useEffect, useRef } from "react";
import { TRACK_STARTS, TRACK_TOTAL } from "../trackTimeline";

interface Options {
  /** Full narration track element (rendered by App in track mode). */
  audio: HTMLAudioElement | null;
  /** true once the AutoStartGate releases playback. */
  started: boolean;
  paused: boolean;
  /** total steps on the track (45) */
  totalSteps: number;
  /** jump the deck to a global step (absolute — self-correcting) */
  onSeekStep: (globalStep: number) => void;
}

/**
 * Track-time driver for unattended capture (`?track=1`): one full narration
 * file plays, and steps advance purely by track currentTime crossing each
 * step's start time. Sync is guaranteed by construction — the same file is
 * muxed into the final video, so visuals and narration cannot drift.
 */
export function useTrackDriver({ audio, started, paused, totalSteps, onSeekStep }: Options) {
  const onSeekRef = useRef(onSeekStep);
  onSeekRef.current = onSeekStep;

  useEffect(() => {
    if (!started || !audio) return;
    let raf = 0;
    let step = 0;

    const tick = () => {
      const t = audio.currentTime;
      // absolute-seek while the next step's start time has been reached;
      // frozen time (pause) naturally holds the counter.
      while (step < totalSteps - 1 && t >= TRACK_STARTS[step + 1] - 0.03) {
        step += 1;
        onSeekRef.current(step);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const start = () => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };
    if (paused) audio.pause();
    else if (audio.currentTime < TRACK_TOTAL - 0.5 && audio.paused) start();

    return () => {
      cancelAnimationFrame(raf);
      audio.pause();
    };
  }, [started, audio, paused, totalSteps]);
}
