/**
 * InlineEditor — Click-to-edit rich text field using TipTap.
 *
 * Renders as readable text. Click to activate editing. Blur to save.
 * Minimal toolbar-free experience for inline property editing.
 */

import { useCallback, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';

interface InlineEditorProps {
  /** Content string (plain text or HTML depending on mode) */
  content: string;
  /** Called with updated content on blur */
  onSave: (content: string) => void;
  /** Placeholder when empty */
  placeholder?: string;
  /** Additional className for the wrapper */
  className?: string;
  /** Whether the field is currently saving */
  isSaving?: boolean;
  /** Render as single-line (no Enter key) */
  singleLine?: boolean;
}

export function InlineEditor({
  content,
  onSave,
  placeholder = 'Click to edit...',
  className,
  isSaving,
  singleLine,
}: InlineEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const savedContentRef = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        horizontalRule: false,
        ...(singleLine
          ? { heading: false, bulletList: false, orderedList: false, blockquote: false }
          : {}),
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: content || '',
    editable: false,
    onBlur: ({ editor: ed }) => {
      const text = ed.getText();
      if (text !== savedContentRef.current) {
        savedContentRef.current = text;
        onSave(text);
      }
      ed.setEditable(false);
      setIsEditing(false);
    },
  });

  const handleClick = useCallback(() => {
    if (!editor || isEditing || isSaving) return;
    editor.setEditable(true);
    setIsEditing(true);
    requestAnimationFrame(() => {
      editor.commands.focus('end');
    });
  }, [editor, isEditing, isSaving]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (singleLine && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        editor?.commands.blur();
      }
      if (e.key === 'Escape') {
        editor?.commands.setContent(savedContentRef.current);
        editor?.commands.blur();
      }
    },
    [editor, singleLine]
  );

  // Sync external content changes
  if (editor && !isEditing && content !== savedContentRef.current) {
    savedContentRef.current = content;
    editor.commands.setContent(content);
  }

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'rounded-md transition-colors cursor-text px-2 py-1.5 border border-transparent',
        isEditing ? 'border-ring bg-background' : 'hover:bg-muted/50',
        isSaving && 'opacity-50 pointer-events-none',
        '[&_.tiptap]:outline-none',
        '[&_.tiptap_p]:my-0',
        '[&_.tiptap_.is-editor-empty:first-child::before]:text-muted-foreground/50',
        '[&_.tiptap_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
        '[&_.tiptap_.is-editor-empty:first-child::before]:float-left',
        '[&_.tiptap_.is-editor-empty:first-child::before]:h-0',
        '[&_.tiptap_.is-editor-empty:first-child::before]:pointer-events-none',
        className
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
