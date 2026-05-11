import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import CharacterCount from "@tiptap/extension-character-count";
import { useEffect, useCallback } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const btnBase: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: "6px",
  fontSize: "13px",
  fontWeight: 500,
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s",
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: "#f5f5f5",
  color: "#0a0a0a",
};

const btnInactive: React.CSSProperties = {
  ...btnBase,
  background: "transparent",
  color: "#888",
};

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      style={active ? btnActive : btnInactive}
      onMouseEnter={(e) => {
        if (!active) (e.target as HTMLElement).style.color = "#f5f5f5";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.target as HTMLElement).style.color = "#888";
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />;
}

export function RichTextEditor({ content, onChange, placeholder = "Comece a escrever..." }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "editor-link" },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph", "blockquote"] }),
      CharacterCount,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "cms-editor-content",
        style: "min-height: 420px; padding: 32px; font-family: 'Inter', sans-serif; font-size: 16px; line-height: 1.85; color: #e5e5e5; outline: none;",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false as unknown as Parameters<typeof editor.commands.setContent>[1]);
    }
  }, [content, editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL do link:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL da imagem:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const wordCount = editor.storage.characterCount?.words?.() ?? 0;
  const charCount = editor.storage.characterCount?.characters?.() ?? 0;

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", overflow: "hidden", background: "#141414" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2px", padding: "8px",
        borderBottom: "1px solid rgba(255,255,255,0.1)", background: "#1c1c1c", position: "sticky", top: 0, zIndex: 10,
      }}>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Subtítulo H2">H2</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Subtítulo H3">H3</ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito"><span style={{ fontWeight: 700 }}>B</span></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico"><span style={{ fontStyle: "italic" }}>I</span></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado"><span style={{ textDecoration: "underline" }}>U</span></ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista">• Lista</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada">1. Lista</ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citação">❝ Citação</ToolbarButton>
        <Divider />
        <ToolbarButton onClick={addLink} title="Inserir link" active={editor.isActive("link")}>🔗 Link</ToolbarButton>
        <ToolbarButton onClick={addImage} title="Inserir imagem">🖼 Imagem</ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Desfazer">↩</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Refazer">↪</ToolbarButton>

        <div style={{ marginLeft: "auto", fontSize: "11px", color: "#666", paddingRight: "8px", whiteSpace: "nowrap" }}>
          {wordCount} palavras · {charCount} caracteres
        </div>
      </div>

      <div style={{ minHeight: "420px" }}>
        <EditorContent editor={editor} />
      </div>

      <style>{`
        .cms-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #555;
          pointer-events: none;
          height: 0;
        }
        .cms-editor-content:focus { outline: none; }
        .cms-editor-content h2 { font-size: 1.5rem; font-weight: 600; margin: 1.5em 0 0.5em; color: #f5f5f5; }
        .cms-editor-content h3 { font-size: 1.25rem; font-weight: 500; margin: 1.25em 0 0.4em; color: #ddd; }
        .cms-editor-content p { margin: 0 0 1em; line-height: 1.85; }
        .cms-editor-content ul { list-style-type: disc; padding-left: 1.75em; margin: 1em 0; }
        .cms-editor-content ol { list-style-type: decimal; padding-left: 1.75em; margin: 1em 0; }
        .cms-editor-content li { margin: 0.4em 0; line-height: 1.75; }
        .cms-editor-content li p { margin: 0; display: inline; }
        .cms-editor-content blockquote { border-left: 4px solid #9a9a9a; padding: 0.75rem 1rem 0.75rem 1.25rem; margin: 1.5em 0; color: #aaa; font-style: italic; background: rgba(255,255,255,0.03); border-radius: 0 6px 6px 0; }
        .cms-editor-content a, .editor-link { color: #d4c5b0; text-decoration: underline; }
        .cms-editor-content img { max-width: 100%; border-radius: 8px; margin: 1em 0; }
        .cms-editor-content strong { font-weight: 700; color: #f5f5f5; }
        .cms-editor-content em { font-style: italic; }
        .cms-editor-content u { text-decoration: underline; }
      `}</style>
    </div>
  );
}
