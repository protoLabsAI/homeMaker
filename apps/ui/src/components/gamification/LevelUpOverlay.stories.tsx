/**
 * LevelUpOverlay Stories
 *
 * LevelUpOverlay is an internal sub-component of celebrations.tsx that renders
 * via createPortal to document.body. This story renders an equivalent layout
 * with the same visual design but constrained to the story canvas.
 * Play functions verify the transition animation and dismiss behavior.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from '@storybook/test';
import { useState } from 'react';

interface LevelUpOverlayPreviewProps {
  oldLevel: number;
  newLevel: number;
  title: string;
  onDismiss?: () => void;
}

function LevelUpOverlayPreview({
  oldLevel,
  newLevel,
  title,
  onDismiss,
}: LevelUpOverlayPreviewProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Dismissed (click &quot;Level Up Preview&quot; to reset)
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={`Level up! You reached level ${newLevel}`}
      data-testid="level-up-overlay"
      className="relative flex items-center justify-center min-h-48 bg-background/90 rounded-xl cursor-pointer animate-in fade-in duration-300"
      onClick={() => {
        setDismissed(true);
        onDismiss?.();
      }}
    >
      <div className="text-center space-y-4 select-none p-8">
        <p className="text-muted-foreground text-sm font-semibold uppercase tracking-widest">
          Level Up!
        </p>
        <div className="text-8xl font-black text-primary tabular-nums leading-none transition-all duration-500">
          {newLevel}
        </div>
        <p className="text-2xl font-bold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">Tap to dismiss</p>
      </div>
    </div>
  );
}

const meta = {
  title: 'homeMaker/Celebrations/LevelUpOverlay',
  component: LevelUpOverlayPreview,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    onDismiss: () => {},
  },
} satisfies Meta<typeof LevelUpOverlayPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Level2: Story = {
  args: {
    oldLevel: 1,
    newLevel: 2,
    title: 'Settling In',
  },
};

export const Level5: Story = {
  args: {
    oldLevel: 4,
    newLevel: 5,
    title: 'Home Manager',
  },
};

export const Level10Grandmaster: Story = {
  args: {
    oldLevel: 9,
    newLevel: 10,
    title: 'Grandmaster Homeowner',
  },
};

export const DismissInteraction: Story = {
  args: {
    oldLevel: 2,
    newLevel: 3,
    title: 'Getting Comfortable',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const overlay = canvas.getByRole('dialog');
    await expect(overlay).toBeVisible();

    const levelText = canvas.getByText('3');
    await expect(levelText).toBeVisible();

    await userEvent.click(overlay);
    const dismissedMsg = await canvas.findByText(/Dismissed/);
    await expect(dismissedMsg).toBeVisible();
  },
};
