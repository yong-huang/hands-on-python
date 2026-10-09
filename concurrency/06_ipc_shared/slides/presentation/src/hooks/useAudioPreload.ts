import { useEffect, useMemo, useState } from "react";

/**
 * Pre-fetch every step's narration as a blob URL so Auto-mode step switches
 * swap `src` instantly (no per-step network fetch → no cumulative drift
 * between the on-screen step timeline and a deterministically assembled
 * narration track). Falls back to the original URL until the blob is ready.
 *
 * `enabled` should be true whenever playback may happen (any non-manual
 * mode); fetching starts immediately so blobs are warm before the
 * AutoStartGate releases playback.
 */
export function useAudioPreload(urls: string[], enabled: boolean) {
  const key = useMemo(() => urls.join("|"), [urls]);
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!enabled || urls.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        urls.map(async (u) => {
          try {
            const res = await fetch(u);
            if (!res.ok) return null;
            const blob = await res.blob();
            return [u, URL.createObjectURL(blob)] as const;
          } catch {
            return null;
          }
        })
      );
      if (!cancelled && entries.some(Boolean)) {
        setMap(
          Object.fromEntries(entries.filter(Boolean) as readonly (readonly [string, string])[])
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

  return map;
}
