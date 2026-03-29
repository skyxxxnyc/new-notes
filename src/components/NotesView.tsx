import React, { useState, useEffect } from 'react';
import { Search, Bold, Italic, List, ImageIcon, Link as LinkIcon, Share, MoreVertical, Maximize2, Sparkles, Menu, ChevronLeft } from 'lucide-react';
import { generateNoteSummary, improveWriting } from '../lib/gemini';
import RichTextEditor from './RichTextEditor';
import { apiFetch } from '../lib/api';
import { renderPropertyValue } from '../lib/utils';

const MOCK_NOTES = [
  {
    id: 1,
    title: 'Grid Systems in Graphic Design',
    tag: 'Work',
    time: '2m ago',
    snippet: 'The grid system is an aid, not a guarantee. It permits a number of possible uses...',
    content: 'The grid system is an aid, not a guarantee. It permits a number of possible uses and provides the designer with the opportunity to create a layout that is balanced, orderly, and harmonious.\n\nJosef Müller-Brockmann, a pioneer of Swiss design, emphasized the importance of objective and functional design. A grid system provides a structural logic that allows for:\n\n1. Consistency across multiple pages or layouts.\n2. Clarity of information hierarchy.\n3. Rationalization of the creative process through mathematical rules.'
  },
  {
    id: 2,
    title: 'Typography Principles',
    tag: 'Design',
    time: '2h ago',
    snippet: 'Sans-serif typefaces are preferred for their clarity and modern aesthetic...',
    content: 'Sans-serif typefaces are preferred for their clarity and modern aesthetic, reinforcing the Swiss style...'
  }
];

export default function NotesView({ onEnterFocus, onToggleSidebar }: { onEnterFocus: () => void, onToggleSidebar: () => void }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any>(null);
  const [content, setContent] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showListOnMobile, setShowListOnMobile] = useState(true);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/pages?isNote=true');
      setNotes(data);
      if (data.length > 0 && !activeNote) {
        setActiveNote(data[0]);
        setContent(data[0].content);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();

    const handleNavigateNote = (e: any) => {
      if (e.detail.note) {
        setActiveNote(e.detail.note);
        setContent(e.detail.note.content);
        setShowListOnMobile(false);
      }
    };

    const handleNewNote = async () => {
      try {
        const newNote = await apiFetch('/api/pages', {
          method: 'POST',
          body: JSON.stringify({ 
            title: 'Untitled Note', 
            content: '', 
            properties: '{}', 
            parentId: null, 
            databaseId: null 
          })
        });
        setNotes(prev => [newNote, ...prev]);
        setActiveNote(newNote);
        setContent(newNote.content);
        setShowListOnMobile(false);
        window.dispatchEvent(new CustomEvent('pages-changed'));
      } catch (error) {
        console.error('Failed to create note:', error);
      }
    };

    window.addEventListener('navigate-note', handleNavigateNote);
    window.addEventListener('new-note', handleNewNote);
    window.addEventListener('pages-changed', fetchNotes);
    
    return () => {
      window.removeEventListener('navigate-note', handleNavigateNote);
      window.removeEventListener('new-note', handleNewNote);
      window.removeEventListener('pages-changed', fetchNotes);
    };
  }, [activeNote]);

  const handleUpdateNote = async (newContent: string) => {
    if (!activeNote) return;
    setContent(newContent);
    try {
      await apiFetch(`/api/pages/${activeNote.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content: newContent })
      });
      window.dispatchEvent(new CustomEvent('pages-changed'));
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleUpdateTitle = async (newTitle: string) => {
    if (!activeNote) return;
    setActiveNote({ ...activeNote, title: newTitle });
    try {
      await apiFetch(`/api/pages/${activeNote.id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: newTitle })
      });
      window.dispatchEvent(new CustomEvent('pages-changed'));
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const handleImproveWriting = async () => {
    setIsAiLoading(true);
    const improved = await improveWriting(content);
    if (improved) setContent(improved);
    setIsAiLoading(false);
  };

  const handleSummarize = async () => {
    setIsAiLoading(true);
    const summary = await generateNoteSummary(content);
    if (summary) alert(`AI Summary:\n\n${summary}`);
    setIsAiLoading(false);
  };

  const handleAddAttachment = (file: File) => {
    const newAttachment = {
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      type: file.type
    };
    setAttachments([...attachments, newAttachment]);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Middle Panel: Note List */}
      <section className={`w-full md:w-80 flex-shrink-0 border-r border-slate-200 bg-slate-50/50 flex-col ${showListOnMobile ? 'flex' : 'hidden md:flex'}`}>
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <button onClick={onToggleSidebar} className="md:hidden p-2 -ml-2 text-slate-600 hover:text-primary">
            <Menu size={20} />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search notes..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No notes found. Create one to get started.</div>
          ) : (
            notes.map(note => (
              <div 
                key={note.id}
                onClick={() => { setActiveNote(note); setContent(note.content); setShowListOnMobile(false); }}
                className={`p-5 border-b border-slate-100 cursor-pointer transition-colors ${
                  activeNote?.id === note.id ? 'bg-primary/[0.03] border-l-4 border-l-primary' : 'hover:bg-white border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${activeNote?.id === note.id ? 'text-primary' : 'text-slate-400'}`}>
                    Note
                  </span>
                  <span className="text-[10px] text-slate-400">Recent</span>
                </div>
                <h3 className="text-sm font-bold leading-tight mb-1 truncate">{renderPropertyValue(note.title)}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{note.content.replace(/<[^>]*>/g, '').substring(0, 100)}...</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Right Panel: Editor */}
      <main className={`flex-1 bg-white flex-col relative overflow-hidden ${!showListOnMobile ? 'flex' : 'hidden md:flex'}`}>
        {/* Toolbar */}
        <header className="h-auto min-h-16 py-2 border-b border-slate-100 flex items-center justify-between px-4 md:px-8 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2 md:gap-6 flex-wrap">
            <button onClick={() => setShowListOnMobile(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:text-primary">
              <ChevronLeft size={20} />
            </button>
            
            {/* AI Tools */}
            <button 
              onClick={handleImproveWriting}
              disabled={isAiLoading}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-md text-xs font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              <Sparkles size={14} /> <span className="hidden md:inline">Improve</span>
            </button>
            <button 
              onClick={handleSummarize}
              disabled={isAiLoading}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-md text-xs font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              <Sparkles size={14} /> <span className="hidden md:inline">Summarize</span>
            </button>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={onEnterFocus} className="p-2 text-slate-400 hover:text-slate-600 hidden md:block" title="Focus Mode">
              <Maximize2 size={18} />
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600"><Share size={18} /></button>
            <button className="p-2 text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
          </div>
        </header>

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12">
          {activeNote ? (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-500">Note</span>
                <span className="text-[11px] text-slate-400">Real-time sync enabled</span>
              </div>
              <input
                value={renderPropertyValue(activeNote.title)}
                onChange={(e) => handleUpdateTitle(e.target.value)}
                className="w-full text-2xl md:text-4xl font-extrabold uppercase tracking-tighter text-slate-900 leading-tight md:leading-none mb-6 border-none outline-none bg-transparent"
                placeholder="Untitled Note"
              />
              <div className="h-1 w-24 bg-primary mb-8"></div>
              
              <RichTextEditor 
                content={content}
                onChange={handleUpdateNote}
                attachments={attachments}
                onAddAttachment={handleAddAttachment}
                onRemoveAttachment={handleRemoveAttachment}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 font-medium">
              Select a note to start editing
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
