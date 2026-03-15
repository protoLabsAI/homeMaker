import type { Meta, StoryObj } from '@storybook/react-vite';
import { VendorCard } from './vendor-card';
import { mockVendorHvac, mockVendorPlumber, mockVendorElectrician } from '../../stories/mockData';

const meta = {
  title: 'homeMaker/Vendors/VendorCard',
  component: VendorCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    onClick: () => {},
  },
} satisfies Meta<typeof VendorCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FiveStarRating: Story = {
  args: {
    vendor: mockVendorHvac,
  },
};

export const ThreeStarRating: Story = {
  args: {
    vendor: mockVendorPlumber,
  },
};

export const Unrated: Story = {
  args: {
    vendor: mockVendorElectrician,
  },
};

export const NoCompanyName: Story = {
  args: {
    vendor: mockVendorElectrician,
  },
};

export const FullDetails: Story = {
  args: {
    vendor: mockVendorHvac,
  },
};
