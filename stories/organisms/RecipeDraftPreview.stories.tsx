import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { RecipeDraftPreview } from "../../components/RecipeDraftPreview";

/**
 * Karte (`rounded-card border-line bg-surface`) mit einem noch nicht
 * gespeicherten Rezept: Titel + Eckdaten, der eine Primär-Button
 * „Übernehmen & Speichern“ (`bg-accent`), Makro-Kacheln mit
 * Macro Source Note, Technik-Tags, Zutaten und Schritte.
 *
 * Geteilt von `/recipes/search` (Rezeptsuche im Web) und `/recipes/import`
 * (Link-Import). `sourceUrl` zeigt die Originalseite. `warnings` listet in
 * einer Warn-Box Zutaten, die nicht zu den Vorgaben passen (z. B. Speck bei
 * vegetarischer Ernährung) — das Rezept selbst wird nie verändert.
 */
const meta = {
  title: "Organisms/Recipe Draft Preview",
  component: RecipeDraftPreview,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    onSave: fn(),
    saving: false,
    draft: {
      title: "Shakshuka mit Feta",
      cuisine: "Levantinisch",
      mealType: "main",
      portions: 2,
      kcalPerPortion: 412,
      proteinG: 26,
      carbG: 18,
      fatG: 26,
      batchStorageDays: 2,
      macroSource: "bls-1",
      macroCoverage: 100,
      ingredients: [
        { name: "Eier", qty: 5, unit: "Stück", grams: 275, bls: "E111100" },
        { name: "Tomaten, geschält (1 Dose ≈ 400 g)", qty: 1, unit: "Dose", grams: 400, bls: "G568900" },
        { name: "Speisezwiebel, gewürfelt", qty: 1, unit: "mittel", grams: 100, bls: "G480100" },
        { name: "Feta (Packung 200 g)", qty: 0.5, unit: "Packung", grams: 100, bls: "M012200" },
        { name: "Olivenöl", qty: 1, unit: "EL", grams: 10, bls: "Q120000" },
        { name: "Salz, Pfeffer" },
      ],
      steps: [
        "Die gewürfelte Zwiebel in 1 EL Olivenöl bei mittlerer Hitze 5 Min. anschwitzen, bis sie glasig ist.",
        "Die Dose Tomaten dazugeben, mit 1 TL Salz würzen und 10 Min. sämig einköcheln.",
        "5 Mulden formen, die 5 Eier hineingleiten lassen und zugedeckt 6–8 Min. stocken lassen, bis das Eiweiß weiß ist.",
        "Den zerbröselten Feta darüberstreuen, abschmecken und ggf. nachsalzen.",
      ],
      techniques: ["anschwitzen", "einköcheln", "pochieren"],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecipeDraftPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Über die Rezeptsuche gefunden, Makros aus dem BLS nachgerechnet. */
export const Found: Story = { args: { sourceUrl: "https://www.example.com/rezepte/shakshuka" } };

/** Per Link importiert, mit Warnung zu einer unpassenden Zutat. */
export const Imported: Story = {
  args: {
    sourceUrl: "https://www.example.com/rezepte/shakshuka",
    warnings: ["Merguez-Wurst — nicht vegetarisch"],
  },
};

/** BLS-Nachrechnung nicht möglich, Claudes Schätzung bleibt stehen. */
export const Estimated: Story = {
  args: {
    draft: { ...meta.args.draft, macroSource: undefined, macroCoverage: undefined },
  },
};

export const Saving: Story = { args: { saving: true } };
