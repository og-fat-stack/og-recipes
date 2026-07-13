import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FloatingField } from "../../components/auth/FloatingField";

/**
 * Textfeld mit **Floating-Label** und teal Fokus-Unterstrich — das geteilte
 * Feld-Rezept der Auth-Seiten. Das Label sitzt als Platzhalter und wandert beim
 * Fokus/Füllen nach oben. Reicht alle `<input>`-Props durch.
 */
const meta = {
  title: "Molecules/Floating Field",
  component: FloatingField,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { label: "Benutzername", name: "demo" },
  argTypes: { label: { control: "text" } },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FloatingField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Leer — Label sitzt als Platzhalter. Fokussiere das Feld, um Label + Unterstrich zu sehen. */
export const Empty: Story = {};

/** Vorbefüllt — Label steht oben. */
export const Filled: Story = {
  args: { defaultValue: "kochprofi" },
};
