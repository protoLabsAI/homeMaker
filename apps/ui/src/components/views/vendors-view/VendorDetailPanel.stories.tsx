import type { Meta, StoryObj } from '@storybook/react-vite';
import { VendorDetailPanel } from './vendor-detail-panel';
import { mockVendorHvac, mockVendorPlumber, mockVendorElectrician } from '../../stories/mockData';
import { withQueryClientDecorator } from '../../stories/mockProviders';

const meta = {
  title: 'homeMaker/Vendors/VendorDetailPanel',
  component: VendorDetailPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [withQueryClientDecorator],
  args: {
    onClose: () => {},
    onDeleted: () => {},
  },
} satisfies Meta<typeof VendorDetailPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullProfile: Story = {
  args: {
    vendor: mockVendorHvac,
  },
};

export const MinimalProfile: Story = {
  args: {
    vendor: mockVendorElectrician,
  },
};

export const MediumRating: Story = {
  args: {
    vendor: mockVendorPlumber,
  },
};

export const Closed: Story = {
  args: {
    vendor: null,
  },
};
