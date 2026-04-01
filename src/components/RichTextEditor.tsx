import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CharacterCount from '@tiptap/extension-character-count';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Markdown } from 'tiptap-markdown';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import debounce from 'lodash/debounce';
import { 
  Bold, Italic, Strikethrough, Underline as UnderlineIcon, 
  List, ListOrdered, Quote, Heading1, Heading2, Heading3, 
  Code, Undo, Redo, Link as LinkIcon, AlignLeft, AlignCenter, 
  AlignRight, AlignJustify, Highlighter, Minus, Paperclip, File, X,
  CheckSquare, Type, Table as TableIcon, Image as ImageIcon, Database as DatabaseIcon,
  Plus, Sparkles, Wand2, Languages, FileText, RefreshCw, Maximize2, HelpCircle, CheckCircle
} from 'lucide-react';
import { safeJsonParse, cn, formatFileSize } from '../lib/utils';
import DatabaseComponent from './DatabaseComponent';
import { apiFetch } from '../lib/api';
import { generateAIResponse, processBlocksWithAI } from '../services/aiService';

const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block*',
  addAttributes() {
    return {
      emoji: {
        default: '💡',
      },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout', class: 'callout-block bg-slate-50 border border-slate-200 rounded-lg p-4 my-4 flex gap-3' }), 
      ['span', { class: 'callout-icon' }, HTMLAttributes.emoji],
      ['div', { class: 'callout-content flex-1' }, 0]
    ]
  },
})

const DatabaseBlock = Node.create({
  name: 'databaseBlock',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      id: {
        default: null,
      },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-type="database"]',
        getAttrs: (node: any) => ({
          id: node.getAttribute('data-id'),
        }),
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'database', 'data-id': HTMLAttributes.id })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(DatabaseBlockView)
  },
})

