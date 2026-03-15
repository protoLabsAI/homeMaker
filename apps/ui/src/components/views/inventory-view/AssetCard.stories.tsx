import type { Meta, StoryObj } from '@storybook/react-vite';
import { AssetCard } from './asset-card';
import {
  mockAssetRefrigerator,
  mockAssetLaptop,
  mockAssetHvacUnit,
  mockAssetCouch,
} from '../../stories/mockData';

const meta = {
  title: 'homeMaker/Inventory/AssetCard',
  component: AssetCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    onClick: () => {},
  },
} satisfies Meta<typeof AssetCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveWarranty: Story = {
  args: {
    asset: mockAssetRefrigerator,
  },
};

export const ExpiringWarranty: Story = {
  args: {
    asset: mockAssetLaptop,
  },
};

export const ExpiredWarranty: Story = {
  args: {
    asset: mockAssetHvacUnit,
  },
};

export const NoWarranty: Story = {
  args: {
    asset: mockAssetCouch,
  },
};

export const Selected: Story = {
  args: {
    asset: mockAssetRefrigerator,
    selected: true,
  },
};

export const MinimalFields: Story = {
  args: {
    asset: {
      ...mockAssetCouch,
      location: null,
      manufacturer: null,
      purchaseDate: null,
      name: 'Unknown Appliance',
      category: 'other',
    },
  },
};
