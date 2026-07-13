import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AuthShell } from "../../components/auth/AuthShell";
import { FloatingField } from "../../components/auth/FloatingField";
import { PasswordField } from "../../components/auth/PasswordField";
import { AuthSubmit } from "../../components/auth/AuthSubmit";

/**
 * Geteiltes Bühnenbild der Auth-Seiten: Farbwolken im Hintergrund, das
 * Maskottchen **Pott** über der Karte, Karte mit Marke + Titel + Unterzeile und
 * seitenspezifischem Inhalt (Felder, Fortschritt, Absende-Button). Login und
 * Registrierung bauen beide darauf auf; `state` steuert Potts Reaktion.
 */
const meta = {
  title: "Organisms/Auth Shell",
  component: AuthShell,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    state: {
      control: "select",
      options: ["idle", "watching", "peeking", "peekingOpen", "error"],
    },
  },
  args: {
    state: "idle",
    title: "Willkommen zurück",
    subtitle: "Schön, dass du wieder am Herd bist.",
  },
  decorators: [
    (Story) => (
      <div className="relative mx-auto flex min-h-[560px] max-w-sm flex-col justify-center px-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AuthShell>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleFields = (
  <div className="flex flex-col gap-3">
    <FloatingField id="sb-user" name="username" label="Benutzername" />
    <PasswordField
      id="sb-pass"
      name="password"
      reveal={false}
      onToggleReveal={() => {}}
    />
    <AuthSubmit>Anmelden</AuthSubmit>
  </div>
);

/** Beispielkomposition wie die Login-Seite (Felder als Kinder). */
export const Login: Story = { args: { children: sampleFields } };

/** Pott lugt — Passwortfeld fokussiert. */
export const Peeking: Story = {
  args: { children: sampleFields, state: "peeking" },
};