function DatabaseBlockView({ node, updateAttributes }: any) {
  const [isCreating, setIsCreating] = useState(!node.attrs.id);
  const [databases, setDatabases] = useState<any[]>([]);

  useEffect(() => {
    if (!node.attrs.id) {
      fetchDatabases();
    }
  }, [node.attrs.id]);

  const fetchDatabases = async () => {
    try {
      const data = await apiFetch('/api/databases');
      setDatabases(data);
    } catch (error) {
      console.error('Failed to fetch databases:', error);
    }
  };

  const handleSelectDatabase = (id: string) => {
    updateAttributes({ id });
    setIsCreating(false);
  };

  const handleCreateDatabase = async () => {
    const name = await window.appPrompt("Enter new database name:");
    if (!name) return;
    
    try {
      const newDb = await apiFetch('/api/databases', {
        method: 'POST',
        body: JSON.stringify({ name, icon: 'Database' })
      });
      updateAttributes({ id: newDb.id });
      setIsCreating(false);
      window.dispatchEvent(new CustomEvent('databases-changed'));
    } catch (error) {
      console.error('Failed to create database:', error);
    }
  };

  return (
    <NodeViewWrapper className="database-block-wrapper my-8">
      {node.attrs.id ? (
        <div contentEditable={false}>
          <DatabaseComponent databaseId={node.attrs.id} isInline={true} />
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-4" contentEditable={false}>
          <div className="bg-white p-3 rounded-full shadow-sm text-slate-400">
            <DatabaseIcon size={24} />
          </div>
          <div className="text-center">
            <h4 className="font-bold text-slate-900 text-sm">Insert Database</h4>
            <p className="text-xs text-slate-500 mt-1">Select an existing database or create a new one.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {databases.map(db => (
              <button 
                key={db.id}
                onClick={() => handleSelectDatabase(db.id)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:border-primary hover:text-primary transition-all shadow-sm"
              >
                {db.name}
              </button>
            ))}
            <button 
              onClick={handleCreateDatabase}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus size={14} /> New Database
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  )
}

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
  const [isAiLoading, setIsAiLoading] = useState(false);
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
      Markdown.configure({
        html: true,
      }),
      Placeholder.configure({
        placeholder: 'Type "/" for commands or start writing...',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CharacterCount,
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
      DatabaseBlock,
    ] as any[],
    content,
    onUpdate: ({ editor }) => {
      debouncedOnChange((editor.storage as any).markdown.getMarkdown());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate prose-sm sm:prose-base focus:outline-none max-w-none min-h-[200px] prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-p:leading-relaxed prose-pre:bg-slate-50 prose-pre:text-slate-900 prose-pre:border prose-pre:border-slate-200 prose-headings:font-display prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-slate-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-slate-700',
      },
    },
  }) as any;

  useEffect(() => {
    if (!editor) return;
    
    // Only update if content is different from current editor content
    // and the editor is not currently focused (to avoid cursor jumps)
    // OR if the content is significantly different (e.g. switching notes)
    const currentMarkdown = (editor.storage as any).markdown.getMarkdown();
    if (content !== undefined && content !== currentMarkdown) {
      // If the editor is focused, we only update if the content is completely different
      // (e.g. user clicked a different page in the background)
      // If it's not focused, we always update to stay in sync
      const isSignificantlyDifferent = Math.abs(content.length - currentMarkdown.length) > 20;
      
      if (!editor.isFocused || isSignificantlyDifferent) {
        editor.commands.setContent(content, false);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const setLink = async () => {
    const previousUrl = editor.getAttributes('link').href
    const url = await window.appPrompt('URL', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const handleAiAction = async (action: string) => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    
    if (!selectedText) return;
    
    setIsAiLoading(true);
    try {
      const result = await processBlocksWithAI(selectedText, action);
      if (result) {
        editor.chain().focus().insertContentAt({ from, to }, result).run();
      }
    } catch (error) {
      console.error('AI Action failed:', error);
      // @ts-ignore
      window.appAlert('AI Action failed. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAskAi = async () => {
    const prompt = await window.appPrompt('Ask AI anything...');
    if (!prompt) return;
    
    setIsAiLoading(true);
    try {
      const result = await generateAIResponse(prompt);
      if (result) {
        // Insert as child blocks below the cursor
        editor.chain().focus().insertContent(result).run();
      }
    } catch (error) {
      console.error('Ask AI failed:', error);
      // @ts-ignore
      window.appAlert('Ask AI failed. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddAttachment) {
      onAddAttachment(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              disabled={isRawMode}
              className={`p-1.5 rounded transition-colors ${isRawMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'} ${editor.isActive('taskList') && !isRawMode ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
              title="Task List"
            >
              <CheckSquare size={14} />
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

      <div className="p-5 sm:p-6 bg-white flex-1 flex flex-col relative">
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
            <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex bg-white border border-slate-200 rounded-lg shadow-xl p-1 gap-1 overflow-hidden">
              <button
                onClick={() => handleAiAction('improve')}
                className="p-1.5 rounded hover:bg-slate-100 text-primary transition-colors flex items-center gap-1"
                title="Improve Writing"
              >
                <Sparkles size={14} />
              </button>
              <button
                onClick={() => handleAiAction('professional')}
                className="p-1.5 rounded hover:bg-slate-100 text-primary transition-colors flex items-center gap-1"
                title="Make Professional"
              >
                <Wand2 size={14} />
              </button>
              <div className="w-px bg-slate-200 mx-1 my-1" />
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
                title="Bold"
              >
                <Bold size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
                title="Italic"
              >
                <Italic size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive('highlight') ? 'bg-yellow-200 text-yellow-900' : 'text-slate-600'}`}
                title="Highlight"
              >
                <Highlighter size={14} />
              </button>
              <button
                onClick={setLink}
                className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${editor.isActive('link') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
                title="Link"
              >
                <LinkIcon size={14} />
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
              <button
                onClick={() => handleAiAction('summarize')}
                className="p-1.5 rounded hover:bg-slate-100 text-primary transition-colors"
                title="Summarize"
              >
                <FileText size={14} />
              </button>
              <button
                onClick={() => handleAiAction('rewrite')}
                className="p-1.5 rounded hover:bg-slate-100 text-primary transition-colors"
                title="Rewrite"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => handleAiAction('translate')}
                className="p-1.5 rounded hover:bg-slate-100 text-primary transition-colors"
                title="Translate"
              >
                <Languages size={14} />
              </button>
            </BubbleMenu>

            <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex flex-col bg-white border border-slate-200 rounded-lg shadow-xl p-1 gap-1 overflow-hidden min-w-[180px]">
              <button
                onClick={handleAskAi}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 rounded transition-colors"
              >
                <Sparkles size={14} />
                Ask AI
              </button>
              <div className="h-px bg-slate-100 my-1" />
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <Heading1 size={14} />
                Heading 1
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <Heading2 size={14} />
                Heading 2
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <List size={14} />
                Bullet List
              </button>
              <button
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <CheckSquare size={14} />
                Task List
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <Quote size={14} />
                Quote
              </button>
              <button
                onClick={() => (editor.chain().focus() as any).insertContent({ type: 'callout' }).run()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <Highlighter size={14} />
                Callout
              </button>
              <button
                onClick={() => (editor.chain().focus() as any).insertContent({ type: 'databaseBlock' }).run()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <DatabaseIcon size={14} />
                Database
              </button>
            </FloatingMenu>

            <EditorContent editor={editor} className="min-h-[300px] flex-1 cursor-text" onClick={() => editor.commands.focus()} />
            
            {isAiLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-20">
                <div className="bg-white px-4 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-slate-700">AI is thinking...</span>
                </div>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              <div className="flex items-center gap-4">
                <span>{(editor.storage as any).characterCount.characters()} characters</span>
                <span>{(editor.storage as any).characterCount.words()} words</span>
              </div>
              <div>
                {editor.isActive('bold') && <span className="ml-2">Bold</span>}
                {editor.isActive('italic') && <span className="ml-2">Italic</span>}
                {editor.isActive('heading') && <span className="ml-2">Heading {editor.getAttributes('heading').level}</span>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
