import React, { useState } from 'react';
import { X, Bold, Italic, List, ImageIcon, Link as LinkIcon } from 'lucide-react';

export default function FocusMode({ onExit }: { onExit: () => void }) {
  const [content, setContent] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 md:p-10">
      <div className="fixed top-8 right-8">
        <button onClick={onExit} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
          <span className="text-xs font-bold tracking-widest uppercase">Exit Focus</span>
          <X size={24} />
        </button>
      </div>

      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        <header className="flex items-center justify-between px-8 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded"><Bold size={18} /></button>
            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded"><Italic size={18} /></button>
            <div className="w-px h-6 bg-slate-200 mx-2"></div>
            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded"><List size={18} /></button>
            <div className="w-px h-6 bg-slate-200 mx-2"></div>
            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded"><ImageIcon size={18} /></button>
            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded"><LinkIcon size={18} /></button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Saved just now</span>
            <button onClick={onExit} className="bg-primary text-white px-5 py-1.5 rounded text-sm font-semibold">Done</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 md:p-20 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]">
          <div className="max-w-2xl mx-auto space-y-8">
            <input 
              type="text" 
              placeholder="Project Deep Work" 
              defaultValue="Project Deep Work"
              className="w-full bg-transparent border-none p-0 text-4xl md:text-5xl font-bold text-slate-900 focus:ring-0 outline-none"
            />
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing your best ideas..."
              className="w-full bg-transparent border-none p-0 text-lg md:text-xl leading-relaxed text-slate-700 focus:ring-0 outline-none resize-none min-h-[400px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
