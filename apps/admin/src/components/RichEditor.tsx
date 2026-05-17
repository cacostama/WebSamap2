import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export default function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  if (!editor) return null;
  return (
    <div className="border rounded">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50 text-xs">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className="px-2 py-1 hover:bg-gray-200 rounded font-bold">B</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className="px-2 py-1 hover:bg-gray-200 rounded italic">I</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="px-2 py-1 hover:bg-gray-200 rounded">H2</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className="px-2 py-1 hover:bg-gray-200 rounded">H3</button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className="px-2 py-1 hover:bg-gray-200 rounded">• Lista</button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className="px-2 py-1 hover:bg-gray-200 rounded">1. Lista</button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className="px-2 py-1 hover:bg-gray-200 rounded">❝</button>
      </div>
      <EditorContent editor={editor} className="prose max-w-none p-3 min-h-[200px]" />
    </div>
  );
}
