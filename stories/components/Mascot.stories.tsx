import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LottieMascot } from "../../components/mascot/LottieMascot";
import type { MascotState } from "../../components/mascot/types";

/**
 * **Pott** — das Maskottchen der App: ein Emaille-Bräter mit Gesicht, animiert
 * mit Lottie (`public/mascot/pott.json`, erzeugt von
 * `scripts/buildPottLottie.mjs`). Reine Präsentation, gesteuert über `state`;
 * jeder Zustand spielt sein Marker-Segment. Siehe „Lottie-Setup" für den Contract.
 */
const meta = {
  title: "Components/Mascot (Pott)",
  component: LottieMascot,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    state: {
      control: "select",
      options: ["idle", "watching", "peeking", "celebrate", "error"],
      description: "Zustand → spielt das gleichnamige Marker-Segment",
    },
    title: { control: "text" },
  },
  args: { state: "idle", className: "h-full w-full" },
  decorators: [
    (Story) => (
      <div style={{ width: 168, height: 178 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LottieMascot>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Spiel mit `state` in den Controls. */
export const Playground: Story = {};

export const Idle: Story = { args: { state: "idle" } };
/** Schaut nach unten aufs Feld — Benutzername-Fokus. */
export const Watching: Story = { args: { state: "watching" } };
/** Augen mit Ofenhandschuhen verdeckt — Passwort-Fokus. */
export const Peeking: Story = { args: { state: "peeking" } };
/** Hüpfer + Funken — erfolgreicher Login. */
export const Celebrate: Story = { args: { state: "celebrate" } };
/** Kopfschütteln + Stirnrunzeln — falsche Eingabe. */
export const ErrorState: Story = { args: { state: "error" } };

const STATES: MascotState[] = ["idle", "watching", "peeking", "celebrate", "error"];

/** Alle Zustände nebeneinander (jeder spielt sein Segment). */
export const AllStates: Story = {
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <Story />],
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, padding: 24 }}>
      {STATES.map((s) => (
        <figure key={s} style={{ margin: 0, textAlign: "center", width: 140 }}>
          <div style={{ width: 140, height: 150 }}>
            <LottieMascot state={s} className="h-full w-full" />
          </div>
          <figcaption className="text-xs text-ink-subtle">{s}</figcaption>
        </figure>
      ))}
    </div>
  ),
};
