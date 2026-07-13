import type { MascotState } from "./types";

/*
 * Vertrag zwischen App-Code und der Lottie-Datei "Pott"
 * (public/mascot/pott.json, erzeugt von scripts/buildPottLottie.mjs).
 *
 * Diese Datei ist die einzige Wahrheit über die Marker, die das JSON pro
 * Zustand tragen muss. Der Runtime liest die Marker beim Laden und mappt
 * Name → Frames — es müssen keine Frame-Nummern im Code gepflegt werden.
 */

export const LOTTIE_SRC = "/mascot/pott.json";

/** Marker-Namen, die das JSON pro Zustand definieren muss. */
export const LOTTIE_MARKERS: Record<MascotState, string> = {
  idle: "idle",
  watching: "watching",
  peeking: "peeking",
  peekingOpen: "peekingOpen",
  celebrate: "celebrate",
  error: "error",
};

/**
 * Zustände, deren Segment loopt (kontinuierliche Bewegung wie Blinzeln). Der
 * Rest spielt einmal und hält die Endpose — u. a. peeking/peekingOpen, damit die
 * Hände nicht immer wieder von der Seite hereinschieben.
 */
export const LOOP_STATES: MascotState[] = ["idle", "watching"];
