import type { Meta, StoryObj } from '@storybook/react-vite';
import { AssetDetailPanel } from './asset-detail-panel';
import { mockAssetRefrigerator, mockAssetCouch, mockAssetHvacUnit } from '../../stories/mockData';

const meta = {
  title: 'homeMaker/Inventory/AssetDetailPanel',
  component: AssetDetailPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    open: true,
    onClose: () => {},
    onUpdate: async () => mockAssetRefrigerator,
    onDelete: async () => true,
    isMutating: false,
  },
} satisfies Meta<typeof AssetDetailPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullAsset: Story = {
  args: {
    asset: mockAssetRefrigerator,
  },
};

export const WithLinkedSensors: Story = {
  args: {
    asset: mockAssetHvacUnit,
  },
};

export const MinimalFields: Story = {
  args: {
    asset: mockAssetCouch,
  },
};

export const Saving: Story = {
  args: {
    asset: mockAssetRefrigerator,
    isMutating: true,
  },
};

export const Closed: Story = {
  args: {
    asset: null,
    open: false,
  },
};
