"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote } from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  minHeight?: number;
}

function ToolbarButton({
  onClick,
  isActive,
  children,
}: {
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? "bg-zinc-200 text-zinc-900"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Write your notes here...",
  editable = true,
  minHeight = 200,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return (
      <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
        <div className="p-4 flex items-center justify-center" style={{ minHeight }}>
          <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
      {editable && (
        <div className="flex items-center gap-0.5 px-3 py-2 border-b border-zinc-200 bg-zinc-50 flex-wrap">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <div className="w-px h-5 bg-zinc-200 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>
          <div className="w-px h-5 bg-zinc-200 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <div className="w-px h-5 bg-zinc-200 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>
        </div>
      )}
        <div style={{ minHeight }}>
        <EditorContent
          editor={editor}
          className={`prose prose-zinc prose-sm max-w-none p-4 ${
            !editable ? "cursor-default" : ""
          } [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-full [&_.ProseMirror]:leading-snug [&_.ProseMirror_p]:my-1 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-zinc-300 [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0`}
        />
      </div>
    </div>
  );
}
