import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddAssetDialog } from './add-asset-dialog';

const meta = {
  title: 'homeMaker/Inventory/AddAssetDialog',
  component: AddAssetDialog,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    open: true,
    onClose: () => {},
    onCreate: async () => {},
    isMutating: false,
  },
} satisfies Meta<typeof AddAssetDialog>;

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
