import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProgressBar } from "../../components/ProgressBar";

/**
 * Anteil eines Ziels — Track (`bg-surface-inset`) + accent-Füllung mit animierter
 * Breite. Geteilt über Tages-Checkliste (Start), kcal-Ziele (Wochenplan) und die
 * Registrierungsschritte.
 */
const meta = {
  title: "Atoms/Progress Bar",
  component: ProgressBar,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { value: 6, max: 10, size: "md", label: "Fortschritt" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md"] },
    value: { control: { type: "range", min: 0, max: 10 } },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { value: 0 } };
export const Full: Story = { args: { value: 10 } };
/** Kompakte Höhe für dichte Kontexte wie die Tageskarten im Wochenplan. */
export const Small: Story = { args: { size: "sm", value: 1850, max: 2064 } };
