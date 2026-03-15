/**
 * Add Entry Dialog
 *
 * Form for creating a new vault entry with name, category, value (password input),
 * username, url, tags, and notes.
 */

import { useState, type ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@protolabsai/ui/atoms';
import type { SecretCategory } from '@protolabsai/types';
import type { CreateVaultEntryInput } from './hooks/use-vault';

const CATEGORIES: { value: SecretCategory; label: string }[] = [
  { value: 'password', label: 'Password' },
  { value: 'api-key', label: 'API Key' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'code', label: 'Code' },
  { value: 'note', label: 'Note' },
  { value: 'other', label: 'Other' },
];

interface AddEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMutating: boolean;
  onSubmit: (input: CreateVaultEntryInput) => Promise<void>;
}

export function AddEntryDialog({ open, onOpenChange, isMutating, onSubmit }: AddEntryDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SecretCategory>('password');
  const [value, setValue] = useState('');
  const [username, setUsername] = useState('');
  const [url, setUrl] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setCategory('password');
    setValue('');
    setUsername('');
    setUrl('');
    setTagsStr('');
    setNotes('');
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!value) {
      setFormError('Value is required.');
      return;
    }

    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await onSubmit({
        name: name.trim(),
        value,
        category,
        tags,
        username: username.trim() || undefined,
        url: url.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create entry');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Vault Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="vault-name">Name</Label>
            <Input
              id="vault-name"
              placeholder="e.g. GitHub Token"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="vault-category">Category</Label>
            <Select
              value={category}
              onValueChange={(v: string) => setCategory(v as SecretCategory)}
            >
              <SelectTrigger id="vault-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value (secret) */}
          <div className="space-y-2">
            <Label htmlFor="vault-value">Value</Label>
            <Input
              id="vault-value"
              type="password"
              placeholder="Secret value"
              value={value}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Username (optional) */}
          <div className="space-y-2">
            <Label htmlFor="vault-username">Username (optional)</Label>
            <Input
              id="vault-username"
              placeholder="e.g. admin"
              value={username}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            />
          </div>

          {/* URL (optional) */}
          <div className="space-y-2">
            <Label htmlFor="vault-url">URL (optional)</Label>
            <Input
              id="vault-url"
              placeholder="e.g. https://github.com"
              value={url}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
            />
          </div>

          {/* Tags (optional, comma-separated) */}
          <div className="space-y-2">
            <Label htmlFor="vault-tags">Tags (optional, comma-separated)</Label>
            <Input
              id="vault-tags"
              placeholder="e.g. work, dev, ci"
              value={tagsStr}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTagsStr(e.target.value)}
            />
          </div>

          {/* Notes (optional) */}
          <div className="space-y-2">
            <Label htmlFor="vault-notes">Notes (optional)</Label>
            <Textarea
              id="vault-notes"
              placeholder="Additional notes..."
              value={notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isMutating}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={isMutating}>
              Add Entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
