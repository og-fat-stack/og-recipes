export type MascotState =
  | "idle" // ruhig
  | "watching" // schaut nach unten aufs Feld (Benutzername)
  | "peeking" // Hände von den Seiten bedecken beide Augen (Passwort verdeckt)
  | "peekingOpen" // Hände bedecken, rechts bleibt ein Spalt (Passwort sichtbar → Pott lugt)
  | "error"; // Kopfschütteln + Stirnrunzeln (Fehler)
