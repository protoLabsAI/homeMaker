import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuestList } from './quest-list';
import { mockQuests } from '../../stories/mockData';

const meta = {
  title: 'homeMaker/Profile/QuestList',
  component: QuestList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof QuestList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveQuests: Story = {
  args: {
    quests: mockQuests,
  },
};

export const AllComplete: Story = {
  args: {
    quests: mockQuests.map((q) => ({ ...q, progress: q.target })),
  },
};

export const SingleQuest: Story = {
  args: {
    quests: [mockQuests[0]],
  },
};

export const Empty: Story = {
  args: {
    quests: [],
  },
};
