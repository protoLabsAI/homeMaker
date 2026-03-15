/**
 * Vault Entry Card
 *
 * Displays a single vault entry with name, category badge, username, url, and tags.
 * The secret value is hidden by default (asterisks). Eye-toggle fetches the
 * decrypted value on first reveal via lazy decrypt. Copy-to-clipboard fetches
 * the decrypted value and copies it without rendering in the DOM.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Eye, EyeOff, Copy, ExternalLink, Trash2, User, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, Badge, Button } from '@protolabsai/ui/atoms';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@protolabsai/ui/atoms';
import type { VaultEntry, SecretCategory } from '@protolabsai/types';

const CLIPBOARD_CLEAR_DELAY_MS = 30_000;
const MASKED_VALUE = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';

/** Category badge color mapping using theme-compatible classes */
const CATEGORY_STYLES: Record<SecretCategory, { className: string; label: string }> = {
  password: { className: 'bg-blue-500/15 text-blue-500 border-blue-500/30', label: 'Password' },
  'api-key': {
    className: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
    label: 'API Key',
  },
  wifi: { className: 'bg-green-500/15 text-green-500 border-green-500/30', label: 'WiFi' },
  code: { className: 'bg-orange-500/15 text-orange-500 border-orange-500/30', label: 'Code' },
  note: { className: 'bg-muted text-muted-foreground border-border/50', label: 'Note' },
  other: { className: 'bg-muted text-muted-foreground border-border/50', label: 'Other' },
};

interface VaultEntryCardProps {
  entry: VaultEntry;
  onDelete: (id: string) => void;
  onFetchDecryptedValue: (id: string) => Promise<string>;
  isMutating: boolean;
}

export function VaultEntryCard({
  entry,
  onDelete,
  onFetchDecryptedValue,
  isMutating,
}: VaultEntryCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [decryptedValue, setDecryptedValue] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const clipboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up clipboard timer on unmount
  useEffect(() => {
    return () => {
      if (clipboardTimerRef.current) {
        clearTimeout(clipboardTimerRef.current);
      }
    };
  }, []);

  const fetchValueIfNeeded = useCallback(async (): Promise<string> => {
    if (decryptedValue !== null) return decryptedValue;

    setIsDecrypting(true);
    try {
      const value = await onFetchDecryptedValue(entry.id);
      setDecryptedValue(value);
      return value;
    } finally {
      setIsDecrypting(false);
    }
  }, [decryptedValue, entry.id, onFetchDecryptedValue]);

  const handleToggleReveal = useCallback(async () => {
    if (revealed) {
      setRevealed(false);
      return;
    }

    try {
      await fetchValueIfNeeded();
      setRevealed(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to decrypt value');
    }
  }, [revealed, fetchValueIfNeeded]);

  const handleCopy = useCallback(async () => {
    setIsCopying(true);
    try {
      const value = await fetchValueIfNeeded();
      await navigator.clipboard.writeText(value);

      // Clear any existing timer
      if (clipboardTimerRef.current) {
        clearTimeout(clipboardTimerRef.current);
      }

      const toastId = toast.success('Copied to clipboard. Auto-clearing in 30s.', {
        duration: CLIPBOARD_CLEAR_DELAY_MS,
      });

      clipboardTimerRef.current = setTimeout(async () => {
        try {
          // Only clear if clipboard still contains our value
          const current = await navigator.clipboard.readText();
          if (current === value) {
            await navigator.clipboard.writeText('');
          }
        } catch {
          // Clipboard API may not be available for reading in some contexts
        }
        toast.dismiss(toastId);
        toast.info('Clipboard cleared.');
        clipboardTimerRef.current = null;
      }, CLIPBOARD_CLEAR_DELAY_MS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to copy');
    } finally {
      setIsCopying(false);
    }
  }, [fetchValueIfNeeded]);

  const handleDelete = useCallback(() => {
    onDelete(entry.id);
  }, [entry.id, onDelete]);

  const categoryStyle = CATEGORY_STYLES[entry.category];

  return (
    <Card className="group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: entry details */}
          <div className="min-w-0 flex-1 space-y-2">
            {/* Name + category badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground truncate">{entry.name}</span>
              <Badge variant="outline" size="sm" className={categoryStyle.className}>
                {categoryStyle.label}
              </Badge>
            </div>

            {/* Username */}
            {entry.username && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="size-3 shrink-0" />
                <span className="truncate">{entry.username}</span>
              </div>
            )}

            {/* URL */}
            {entry.url && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ExternalLink className="size-3 shrink-0" />
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:text-foreground transition-colors"
                >
                  {entry.url}
                </a>
              </div>
            )}

            {/* Value (masked or revealed) */}
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                {revealed && decryptedValue !== null ? decryptedValue : MASKED_VALUE}
              </code>
            </div>

            {/* Tags */}
            {entry.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="size-3 text-muted-foreground shrink-0" />
                {entry.tags.map((tag) => (
                  <Badge key={tag} variant="muted" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Right: action buttons */}
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-0.5 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={handleToggleReveal}
                    disabled={isDecrypting}
                    aria-label={revealed ? 'Hide value' : 'Reveal value'}
                  >
                    {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{revealed ? 'Hide' : 'Reveal'}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={handleCopy}
                    disabled={isCopying}
                    aria-label="Copy to clipboard"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy to clipboard</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 hover:text-destructive"
                    onClick={handleDelete}
                    disabled={isMutating}
                    aria-label="Delete entry"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
