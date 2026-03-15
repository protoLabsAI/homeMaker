import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddEntryDialog } from './add-entry-dialog';

const meta = {
  title: 'homeMaker/Vault/AddEntryDialog',
  component: AddEntryDialog,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    open: true,
    onOpenChange: () => {},
    isMutating: false,
    onSubmit: async () => {},
  },
} satisfies Meta<typeof AddEntryDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyForm: Story = {};

export const Submitting: Story = {
  args: {
    isMutating: true,
  },
};

export const Closed: Story = {
  args: {
    open: false,
  },
};
