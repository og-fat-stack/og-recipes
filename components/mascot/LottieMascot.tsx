"use client";

import { useCallback, useEffect, useRef } from "react";
import lottie, { type AnimationItem } from "lottie-web";
import type { MascotState } from "./types";
import { LOTTIE_SRC, LOOP_STATES } from "./lottieContract";

type Seg = [number, number];
// Rohe Lottie-Marker aus dem JSON: tm=Startframe, cm=Name, dr=Dauer.
type RawMarker = { tm: number; cm?: string; dr?: number };

export type LottieMascotProps = {
  state?: MascotState;
  /** Von der Login-Seite mitgegeben, in Lottie ohne Wirkung (siehe Contract). */
  warmth?: 0 | 1 | 2;
  className?: string;
  title?: string;
};

/**
 * Das Maskottchen "Pott" als Lottie. Lädt public/mascot/pott.json und spielt
 * pro `state` das gleichnamige Marker-Segment (siehe lottieContract.ts).
 *
 * Bewusst DIREKT über lottie-web (nicht lottie-react): lottie-react re-appliziert
 * deklarativ `loop`/`autoplay` und kollidiert mit unserem imperativen
 * `playSegments` — die Loop-Segmente froren nach einem Durchlauf ein. Imperative
 * Steuerung hält Loop-Zustände (idle/watching) sauber am Laufen.
 */
export function LottieMascot({ state = "idle", className, title }: LottieMascotProps) {
  const container = useRef<HTMLDivElement>(null);
  const anim = useRef<AnimationItem | null>(null);
  // Segmente werden per Marker-Name (String) angesprochen — inkl. interner Marker
  // wie "peekingHold", die kein MascotState sind.
  const segs = useRef<Record<string, Seg>>({});
  const stateRef = useRef<MascotState>(state);
  const prev = useRef<MascotState>(state);

  const play = useCallback((s: MascotState) => {
    const a = anim.current;
    if (!a) return;
    // Spalt schließen (peekingOpen → peeking): nur die gedeckte Haltung zeigen,
    // statt die Hände erneut von der Seite hereinzuschieben.
    const key =
      prev.current === "peekingOpen" && s === "peeking" ? "peekingHold" : s;
    const seg = segs.current[key] ?? segs.current[s];
    if (!seg) return;
    // Reduced Motion: Endpose des Segments statisch zeigen (z. B. Hände bedeckt).
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    prev.current = s;
    if (reduce) {
      a.goToAndStop(seg[1], true);
      return;
    }
    a.loop = LOOP_STATES.includes(s);
    a.playSegments(seg, true);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(LOTTIE_SRC)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { markers?: RawMarker[] }) => {
        if (!alive || !container.current) return;
        const map: Record<string, Seg> = {};
        for (const m of data.markers ?? []) {
          if (m.cm) map[m.cm] = [m.tm, m.tm + (m.dr ?? 0)];
        }
        segs.current = map;
        const a = lottie.loadAnimation({
          container: container.current!,
          renderer: "svg",
          loop: false,
          autoplay: false,
          animationData: data,
        });
        anim.current = a;
        a.addEventListener("DOMLoaded", () => play(stateRef.current));
      })
      .catch(() => {});
    return () => {
      alive = false;
      anim.current?.destroy();
      anim.current = null;
    };
  }, [play]);

  useEffect(() => {
    stateRef.current = state;
    play(state);
  }, [state, play]);

  return (
    <div
      ref={container}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
