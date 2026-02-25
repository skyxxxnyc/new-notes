import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Database, LayoutGrid, X } from 'lucide-react';

// Import MOCK_NOTES to include them in search results
const MOCK_NOTES = [
  {
    id: 'mock-1',
    title: 'Grid Systems in Graphic Design',
    tag: 'Work',
    time: '2m ago',
    snippet: 'The grid system is an aid, not a guarantee. It permits a number of possible uses...',
    content: 'The grid system is an aid, not a guarantee. It permits a number of possible uses and provides the designer with the opportunity to create a layout that is balanced, orderly, and harmonious.\n\nJosef Müller-Brockmann, a pioneer of Swiss design, emphasized the importance of objective and functional design. A grid system provides a structural logic that allows for:\n\n1. Consistency across multiple pages or layouts.\n2. Clarity of information hierarchy.\n3. Rationalization of the creative process through mathematical rules.'
  },
  {
    id: 'mock-2',
    title: 'Typography Principles',
    tag: 'Design',
    time: '2h ago',
    snippet: 'Sans-serif typefaces are preferred for their clarity and modern aesthetic...',
    content: 'Sans-serif typefaces are preferred for their clarity and modern aesthetic, reinforcing the Swiss style...'
  }
];

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (type: string, id: string, parentId?: string, item?: any) => void;
}

export default function GlobalSearch({ isOpen, onClose, onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ databases: [], pages: [], dashboards: [], notes: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const flatResults = [
    ...results.dashboards.map((d: any) => ({ type: 'dashboard', id: d.id, parentId: undefined, item: d })),
    ...results.databases.map((d: any) => ({ type: 'database', id: d.id, parentId: undefined, item: d })),
    ...results.pages.map((p: any) => ({ type: 'page', id: p.id, parentId: p.databaseId, item: p })),
    ...(results.notes || []).map((n: any) => ({ type: 'note', id: n.id, parentId: undefined, item: n }))
  ];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults({ databases: [], pages: [], dashboards: [], notes: [] });
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          const selected = flatResults[selectedIndex];
          onNavigate(selected.type, selected.id, selected.parentId, selected.item);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, flatResults, selectedIndex, onNavigate]);

  useEffect(() => {
    if (!query) {
      setResults({ databases: [], pages: [], dashboards: [], notes: [] });
      setSelectedIndex(0);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        // Search mock notes locally
        const q = query.toLowerCase();
        const matchedNotes = MOCK_NOTES.filter(n => 
          n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
        );
        
        setResults({ ...data, notes: matchedNotes });
        setSelectedIndex(0);
      } catch (err) {
        console.error("Search failed", err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector('.selected-item') as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  let currentIndex = 0;

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100] flex items-start justify-center pt-[10vh]" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <Search className="text-slate-400 mr-3" size={20} />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search databases, pages, and dashboards..." 
            className="flex-1 bg-transparent border-none outline-none text-lg text-slate-800 placeholder-slate-400"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-md"><X size={20} /></button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto p-2" ref={listRef}>
          {query && results.dashboards.length === 0 && results.databases.length === 0 && results.pages.length === 0 && (!results.notes || results.notes.length === 0) && (
            <div className="p-8 text-center text-slate-500">No results found for "{query}"</div>
          )}
          
          {results.dashboards.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Dashboards</div>
              {results.dashboards.map((d: any) => {
                const isSelected = currentIndex === selectedIndex;
                currentIndex++;
                return (
                  <div 
                    key={d.id} 
                    onClick={() => onNavigate('dashboard', d.id)} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${isSelected ? 'bg-primary/10 text-primary selected-item' : 'hover:bg-slate-50'}`}
                  >
                    <LayoutGrid size={16} className={isSelected ? 'text-primary' : 'text-slate-400'} />
                    <span className={`font-medium ${isSelected ? 'text-primary' : 'text-slate-700'}`}>{d.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {results.databases.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Databases</div>
              {results.databases.map((d: any) => {
                const isSelected = currentIndex === selectedIndex;
                currentIndex++;
                return (
                  <div 
                    key={d.id} 
                    onClick={() => onNavigate('database', d.id)} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${isSelected ? 'bg-primary/10 text-primary selected-item' : 'hover:bg-slate-50'}`}
                  >
                    <Database size={16} className={isSelected ? 'text-primary' : 'text-slate-400'} />
                    <span className={`font-medium ${isSelected ? 'text-primary' : 'text-slate-700'}`}>{d.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {results.pages.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Pages</div>
              {results.pages.map((p: any) => {
                const isSelected = currentIndex === selectedIndex;
                currentIndex++;
                return (
                  <div 
                    key={p.id} 
                    onClick={() => onNavigate('page', p.id, p.databaseId, p)} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${isSelected ? 'bg-primary/10 text-primary selected-item' : 'hover:bg-slate-50'}`}
                  >
                    <FileText size={16} className={isSelected ? 'text-primary' : 'text-slate-400'} />
                    <div className="flex flex-col">
                      <span className={`font-medium ${isSelected ? 'text-primary' : 'text-slate-700'}`}>{p.title}</span>
                      <span className={`text-xs line-clamp-1 ${isSelected ? 'text-primary/70' : 'text-slate-400'}`}>{p.content.replace(/<[^>]+>/g, '')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {results.notes && results.notes.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Notes</div>
              {results.notes.map((n: any) => {
                const isSelected = currentIndex === selectedIndex;
                currentIndex++;
                return (
                  <div 
                    key={n.id} 
                    onClick={() => onNavigate('note', n.id, undefined, n)} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${isSelected ? 'bg-primary/10 text-primary selected-item' : 'hover:bg-slate-50'}`}
                  >
                    <FileText size={16} className={isSelected ? 'text-primary' : 'text-slate-400'} />
                    <div className="flex flex-col">
                      <span className={`font-medium ${isSelected ? 'text-primary' : 'text-slate-700'}`}>{n.title}</span>
                      <span className={`text-xs line-clamp-1 ${isSelected ? 'text-primary/70' : 'text-slate-400'}`}>{n.snippet}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
          <span>Search across your entire workspace</span>
          <span><kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded shadow-sm">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
