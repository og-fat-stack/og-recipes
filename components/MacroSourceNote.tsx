/**
 * Woher stammen die Makros eines Rezepts? Entweder aus der BLS-Nachrechnung
 * (Bundeslebensmittelschlüssel 4.0, CC BY 4.0 — Namensnennung des Max
 * Rubner-Instituts ist Pflicht) oder aus einer Schätzung.
 */
export function MacroSourceNote({
  macroSource,
  macroCoverage,
}: {
  macroSource?: string | null;
  macroCoverage?: number | null;
}) {
  if (!macroSource) {
    return (
      <p className="text-xs text-ink-subtle">
        Nährwerte geschätzt (nicht mit dem BLS nachgerechnet).
      </p>
    );
  }
  return (
    <p className="text-xs text-ink-subtle">
      Nährwerte berechnet mit dem Bundeslebensmittelschlüssel (BLS 4.0, Max
      Rubner-Institut, CC BY 4.0)
      {macroCoverage != null && macroCoverage < 100
        ? ` · ${macroCoverage} % der Kalorien aus BLS-Daten, Rest geschätzt`
        : ""}
      .
    </p>
  );
}
