/**
 * MessageInput — text input with sender name selection for the chat channel.
 *
 * Persists the sender name to localStorage so it survives page refreshes.
 * Supports Enter key to send (Shift+Enter for newline).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button, Input } from '@protolabsai/ui/atoms';
import { getSenderName, setSenderName } from '@/lib/local-storage';

interface MessageInputProps {
  onSend: (senderName: string, content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [name, setName] = useState(() => getSenderName());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSenderName(name);
  }, [name]);

  const handleSend = useCallback(() => {
    const trimmedContent = content.trim();
    const trimmedName = name.trim();

    if (!trimmedContent || !trimmedName) return;

    onSend(trimmedName, trimmedContent);
    setContent('');

    // Refocus the input after sending
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [content, name, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex items-center gap-2 p-3 border-t border-border bg-background">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-28 shrink-0 text-sm"
        disabled={disabled}
      />
      <Input
        ref={inputRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="flex-1 text-sm"
        disabled={disabled}
      />
      <Button
        size="sm"
        onClick={handleSend}
        disabled={disabled || !content.trim() || !name.trim()}
        className="shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
