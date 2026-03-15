/**
 * MessageBubble — renders a single chat message.
 *
 * Ava messages are visually distinguished with a tinted background and
 * a Sparkles icon next to her name. Human messages use the default card style.
 */

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@protolabsai/types';

interface MessageBubbleProps {
  message: ChatMessage;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (isToday) return time;

  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${time}`;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div
      className={cn(
        'rounded-lg px-4 py-3 max-w-[85%]',
        message.isAva
          ? 'bg-purple-500/10 border border-purple-500/20'
          : 'bg-muted/50 border border-border'
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {message.isAva && <Sparkles className="h-3.5 w-3.5 text-purple-400" />}
        <span
          className={cn(
            'text-xs font-semibold',
            message.isAva ? 'text-purple-400' : 'text-muted-foreground'
          )}
        >
          {message.senderName}
        </span>
        <span className="text-xs text-muted-foreground/60 ml-auto">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap break-words">{message.content}</p>
    </div>
  );
}
