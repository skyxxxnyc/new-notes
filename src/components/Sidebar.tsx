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

  return (
    <aside className="w-64 h-full flex-shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between p-4 overflow-y-auto">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg size-10 flex items-center justify-center text-primary">
              <LayoutGrid size={20} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold leading-tight">Swiss Notes</h1>
              <p className="text-xs text-slate-500 font-medium">Premium Plan</p>
            </div>
          </div>
          <button 
            onClick={() => setCurrentView(currentView)} // This will trigger the close in App.tsx
            className="md:hidden p-2 text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          <button
            onClick={onOpenSearch}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors mb-2 border border-slate-200 bg-slate-50"
          >
            <div className="flex items-center gap-2">
              <Search size={16} />
              <span className="text-sm font-medium">Search...</span>
            </div>
            <span className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-200">⌘K</span>
          </button>

          {navItems.map((item) => (
            <div key={item.id}>
              <div
                className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors group ${
                  currentView === item.id && item.id !== 'database'
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <button
                  onClick={() => setCurrentView(item.id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <item.icon size={20} />
                  <span className="text-sm">{item.label}</span>
                </button>
                
                {item.id === 'database' && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleCreateDatabase(); }}
                      className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-primary"
                      title="New Database"
                    >
                      <Plus size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsDatabasesExpanded(!isDatabasesExpanded); }}
                      className="p-1 hover:bg-slate-200 rounded text-slate-400"
                    >
                      {isDatabasesExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Database Sub-items */}
              {item.id === 'database' && isDatabasesExpanded && databases.length > 0 && (
                <div className="ml-6 mt-1 flex flex-col gap-0.5 border-l border-slate-200 pl-2">
                  {databases.map(db => (
                    <button
                      key={db.id}
                      onClick={() => {
                        setCurrentView('database');
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('navigate-database', { detail: { id: db.id } }));
                        }, 50);
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors text-xs text-left truncate"
                    >
                      <Database size={12} className="shrink-0" />
                      <span className="truncate">{db.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        
        <div className="pt-4 mt-2 border-t border-slate-100">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Tags</p>
            <div className="flex flex-col gap-1">
                <button className="flex items-center gap-3 px-3 py-1.5 text-sm text-slate-600 hover:text-primary">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Work
                </button>
                <button className="flex items-center gap-3 px-3 py-1.5 text-sm text-slate-600 hover:text-primary">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Personal
                </button>
            </div>
        </div>
      </div>

      <div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Storage</p>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="bg-primary h-full w-[65%]"></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">6.5 GB of 10 GB used</p>
        </div>
        <button className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-lg h-11 font-bold text-sm shadow-sm hover:opacity-90 transition-opacity">
          <Plus size={20} />
          <span>New Note</span>
        </button>
        <div className="mt-auto pt-4 border-t border-slate-200">
          <button 
            onClick={onOpenSettings}
            className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Settings size={18} />
            <span className="font-medium text-sm">Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
