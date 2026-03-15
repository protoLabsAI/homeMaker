import type { Meta, StoryObj } from '@storybook/react-vite';
import { LevelCard } from './level-card';
import {
  mockGamificationProfileLow,
  mockGamificationProfileMid,
  mockGamificationProfileMax,
} from '../../stories/mockData';

const meta = {
  title: 'homeMaker/Profile/LevelCard',
  component: LevelCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof LevelCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Level1NewHomeowner: Story = {
  args: {
    profile: mockGamificationProfileLow,
  },
};

export const Level5NearLevelUp: Story = {
  args: {
    profile: mockGamificationProfileMid,
  },
};

export const Level10Maxed: Story = {
  args: {
    profile: mockGamificationProfileMax,
  },
};
