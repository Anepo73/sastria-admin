import { useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold, Italic, Heading1, Heading2, Heading3,
  List, ListOrdered, Pilcrow,
} from 'lucide-react';

// ─── Strip HTML util (shared) ────────────────────────────────────────────────
export function stripHtml(html: string): string {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent ?? tmp.innerText ?? '').trim();
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────
function ToolbarBtn({
  active, disabled, onClick, title, children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center h-7 w-7 rounded text-sm transition-colors',
        'hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed',
        active
          ? 'bg-primary/20 text-primary'
          : 'text-muted-foreground hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5 bg-surface/50">
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Negrito (Ctrl+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Itálico (Ctrl+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="Título 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Título 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Título 3"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={editor.isActive('paragraph')}
        title="Parágrafo"
      >
        <Pilcrow className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Lista com marcadores"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Lista numerada"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarBtn>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface RichTextEditorProps {
  value: string;             // HTML ou plain text
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Digite aqui...',
  readOnly = false,
  minHeight = '200px',
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none focus:outline-none p-3',
        'data-placeholder': placeholder,
      },
    },
  });

  // Sync external value changes (e.g., when loading from API)
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (value !== currentHtml) {
      editor.commands.setContent(value || '');
    }
  }, [value]);

  return (
    <div
      className={[
        'rounded-md border border-border bg-background overflow-hidden',
        readOnly ? 'opacity-70' : '',
        className,
      ].join(' ')}
    >
      {!readOnly && <Toolbar editor={editor} />}
      <div style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>

      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .ProseMirror h1 { font-size: 1.25rem; font-weight: 700; margin: 0.5rem 0; }
        .ProseMirror h2 { font-size: 1.1rem; font-weight: 600; margin: 0.4rem 0; }
        .ProseMirror h3 { font-size: 1rem; font-weight: 600; margin: 0.3rem 0; }
        .ProseMirror ul  { list-style: disc; padding-left: 1.4rem; margin: 0.3rem 0; }
        .ProseMirror ol  { list-style: decimal; padding-left: 1.4rem; margin: 0.3rem 0; }
        .ProseMirror p   { margin: 0.2rem 0; }
        .ProseMirror strong { font-weight: 700; }
        .ProseMirror em     { font-style: italic; }
      `}</style>
    </div>
  );
}
