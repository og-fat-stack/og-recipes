#!/usr/bin/env node
/*
 * Generiert public/mascot/pott.json — das Lottie-Maskottchen "Pott".
 *
 * Warum ein Generator statt handgeschriebenem JSON: Lottie-JSON ist riesig und
 * unlesbar. Hier stehen Formen, Farben und Bewegung als kompakter Code; die
 * Datei wird reproduzierbar erzeugt: `node scripts/buildPottLottie.mjs`.
 *
 * Koordinaten 200×210 (wie die SVG-Referenz). Farben aus der --og-mascot-*
 * Palette (Light-Theme) fest eingebacken. Zustände liegen als Zeitsegmente auf
 * der Timeline und werden per Marker angesprungen (siehe unten / lottieContract).
 *
 * Wichtige Lottie-Eigenheiten, die hier berücksichtigt sind:
 *  - Rechteck-Shape heißt "rc" (nicht "rr").
 *  - Frühere Shapes rendern WEITER VORNE → potShapes ist hinten→vorne definiert
 *    und wird beim Bauen umgedreht.
 *  - Pro Gruppe nur EIN Fill; mehrteilige Teile werden aus Sub-Gruppen gebaut.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FR = 30;
const OP = 300;

// Segmente (Frames) — Schlüssel = MascotState = Marker-Name. peekingOpen ist die
// "Passwort sichtbar"-Variante: Hände decken die Augen, rechts bleibt ein Spalt.
const SEG = {
  idle: [0, 45],
  watching: [50, 95],
  peeking: [100, 145],
  peekingOpen: [150, 195],
  celebrate: [200, 250],
  error: [255, 295],
};
// Gedeckte Teil-Haltung von peeking: Hände liegen ruhig auf den Augen, ohne das
// Einschieben von der Seite. Der Runtime spielt sie beim Schließen des Spalts
// (peekingOpen → peeking), damit die Hände nicht jedes Mal neu hereinfliegen.
SEG.peekingHold = [130, 145];

// ---- Farben (hex → Lottie 0..1 RGB) -------------------------------------
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const C = {
  body: rgb("#0d9488"), bodyShade: rgb("#115e59"), bodyLight: rgb("#2dd4bf"),
  lid: rgb("#0f766e"), rim: rgb("#f8fafc"), cheek: rgb("#fda4af"),
  face: rgb("#0f172a"), sclera: rgb("#ffffff"), steam: rgb("#cbd5e1"),
  sparkle: rgb("#fbbf24"),
  // Ofenhandschuhe (peeking): warm, kontrastreich gegen Teal-Gesicht & weiße Augen.
  mitt: rgb("#f59e0b"), mittCuff: rgb("#fcd34d"), mittSeam: rgb("#b45309"),
};

// ---- Keyframe-Helfer ----------------------------------------------------
const arr = (v) => (Array.isArray(v) ? v : [v]);
// Gehaltene (stufige) Keyframes — für Pose-Umschaltungen (Opazität, Pose).
const hold = (pts) => ({
  a: 1,
  k: pts.map(([t, s], i) =>
    i < pts.length - 1 ? { t, s: arr(s), h: 1 } : { t, s: arr(s) },
  ),
});
// Weiche Keyframes — für Bewegung (Blinzeln, Hüpfer, Shake, Hände hereinschieben).
const ease = (pts) => ({
  a: 1,
  k: pts.map(([t, s], i) =>
    i < pts.length - 1
      ? { t, s: arr(s), i: { x: [0.5], y: [1] }, o: { x: [0.5], y: [0] } }
      : { t, s: arr(s) },
  ),
});

// ---- Shape-Bausteine ----------------------------------------------------
const fill = (c, o = 100) => ({ ty: "fl", c: { a: 0, k: c }, o: { a: 0, k: o }, r: 1, nm: "fl" });
const stroke = (c, w, o = 100) => ({ ty: "st", c: { a: 0, k: c }, o: { a: 0, k: o }, w: { a: 0, k: w }, lc: 2, lj: 2, ml: 4, nm: "st" });
const ellipse = (cx, cy, rx, ry) => ({ ty: "el", p: { a: 0, k: [cx, cy] }, s: { a: 0, k: [rx * 2, ry * 2] }, nm: "el" });
const rect = (cx, cy, w, h, r) => ({ ty: "rc", p: { a: 0, k: [cx, cy] }, s: { a: 0, k: [w, h] }, r: { a: 0, k: r }, nm: "rc" });
const path = (closed, v, i, o) => ({ ty: "sh", ks: { a: 0, k: { c: closed, v, i: i ?? v.map(() => [0, 0]), o: o ?? v.map(() => [0, 0]) } }, nm: "sh" });

const tr = (o = {}) => ({
  ty: "tr",
  p: o.p ?? { a: 0, k: [0, 0] }, a: o.a ?? { a: 0, k: [0, 0] },
  s: o.s ?? { a: 0, k: [100, 100] }, r: o.r ?? { a: 0, k: 0 },
  o: o.o ?? { a: 0, k: 100 }, sk: { a: 0, k: 0 }, sa: { a: 0, k: 0 }, nm: "tr",
});
const group = (nm, items, trans = tr()) => ({ ty: "gr", nm, it: [...items, trans] });
const sub = (nm, shape, style, trans = tr()) => group(nm, [shape, style], trans);

// ---- Posen-Keyframes ----------------------------------------------------
// Hände sichtbar bei peeking & peekingOpen.
const mittO = hold([[0, 0], [SEG.peeking[0], 100], [SEG.peekingOpen[1] + 1, 0]]);
// Linke Hand: von UNTEN hereinschieben, deckt das linke Auge in BEIDEN Varianten.
const handLp = ease([
  [0, [0, 70]], [SEG.peeking[0], [0, 70]], [SEG.peeking[0] + 8, [0, 0]],
  [SEG.peekingOpen[1], [0, 0]],
]);
// Rechte Hand: von unten herein; bei peekingOpen schiebt sie sich zur SEITE
// (nach außen) → das rechte Auge lugt daneben hervor, links bleibt bedeckt.
const handRp = ease([
  [0, [0, 70]], [SEG.peeking[0], [0, 70]], [SEG.peeking[0] + 8, [0, 0]],
  [SEG.peekingOpen[0], [0, 0]], [SEG.peekingOpen[0] + 9, [26, 0]], [SEG.peekingOpen[1], [26, 0]],
]);
// Münder: smile Standard; open bei celebrate; frown bei error.
const smileO = hold([[0, 100], [SEG.celebrate[0], 0]]);
const openO = hold([[0, 0], [SEG.celebrate[0], 100], [SEG.celebrate[1] + 1, 0]]);
const frownO = hold([[0, 0], [SEG.error[0], 100]]);
// Pupillen: runter bei watching; die RECHTE lugt bei peekingOpen zur Seite (peek).
const pupilL = hold([[0, [0, 0]], [SEG.watching[0], [0, 4]], [SEG.watching[1] + 1, [0, 0]]]);
const pupilR = hold([
  [0, [0, 0]], [SEG.watching[0], [0, 4]], [SEG.watching[1] + 1, [0, 0]],
  [SEG.peekingOpen[0], [-3, 1]], [SEG.peekingOpen[1] + 1, [0, 0]],
]);
// Blinzeln (scaleY) in idle & watching.
const blink = ease([
  [0, [100, 100]], [30, [100, 100]], [33, [100, 12]], [36, [100, 100]],
  [80, [100, 100]], [83, [100, 12]], [86, [100, 100]], [OP, [100, 100]],
]);

// Eine Ofenhandschuh-Hand, die von UNTEN kommt: Fingerkuppen greifen oben übers
// Auge, Pad deckt es, Unterarm + Stulpe reichen senkrecht NACH UNTEN aus dem Bild
// (padX=Augenmitte, side=-1 links / +1 rechts für Daumen außen).
const hand = (nm, padX, side, posK) =>
  group(nm, [
    sub("sep-a", path(false, [[padX - 6, 99], [padX - 6, 121]]), stroke(C.mittSeam, 2, 45)),
    sub("sep-b", path(false, [[padX + 6, 99], [padX + 6, 121]]), stroke(C.mittSeam, 2, 45)),
    sub("tip1", ellipse(padX - 11, 100, 6.5, 7), fill(C.mitt)),
    sub("tip2", ellipse(padX, 98, 6.5, 7.5), fill(C.mitt)),
    sub("tip3", ellipse(padX + 11, 100, 6.5, 7), fill(C.mitt)),
    sub("thumb", ellipse(padX + side * 18, 122, 7, 9), fill(C.mitt)),
    sub("pad", ellipse(padX, 116, 20, 18), fill(C.mitt)),
    sub("arm", rect(padX, 150, 26, 44, 12), fill(C.mitt)),
    sub("cuff", rect(padX, 176, 30, 14, 6), fill(C.mittCuff)),
  ], tr({ o: mittO, p: posK }));

// ---- Pott (hinten → vorne definiert; wird beim Bauen umgedreht) ----------
const potShapes = [
  // hinten
  group("knob-stem", [rect(100, 53, 7, 12, 3), fill(C.rim)]),
  group("knob", [ellipse(100, 52, 8, 8), fill(C.rim)]),
  group("lid", [ellipse(100, 70, 50, 15), fill(C.lid)]),
  group("rim", [ellipse(100, 79, 53, 9), fill(C.rim)]),
  group("handle-l", [ellipse(48, 124, 9, 13), fill(C.lid)]),
  group("handle-r", [ellipse(152, 124, 9, 13), fill(C.lid)]),
  group("body", [rect(100, 129, 100, 98, 32), fill(C.body)]),
  group("sheen", [ellipse(76, 112, 14, 24), fill(C.bodyLight, 25)]),
  group("cheek-l", [ellipse(66, 134, 7, 5), fill(C.cheek, 70)]),
  group("cheek-r", [ellipse(134, 134, 7, 5), fill(C.cheek, 70)]),
  // Münder
  group("mouth-smile", [path(false, [[89, 137], [100, 148], [111, 137]], [[0, 0], [-6, 0], [0, 0]], [[0, 0], [6, 0], [0, 0]]), stroke(C.face, 4)], tr({ o: smileO })),
  group("mouth-frown", [path(false, [[88, 146], [100, 136], [112, 146]], [[0, 0], [-6, 0], [0, 0]], [[0, 0], [6, 0], [0, 0]]), stroke(C.face, 4)], tr({ o: frownO })),
  group("mouth-open", [
    sub("tongue", ellipse(100, 147, 4, 3), fill(C.cheek)),
    sub("hole", ellipse(100, 143, 8, 7), fill(C.face)),
  ], tr({ o: openO })),
  // Augen (Blinzeln um Augenmitte; Pupille/Catch mit Blickrichtung)
  group("eye-l", [
    sub("catch", ellipse(77, 116, 2.2, 2.2), fill(C.sclera), tr({ p: pupilL })),
    sub("pupil", ellipse(80, 119, 6, 6), fill(C.face), tr({ p: pupilL })),
    sub("sclera", ellipse(80, 118, 13, 13), fill(C.sclera)),
  ], tr({ a: { a: 0, k: [80, 118] }, p: { a: 0, k: [80, 118] }, s: blink })),
  group("eye-r", [
    sub("catch", ellipse(117, 116, 2.2, 2.2), fill(C.sclera), tr({ p: pupilR })),
    sub("pupil", ellipse(120, 119, 6, 6), fill(C.face), tr({ p: pupilR })),
    sub("sclera", ellipse(120, 118, 13, 13), fill(C.sclera)),
  ], tr({ a: { a: 0, k: [120, 118] }, p: { a: 0, k: [120, 118] }, s: blink })),
  // vorne: zwei Hände, die von UNTEN kommen und die Augen bedecken. Bei
  // peekingOpen schiebt sich die rechte Hand zur Seite → das rechte Auge lugt daneben.
  hand("hand-l", 78, -1, handLp),
  hand("hand-r", 122, 1, handRp),
];

const steamWisp = (x) =>
  group(`steam-${x}`, [path(false, [[0, 0], [4, -12], [-4, -26], [0, -40]]), stroke(C.steam, 5, 70)], tr({ p: { a: 0, k: [x, 64] } }));

function starPath() {
  return path(true, [[0, -8], [2.2, -2.2], [8, 0], [2.2, 2.2], [0, 8], [-2.2, 2.2], [-8, 0], [-2.2, -2.2]]);
}

const layer = (ind, nm, shapes, ks) => ({ ddd: 0, ind, ty: 4, nm, sr: 1, ks, ao: 0, shapes, ip: 0, op: OP, st: 0, bm: 0 });

// Pott-Ebene: Hüpfer (p) bei celebrate, Shake (r) bei error, Pivot [100,120].
const pottKs = {
  o: { a: 0, k: 100 },
  r: ease([
    [0, 0], [SEG.error[0], 0], [SEG.error[0] + 7, -4], [SEG.error[0] + 15, 4],
    [SEG.error[0] + 23, -3], [SEG.error[0] + 31, 3], [SEG.error[1], 0],
  ]),
  p: ease([
    [0, [100, 120, 0]], [SEG.celebrate[0], [100, 120, 0]], [SEG.celebrate[0] + 12, [100, 104, 0]],
    [SEG.celebrate[0] + 26, [100, 120, 0]], [SEG.celebrate[0] + 36, [100, 114, 0]], [SEG.celebrate[1], [100, 120, 0]],
  ]),
  a: { a: 0, k: [100, 120, 0] }, s: { a: 0, k: [100, 100, 100] },
};
// Funken-Ebene: nur bei celebrate ein-/ausblenden.
const sparkKs = {
  o: ease([
    [0, 0], [SEG.celebrate[0], 0], [SEG.celebrate[0] + 10, 100],
    [SEG.celebrate[1] - 12, 100], [SEG.celebrate[1], 0],
  ]),
  r: { a: 0, k: 0 }, p: { a: 0, k: [100, 120, 0] }, a: { a: 0, k: [100, 120, 0] }, s: { a: 0, k: [100, 100, 100] },
};
const staticKs = { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [100, 120, 0] }, a: { a: 0, k: [100, 120, 0] }, s: { a: 0, k: [100, 100, 100] } };

const layers = [
  layer(1, "sparkles", [
    group("spark-1", [starPath(), fill(C.sparkle)], tr({ p: { a: 0, k: [58, 74] } })),
    group("spark-2", [starPath(), fill(C.sparkle)], tr({ p: { a: 0, k: [142, 68] } })),
    group("spark-3", [starPath(), fill(C.sparkle)], tr({ p: { a: 0, k: [100, 46] } })),
  ], sparkKs),
  layer(2, "pott", [...potShapes].reverse(), pottKs),
  layer(3, "steam", [steamWisp(84), steamWisp(100), steamWisp(116)], staticKs),
  layer(4, "shadow", [group("shadow", [ellipse(100, 193, 50, 7), fill(C.face, 10)])], staticKs),
];

const doc = {
  v: "5.7.0", fr: FR, ip: 0, op: OP, w: 200, h: 210, nm: "Pott", ddd: 0, assets: [],
  layers,
  markers: Object.entries(SEG).map(([cm, [a, b]]) => ({ tm: a, cm, dr: b - a })),
};

mkdirSync(join(ROOT, "public/mascot"), { recursive: true });
writeFileSync(join(ROOT, "public/mascot/pott.json"), JSON.stringify(doc));
console.log("wrote public/mascot/pott.json —", JSON.stringify(doc).length, "bytes");
