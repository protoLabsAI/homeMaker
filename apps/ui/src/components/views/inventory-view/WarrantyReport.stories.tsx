import type { Meta, StoryObj } from '@storybook/react-vite';
import { WarrantyReport } from './warranty-report';
import {
  mockAssetRefrigerator,
  mockAssetLaptop,
  mockAssetHvacUnit,
  mockAssetCouch,
  mockWarrantyReport,
} from '../../stories/mockData';

const meta = {
  title: 'homeMaker/Inventory/WarrantyReport',
  component: WarrantyReport,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WarrantyReport>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MixedStates: Story = {
  args: {
    assets: [mockAssetRefrigerator, mockAssetLaptop, mockAssetHvacUnit, mockAssetCouch],
    warrantyReport: mockWarrantyReport,
  },
};

export const AllHealthy: Story = {
  args: {
    assets: [
      { ...mockAssetRefrigerator, id: 'a1' },
      { ...mockAssetRefrigerator, id: 'a2', name: 'LG Dishwasher', category: 'appliance' as const },
      { ...mockAssetRefrigerator, id: 'a3', name: 'Bosch Oven', category: 'appliance' as const },
    ],
    warrantyReport: {
      active: [
        { ...mockAssetRefrigerator, id: 'a1' },
        {
          ...mockAssetRefrigerator,
          id: 'a2',
          name: 'LG Dishwasher',
          category: 'appliance' as const,
        },
        { ...mockAssetRefrigerator, id: 'a3', name: 'Bosch Oven', category: 'appliance' as const },
      ],
      expiringSoon: [],
      expired: [],
      noWarranty: [],
    },
  },
};

export const AllExpired: Story = {
  args: {
    assets: [mockAssetHvacUnit, { ...mockAssetHvacUnit, id: 'hvac2', name: 'Water Heater' }],
    warrantyReport: {
      active: [],
      expiringSoon: [],
      expired: [mockAssetHvacUnit, { ...mockAssetHvacUnit, id: 'hvac2', name: 'Water Heater' }],
      noWarranty: [],
    },
  },
};

export const Empty: Story = {
  args: {
    assets: [],
    warrantyReport: null,
  },
};
