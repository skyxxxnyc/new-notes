import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import { Markdown } from 'tiptap-markdown';
import debounce from 'lodash/debounce';
import { runAiAction } from '../lib/gemini';
import {
  Bold, Italic, Strikethrough, Underline as UnderlineIcon,
  List, ListOrdered, Quote, Heading1, Heading2, Heading3,
  Code, Undo, Redo, Link as LinkIcon, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Highlighter, Minus, Paperclip, File, X,
  Sparkles, Languages, Type, Shrink, Expand, Wand2
} from 'lucide-react';

const AiActionButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-left w-full"
  >
    {icon}
    <span>{label}</span>
  </button>
);

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  attachments?: Attachment[];
  onAddAttachment?: (file: File) => void;
  onRemoveAttachment?: (id: string) => void;
}

export default function RichTextEditor({
  content,
  onChange,
  attachments = [],
  onAddAttachment,
  onRemoveAttachment
}: RichTextEditorProps) {
  const [isRawMode, setIsRawMode] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Debounce the onChange callback to prevent excessive re-renders and markdown generation
  const debouncedOnChange = useCallback(
    debounce((newContent: string) => {
      onChange(newContent);
    }, 500),
    [onChange]
  );

  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight,
      Markdown,
      BubbleMenuExtension.configure({
        element: null, // We'll provide it in the component
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      debouncedOnChange((editor.storage as any).markdown.getMarkdown());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate prose-sm sm:prose-base focus:outline-none max-w-none min-h-[200px] prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-p:leading-relaxed prose-pre:bg-slate-50 prose-pre:text-slate-900 prose-pre:border prose-pre:border-slate-200 prose-headings:font-display prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-slate-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-slate-700',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddAttachment) {
      onAddAttachment(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-shadow focus-within:shadow-md focus-within:border-primary/50 flex flex-col">
      <div className="flex flex-col border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-2 flex-wrap gap-y-2">

          {/* History & Basic Formatting */}
          <div className="flex items-center gap-1">
            <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-sm mr-2">
              <button
                onClick={() => editor.chain().focus().undo().run()}
                disabled={isRawMode || !editor.can().undo()}
                className={`p-1.5 rounded transition-colors ${isRawMode || !editor.can().undo() ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                title="Undo (Ctrl+Z)"
              >
                <Undo size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().redo().run()}
                disabled={isRawMode || !editor.can().redo()}
                className={`p-1.5 rounded transition-colors ${isRawMode || !editor.can().redo() ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                title="Redo (Ctrl+Y)"
              >
                <Redo size={14} />
              </button>
            </div>

            <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-sm mr-2">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={isRawMode}
                className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive('bold') && !isRawMode ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
                title="Bold (Ctrl+B)"
              >
                <Bold size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={isRawMode}
                className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive('italic') && !isRawMode ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
                title="Italic (Ctrl+I)"
              >
                <Italic size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                disabled={isRawMode}
                className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive('underline') && !isRawMode ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
                title="Underline (Ctrl+U)"
              >
                <UnderlineIcon size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                disabled={isRawMode}
                className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive('strike') && !isRawMode ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
                title="Strikethrough"
              >
                <Strikethrough size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                disabled={isRawMode}
                className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive('highlight') && !isRawMode ? 'bg-yellow-200 text-yellow-900' : 'text-slate-600'}`}
                title="Highlight"
              >
                <Highlighter size={14} />
              </button>
            </div>

            <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-sm mr-2 hidden sm:flex">
              <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                disabled={isRawMode}
                className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive({ textAlign: 'left' }) && !isRawMode ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
                title="Align Left"
              >
                <AlignLeft size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                disabled={isRawMode}
                className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive({ textAlign: 'center' }) && !isRawMode ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
                title="Align Center"
              >
                <AlignCenter size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                disabled={isRawMode}
                className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive({ textAlign: 'right' }) && !isRawMode ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
                title="Align Right"
              >
                <AlignRight size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <button
              onClick={() => setIsRawMode(!isRawMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${isRawMode ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
              title="Toggle Markdown Source"
            >
              <Code size={14} />
              Markdown
            </button>
          </div>
        </div>

        {/* Extended Formatting (Second Row) */}
        <div className="flex items-center p-2 pt-0 flex-wrap gap-y-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-sm mr-2">
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              disabled={isRawMode}
              className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive('heading', { level: 1 }) && !isRawMode ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
              title="Heading 1"
            >
              <Heading1 size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              disabled={isRawMode}
              className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive('heading', { level: 2 }) && !isRawMode ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
              title="Heading 2"
            >
              <Heading2 size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              disabled={isRawMode}
              className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive('heading', { level: 3 }) && !isRawMode ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
              title="Heading 3"
            >
              <Heading3 size={14} />
            </button>
          </div>

          <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-sm mr-2">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              disabled={isRawMode}
              className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive('bulletList') && !isRawMode ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
              title="Bullet List"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              disabled={isRawMode}
              className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive('orderedList') && !isRawMode ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
              title="Ordered List"
            >
              <ListOrdered size={14} />
            </button>
          </div>

          <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-sm">
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              disabled={isRawMode}
              className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive('blockquote') && !isRawMode ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
              title="Quote"
            >
              <Quote size={14} />
            </button>
            <button
              onClick={setLink}
              disabled={isRawMode}
              className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive('link') && !isRawMode ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
              title="Add Link"
            >
              <LinkIcon size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              disabled={isRawMode}
              className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} text-slate-600`}
              title="Horizontal Rule"
            >
              <Minus size={14} />
            </button>
          </div>

          {onAddAttachment && (
            <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-sm ml-auto">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isRawMode}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} text-slate-600 text-xs font-medium`}
                title="Attach File"
              >
                <Paperclip size={14} />
                Attach
              </button>
            </div>
          )}
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2">
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm group">
              <File size={14} className="text-primary" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">{att.name}</span>
                <span className="text-[10px] text-slate-400">{formatFileSize(att.size)}</span>
              </div>
              {onRemoveAttachment && (
                <button
                  onClick={() => onRemoveAttachment(att.id)}
                  className="ml-1 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="p-5 sm:p-6 bg-white flex-1 flex flex-col">
        {isRawMode ? (
          <textarea
            defaultValue={(editor.storage as any).markdown.getMarkdown()}
            onChange={(e) => {
              const newContent = e.target.value;
              editor.commands.setContent(newContent);
              debouncedOnChange(newContent);
            }}
            className="w-full h-full min-h-[300px] font-mono text-sm text-slate-700 bg-slate-50 p-4 rounded-lg outline-none resize-none border border-slate-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all flex-1"
            placeholder="Write markdown here..."
          />
        ) : (
          <>
            <BubbleMenu
              editor={editor}
              options={{ placement: 'top', offset: 8 }}
              className="flex items-center gap-1 bg-slate-900 text-white p-1 rounded-lg shadow-xl border border-white/10"
            >
              <div className="flex items-center gap-0.5 border-r border-white/10 pr-1 mr-1">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-1.5 rounded hover:bg-white/10 ${editor.isActive('bold') ? 'text-primary' : 'text-white'}`}
                >
                  <Bold size={14} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-1.5 rounded hover:bg-white/10 ${editor.isActive('italic') ? 'text-primary' : 'text-white'}`}
                >
                  <Italic size={14} />
                </button>
              </div>

              {/* AI ACTIONS */}
              <div className="flex items-center gap-1 px-1 group relative">
                <button
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-primary/20 text-primary-light hover:bg-primary/30 transition-colors text-xs font-bold"
                  title="AI Actions"
                >
                  <Sparkles size={14} className="animate-pulse" />
                  Ask AI
                </button>

                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col bg-slate-900 border border-white/10 rounded-lg shadow-2xl min-w-[180px] overflow-hidden">
                  <AiActionButton
                    icon={<Wand2 size={14} />}
                    label="Improve Writing"
                    onClick={async () => {
                      const text = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
                      const result = await runAiAction('improve', text);
                      editor.chain().focus().insertContent(result).run();
                    }}
                  />
                  <AiActionButton
                    icon={<Shrink size={14} />}
                    label="Summarize"
                    onClick={async () => {
                      const text = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
                      const result = await runAiAction('summarize', text);
                      editor.chain().focus().insertContent(result).run();
                    }}
                  />
                  <AiActionButton
                    icon={<Languages size={14} />}
                    label="Translate to English"
                    onClick={async () => {
                      const text = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
                      const result = await runAiAction('translate', text);
                      editor.chain().focus().insertContent(result).run();
                    }}
                  />
                  <AiActionButton
                    icon={<Type size={14} />}
                    label="Make Professional"
                    onClick={async () => {
                      const text = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
                      const result = await runAiAction('professional', text);
                      editor.chain().focus().insertContent(result).run();
                    }}
                  />
                  <AiActionButton
                    icon={<Sparkles size={14} />}
                    label="Swiss Style"
                    onClick={async () => {
                      const text = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
                      const result = await runAiAction('swiss', text);
                      editor.chain().focus().insertContent(result).run();
                    }}
                  />
                </div>
              </div>
            </BubbleMenu>

            <EditorContent editor={editor} className="min-h-[300px] flex-1 cursor-text" onClick={() => editor.commands.focus()} />
          </>
        )}
      </div>
    </div>
  );
}
