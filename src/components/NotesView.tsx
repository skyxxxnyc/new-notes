import React, { useState, useEffect } from 'react';
import { Search, Bold, Italic, List, ImageIcon, Link as LinkIcon, Share, MoreVertical, Maximize2, Sparkles, Menu, ChevronLeft } from 'lucide-react';
import { generateNoteSummary, improveWriting } from '../lib/gemini';

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
  const [activeNote, setActiveNote] = useState(MOCK_NOTES[0]);
  const [content, setContent] = useState(activeNote.content);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showListOnMobile, setShowListOnMobile] = useState(true);

  useEffect(() => {
    const handleNavigateNote = (e: any) => {
      if (e.detail.note) {
        setActiveNote(e.detail.note);
        setContent(e.detail.note.content);
        setShowListOnMobile(false);
      }
    };
    window.addEventListener('navigate-note', handleNavigateNote);
    return () => window.removeEventListener('navigate-note', handleNavigateNote);
  }, []);

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
          {MOCK_NOTES.map(note => (
            <div 
              key={note.id}
              onClick={() => { setActiveNote(note); setContent(note.content); setShowListOnMobile(false); }}
              className={`p-5 border-b border-slate-100 cursor-pointer transition-colors ${
                activeNote.id === note.id ? 'bg-primary/[0.03] border-l-4 border-l-primary' : 'hover:bg-white border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${activeNote.id === note.id ? 'text-primary' : 'text-slate-400'}`}>
                  {note.tag}
                </span>
                <span className="text-[10px] text-slate-400">{note.time}</span>
              </div>
              <h3 className="text-sm font-bold leading-tight mb-1 truncate">{note.title}</h3>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{note.snippet}</p>
            </div>
          ))}
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
            <button className="text-slate-400 hover:text-primary transition-colors"><Bold size={18} /></button>
            <button className="text-slate-400 hover:text-primary transition-colors"><Italic size={18} /></button>
            <button className="text-slate-400 hover:text-primary transition-colors"><List size={18} /></button>
            <div className="hidden md:block h-4 w-px bg-slate-200 mx-2"></div>
            <button className="text-slate-400 hover:text-primary transition-colors"><ImageIcon size={18} /></button>
            <button className="text-slate-400 hover:text-primary transition-colors"><LinkIcon size={18} /></button>
            <div className="hidden md:block h-4 w-px bg-slate-200 mx-2"></div>
            
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
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-500">{activeNote.tag}</span>
              <span className="text-[11px] text-slate-400">Last edited {activeNote.time}</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold uppercase tracking-tighter text-slate-900 leading-tight md:leading-none mb-6">
              {activeNote.title}
            </h1>
            <div className="h-1 w-24 bg-primary mb-8"></div>
            
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-[500px] resize-none border-none p-0 text-base leading-relaxed text-slate-700 focus:ring-0 outline-none"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
