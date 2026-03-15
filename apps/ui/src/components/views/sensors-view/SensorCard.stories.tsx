import type { Meta, StoryObj } from '@storybook/react-vite';
import { SensorCard } from './sensor-card';
import {
  mockSensorTemperatureActive,
  mockSensorHumidityStale,
  mockSensorEnergyOffline,
} from '../../stories/mockData';

const meta = {
  title: 'homeMaker/Sensors/SensorCard',
  component: SensorCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SensorCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveTemperature: Story = {
  args: {
    entry: mockSensorTemperatureActive,
  },
};

export const StaleHumidity: Story = {
  args: {
    entry: mockSensorHumidityStale,
  },
};

export const OfflineEnergy: Story = {
  args: {
    entry: mockSensorEnergyOffline,
  },
};

export const NoReading: Story = {
  args: {
    entry: {
      ...mockSensorTemperatureActive,
      reading: undefined,
      state: 'active' as const,
      sensor: {
        ...mockSensorTemperatureActive.sensor,
        id: 'sensor-no-data',
        name: 'New Sensor (No Data Yet)',
        lastSeenAt: undefined,
      },
    },
  },
};
