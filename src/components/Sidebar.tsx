import React, { useState, useEffect } from 'react';
import {
  LayoutGrid, FileText, Calendar, Database, CheckSquare, Plus, X, Search, Settings, ChevronRight, ChevronDown
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
}

export default function Sidebar({ currentView, setCurrentView, onOpenSearch, onOpenSettings }: SidebarProps) {
  const [databases, setDatabases] = useState<any[]>([]);
  const [isDatabasesExpanded, setIsDatabasesExpanded] = useState(true);

  useEffect(() => {
    fetchDatabases();

    // Listen for database changes
    const handleDbChange = () => fetchDatabases();
    window.addEventListener('databases-changed', handleDbChange);
    return () => window.removeEventListener('databases-changed', handleDbChange);
  }, []);

  const fetchDatabases = async () => {
    try {
      const res = await fetch('/api/databases');
      const data = await res.json();
      setDatabases(data);
    } catch (error) {
      console.error('Failed to fetch databases:', error);
    }
  };

  const handleCreateDatabase = async () => {
    const name = prompt("Enter new database name:");
    if (!name) return;

    try {
      const res = await fetch('/api/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, icon: 'Database' })
      });
      const newDb = await res.json();
      setDatabases([...databases, newDb]);
      setCurrentView('database');
      // Dispatch event to navigate to the new database
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate-database', { detail: { id: newDb.id } }));
      }, 100);
    } catch (error) {
      console.error('Failed to create database:', error);
    }
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { id: 'notes', icon: FileText, label: 'All Notes' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'database', icon: Database, label: 'Database' },
  ];

  const handleAddEntry = async () => {
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Note',
          content: '',
          properties: JSON.stringify({ tag: 'Inbox' }),
          isTemplate: 0
        })
      });
      const newPage = await res.json();
      setCurrentView('notes');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate-note', { detail: { id: newPage.id, note: newPage } }));
        window.dispatchEvent(new CustomEvent('pages-changed'));
      }, 100);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  return (
    <aside className="w-64 h-full flex-shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between p-6 overflow-y-auto">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between px-0">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white size-10 flex items-center justify-center">
              <LayoutGrid size={24} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-black leading-tight uppercase tracking-tighter">New Notes</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider italic">Swiss Edition</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentView(currentView)}
            className="md:hidden p-2 text-slate-400 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5">
          <button
            onClick={onOpenSearch}
            className="flex items-center justify-between px-3 py-2 border border-black bg-white text-black hover:bg-black hover:text-white transition-all mb-4 group"
          >
            <div className="flex items-center gap-2">
              <Search size={16} strokeWidth={2.5} />
              <span className="text-xs font-black uppercase tracking-tight">Search</span>
            </div>
            <span className="text-[10px] font-black border border-current px-1 py-0.5">⌘K</span>
          </button>

          {navItems.map((item) => (
            <div key={item.id} className="mb-1">
              <div
                className={`flex items-center justify-between px-3 py-2 transition-all group border ${currentView === item.id && item.id !== 'database'
                    ? 'bg-black text-white border-black'
                    : 'text-slate-600 border-transparent hover:border-slate-200 hover:bg-slate-50'
                  }`}
              >
                <button
                  onClick={() => setCurrentView(item.id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <item.icon size={18} strokeWidth={currentView === item.id ? 2.5 : 2} />
                  <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
                </button>

                {item.id === 'database' && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCreateDatabase(); }}
                      className="p-1 hover:bg-slate-200 text-slate-400 hover:text-primary"
                      title="New Database"
                    >
                      <Plus size={14} strokeWidth={3} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsDatabasesExpanded(!isDatabasesExpanded); }}
                      className="p-1 hover:bg-slate-200 text-slate-400"
                    >
                      {isDatabasesExpanded ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
                    </button>
                  </div>
                )}
              </div>

              {/* Database Sub-items */}
              {item.id === 'database' && isDatabasesExpanded && databases.length > 0 && (
                <div className="mt-1 flex flex-col gap-0 border-l-2 border-slate-200 ml-3">
                  {databases.map(db => (
                    <button
                      key={db.id}
                      onClick={() => {
                        setCurrentView('database');
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('navigate-database', { detail: { id: db.id } }));
                        }, 50);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-black hover:bg-slate-50 transition-all text-[11px] font-bold uppercase tracking-tight text-left truncate"
                    >
                      <span className="truncate">{db.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="pt-6 mt-2 border-t border-slate-200">
          <p className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 italic">Categorization</p>
          <div className="flex flex-col gap-4">
            <button className="flex items-center gap-3 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-600 hover:text-primary transition-colors">
              <div className="w-1 h-4 bg-blue-500"></div> Work
            </button>
            <button className="flex items-center gap-3 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-600 hover:text-primary transition-colors">
              <div className="w-1 h-4 bg-emerald-500"></div> Personal
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="p-4 bg-slate-50 border border-slate-200">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-3 italic">Volume</p>
          <div className="h-1 w-full bg-slate-200 overflow-hidden">
            <div className="bg-black h-full w-[65%]"></div>
          </div>
          <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase">65% Utilized</p>
        </div>
        <button
          onClick={handleAddEntry}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white h-12 font-black text-xs uppercase tracking-[0.1em] hover:bg-black transition-colors shadow-none"
        >
          <Plus size={18} strokeWidth={3} />
          <span>Add Entry</span>
        </button>
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-3 px-3 py-2 w-full text-left text-slate-500 hover:text-black hover:bg-slate-50 transition-all"
          >
            <Settings size={18} />
            <span className="font-bold text-xs uppercase tracking-widest">Global Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
