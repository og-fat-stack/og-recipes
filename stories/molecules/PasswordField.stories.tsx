import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { PasswordField } from "../../components/auth/PasswordField";

/**
 * Passwortfeld mit Auge-Button (baut auf [Floating Field](/docs/molecules-floating-field--docs)
 * auf). `reveal` ist **kontrolliert**: die Auth-Seiten spiegeln ihn ins
 * Maskottchen (peeking ↔ peekingOpen). Der Button hält per mousedown-preventDefault
 * den Fokus im Feld.
 */
const meta = {
  title: "Molecules/Password Field",
  component: PasswordField,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    label: "Passwort",
    name: "password",
    reveal: false,
    onToggleReveal: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PasswordField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Kontrollierter `reveal`-State — klick auf das Auge blendet das Passwort ein/aus. */
export const Default: Story = {
  render: (args) => {
    const [reveal, setReveal] = useState(false);
    return (
      <PasswordField
        {...args}
        reveal={reveal}
        onToggleReveal={() => setReveal((v) => !v)}
        defaultValue="geheim12"
      />
    );
  },
};
