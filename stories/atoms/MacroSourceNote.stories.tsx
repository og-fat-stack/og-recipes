import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MacroSourceNote } from "../../components/MacroSourceNote";

/**
 * Kleingedruckte Herkunft der Makros unter den Nährwert-Kacheln
 * (`text-xs text-ink-subtle`). Mit `macroSource` stammen die Werte aus der
 * BLS-Nachrechnung — dann ist die Namensnennung des Max Rubner-Instituts
 * Pflicht (CC BY 4.0). Liegt der BLS-Anteil unter 100 %, nennt die Zeile ihn.
 * Ohne `macroSource` weist sie die Werte als Schätzung aus. Geteilt von der
 * Rezept-Vorschau (Generieren/Import) und der Rezept-Detailseite.
 */
const meta = {
  title: "Atoms/Macro Source Note",
  component: MacroSourceNote,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { macroSource: "bls-1", macroCoverage: 100 },
} satisfies Meta<typeof MacroSourceNote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullBls: Story = {};
/** Ein Teil der Zutaten (z. B. ein Spezialprodukt) ist nicht im BLS. */
export const PartialBls: Story = { args: { macroCoverage: 87 } };
/** Alte oder von Hand angelegte Rezepte ohne Nachrechnung. */
export const Estimated: Story = { args: { macroSource: null, macroCoverage: null } };
