import React, { useState, useEffect } from 'react';
import { Search, Bold, Italic, List, ImageIcon, Link as LinkIcon, Share, MoreVertical, Maximize2, Sparkles, Menu, ChevronLeft, FileText } from 'lucide-react';
import { generateNoteSummary, improveWriting } from '../lib/gemini';
import RichTextEditor from './RichTextEditor';

export default function NotesView({ onEnterFocus, onToggleSidebar }: { onEnterFocus: () => void, onToggleSidebar: () => void }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any>(null);
  const [content, setContent] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showListOnMobile, setShowListOnMobile] = useState(true);
  const [attachments, setAttachments] = useState<any[]>([]);

  useEffect(() => {
    fetchNotes();

    const handleNavigateNote = (e: any) => {
      if (e.detail.note) {
        setActiveNote(e.detail.note);
        setContent(e.detail.note.content || '');
        setShowListOnMobile(false);
      }
    };

    const handlePagesChanged = () => fetchNotes();

    window.addEventListener('navigate-note', handleNavigateNote);
    window.addEventListener('pages-changed', handlePagesChanged);
    return () => {
      window.removeEventListener('navigate-note', handleNavigateNote);
      window.removeEventListener('pages-changed', handlePagesChanged);
    };
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/pages');
      const data = await res.json();
      // Only show pages that are not in a database and not templates
      const filteredNotes = data.filter((p: any) => !p.databaseId && !p.isTemplate);
      setNotes(filteredNotes);
      if (filteredNotes.length > 0 && !activeNote) {
        setActiveNote(filteredNotes[0]);
        setContent(filteredNotes[0].content || '');
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  };

  const saveNote = async (updates: any) => {
    if (!activeNote) return;
    try {
      await fetch(`/api/pages/${activeNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      // Optionally refresh list if title changed
      if (updates.title) fetchNotes();
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  // Debounce saving
  useEffect(() => {
    if (!activeNote) return;
    const timer = setTimeout(() => {
      if (content !== activeNote.content) {
        saveNote({ content });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [content]);

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

  if (!activeNote && notes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 bg-white">
        <div className="border-4 border-black p-12 flex flex-col items-center max-w-md text-center">
          <FileText size={64} strokeWidth={3} className="mb-6" />
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Archive Empty</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-8 italic">No active data streams found in current segment.</p>
          <p className="text-[10px] font-black uppercase text-slate-400">Press 'Add Entry' in sidebar to initialize.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Middle Panel: Note List */}
      <section className={`w-full md:w-80 flex-shrink-0 border-r border-black bg-white flex-col ${showListOnMobile ? 'flex' : 'hidden md:flex'}`}>
        <div className="p-6 border-b-2 border-black flex items-center gap-3">
          <button onClick={onToggleSidebar} className="md:hidden p-2 -ml-2 text-black hover:text-primary transition-colors">
            <Menu size={24} strokeWidth={3} />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={16} strokeWidth={3} />
            <input
              type="text"
              placeholder="Filter Archive..."
              className="w-full pl-10 pr-4 py-2 border-2 border-black text-xs font-black uppercase tracking-tight focus:bg-slate-50 outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notes.map(note => {
            const props = JSON.parse(note.properties || '{}');
            return (
              <div
                key={note.id}
                onClick={() => { setActiveNote(note); setContent(note.content || ''); setShowListOnMobile(false); }}
                className={`p-6 border-b border-slate-200 cursor-pointer transition-all ${activeNote?.id === note.id ? 'bg-black text-white' : 'hover:bg-slate-50 text-black'
                  }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] italic ${activeNote?.id === note.id ? 'text-primary' : 'text-slate-400'}`}>
                    {props.tag || 'Uncategorized'}
                  </span>
                </div>
                <h3 className="text-sm font-black uppercase tracking-tighter leading-tight mb-2 truncate">{note.title}</h3>
                <p className={`text-[11px] font-bold leading-relaxed line-clamp-2 ${activeNote?.id === note.id ? 'text-slate-300' : 'text-slate-500'}`}>
                  {note.content?.replace(/<[^>]+>/g, '').slice(0, 100) || 'Empty Content Buffer'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Right Panel: Editor */}
      <main className={`flex-1 bg-white flex-col relative overflow-hidden ${!showListOnMobile ? 'flex' : 'hidden md:flex'}`}>
        {/* Toolbar */}
        <header className="h-20 border-b-2 border-black flex items-center justify-between px-6 md:px-10 shrink-0 flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={() => setShowListOnMobile(true)} className="md:hidden p-2 -ml-2 text-black hover:text-primary transition-colors">
              <ChevronLeft size={24} strokeWidth={3} />
            </button>

            <div className="flex items-center gap-1.5 border-2 border-black p-1">
              <button
                onClick={handleImproveWriting}
                disabled={isAiLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all disabled:opacity-50"
              >
                <Sparkles size={14} strokeWidth={2.5} /> <span>Improve</span>
              </button>
              <button
                onClick={handleSummarize}
                disabled={isAiLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all disabled:opacity-50"
              >
                <Sparkles size={14} strokeWidth={2.5} /> <span>Summarize</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={onEnterFocus} className="p-2 text-black hover:text-primary hidden md:block transition-colors" title="Focus Mode">
              <Maximize2 size={20} strokeWidth={2.5} />
            </button>
            <button className="p-2 text-black hover:text-primary transition-colors"><Share size={20} strokeWidth={2.5} /></button>
            <button className="p-2 text-black hover:text-primary transition-colors"><MoreVertical size={20} strokeWidth={2.5} /></button>
          </div>
        </header>

        {/* Editor Content */}
        {activeNote && (
          <div className="flex-1 overflow-y-auto p-8 md:p-16">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <span className="px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] italic">
                  {JSON.parse(activeNote.properties || '{}').tag || 'Inbox'}
                </span>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Active Data Stream</span>
              </div>
              <input
                value={activeNote.title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  setActiveNote({ ...activeNote, title: newTitle });
                  saveNote({ title: newTitle });
                }}
                className="w-full text-4xl md:text-7xl font-black uppercase tracking-tighter text-black leading-[0.9] mb-12 border-none outline-none p-0 bg-transparent"
                placeholder="ENTRY TITLE"
              />
              <div className="h-2 w-48 bg-primary mb-16"></div>

              <RichTextEditor
                content={content}
                onChange={setContent}
                attachments={attachments}
                onAddAttachment={handleAddAttachment}
                onRemoveAttachment={handleRemoveAttachment}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
