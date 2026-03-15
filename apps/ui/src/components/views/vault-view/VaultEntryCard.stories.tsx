import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from '@storybook/test';
import { VaultEntryCard } from './vault-entry-card';
import {
  mockVaultEntryPassword,
  mockVaultEntryApiKey,
  mockVaultEntryWifi,
  mockVaultEntryMinimal,
} from '../../stories/mockData';

const meta = {
  title: 'homeMaker/Vault/VaultEntryCard',
  component: VaultEntryCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    onDelete: fn(),
    onFetchDecryptedValue: async () => 'my-secret-value-1234',
    isMutating: false,
  },
} satisfies Meta<typeof VaultEntryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PasswordEntry: Story = {
  args: {
    entry: mockVaultEntryPassword,
  },
};

export const ApiKeyEntry: Story = {
  args: {
    entry: mockVaultEntryApiKey,
  },
};

export const WifiEntry: Story = {
  args: {
    entry: mockVaultEntryWifi,
  },
};

export const MinimalEntry: Story = {
  args: {
    entry: mockVaultEntryMinimal,
  },
};

export const Deleting: Story = {
  args: {
    entry: mockVaultEntryPassword,
    isMutating: true,
  },
};
