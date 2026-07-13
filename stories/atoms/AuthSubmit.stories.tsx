import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AuthSubmit } from "../../components/auth/AuthSubmit";

/**
 * Primäre Absende-Schaltfläche der Auth-Seiten (Login + Registrierung). Hebt sich
 * beim Hover, sinkt beim Druck; `pending` sperrt und dimmt sie.
 */
const meta = {
  title: "Atoms/Auth Submit",
  component: AuthSubmit,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { children: "Anmelden", pending: false },
  argTypes: { children: { control: "text" }, pending: { control: "boolean" } },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AuthSubmit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Pending: Story = { args: { children: "Wird angemeldet …", pending: true } };
export const Register: Story = { args: { children: "Konto erstellen" } };
