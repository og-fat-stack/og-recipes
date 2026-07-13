import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Toggle } from "../../components/Toggle";

/**
 * Boolean-Einstellung als volle Karten-Zeile: Titel + Beschreibung links, Switch
 * rechts. Die ganze Zeile ist klickbar (`aria-pressed`). Feature-Schalter wie
 * `ActivityToggle` und `BudgetToggle` sind dünne Wrapper darüber.
 */
const meta = {
  title: "Atoms/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    enabled: true,
    title: "Aktivität einrechnen",
    description: "Training & Schritte: +405 kcal/Tag im Ziel",
    onToggle: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 520 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Klickbar — schaltet lokalen State (in echt: Server-Action in `useTransition`). */
export const Interactive: Story = {
  render: (args) => {
    const [on, setOn] = useState(true);
    return (
      <Toggle
        {...args}
        enabled={on}
        onToggle={() => setOn((v) => !v)}
        description={
          on
            ? "An — Plan & Rezepte bevorzugen günstige Zutaten (< 3 €/Portion)"
            : "Aus — keine Budget-Einschränkung"
        }
      />
    );
  },
};

export const On: Story = { args: { enabled: true } };
export const Off: Story = {
  args: {
    enabled: false,
    description: "Aus — Ziele nur aus dem Grundbedarf (keine Extra-kcal)",
  },
};
/** Während der Server-Action gesperrt und gedimmt. */
export const Pending: Story = { args: { pending: true } };
