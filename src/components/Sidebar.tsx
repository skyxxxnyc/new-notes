import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, FileText, Calendar, Database, CheckSquare, Plus, X, Search, Settings, ChevronRight, ChevronDown, ChevronLeft, LogOut, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { renderPropertyValue } from '../lib/utils';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenAgents: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ 
  currentView, 
  setCurrentView, 
  onOpenSearch, 
  onOpenSettings,
  onOpenAgents,
  isCollapsed,
  setIsCollapsed
}: SidebarProps) {
  const [databases, setDatabases] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [isDatabasesExpanded, setIsDatabasesExpanded] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  useEffect(() => {
    fetchDatabases();
    fetchPages();
    
    // Listen for changes
    const handleChange = () => {
      fetchDatabases();
      fetchPages();
    };
    window.addEventListener('databases-changed', handleChange);
    window.addEventListener('pages-changed', handleChange);
    return () => {
      window.removeEventListener('databases-changed', handleChange);
      window.removeEventListener('pages-changed', handleChange);
    };
  }, []);

  const fetchDatabases = async () => {
    try {
      const data = await apiFetch('/api/databases');
      setDatabases(data);
    } catch (error) {
      console.error('Failed to fetch databases:', error);
    }
  };

  const fetchPages = async () => {
    try {
      const data = await apiFetch('/api/pages');
      setPages(data);
    } catch (error) {
      console.error('Failed to fetch pages:', error);
    }
  };

  const handleCreateDatabase = async () => {
    const name = "Untitled Database";
    
    try {
      const newDb = await apiFetch('/api/databases', {
        method: 'POST',
        body: JSON.stringify({ name, icon: 'Database' })
      });
      setDatabases([...databases, newDb]);
      setCurrentView('database');
      window.dispatchEvent(new CustomEvent('databases-changed'));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate-database', { detail: { id: newDb.id } }));
      }, 100);
    } catch (error) {
      console.error('Failed to create database:', error);
    }
  };

  const handleCreatePage = async (databaseId: string, parentId: string | null = null) => {
    try {
      const newPage = await apiFetch('/api/pages', {
        method: 'POST',
        body: JSON.stringify({ 
          title: 'Untitled', 
          content: '', 
          properties: '{}', 
          parentId, 
          databaseId 
        })
      });
      setCurrentView('database');
      window.dispatchEvent(new CustomEvent('pages-changed'));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate-page', { detail: { id: newPage.id, databaseId, page: newPage } }));
      }, 100);
    } catch (error) {
      console.error('Failed to create page:', error);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { id: 'notes', icon: FileText, label: 'All Notes' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'database', icon: Database, label: 'Database' },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} h-full flex-shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between p-4 transition-all duration-300 overflow-y-auto overflow-x-hidden relative group/sidebar`}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 text-slate-400 hover:text-slate-600 shadow-sm z-10 opacity-0 group-hover/sidebar:opacity-100 transition-opacity hidden md:block"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg size-10 flex items-center justify-center text-primary shrink-0">
              <LayoutGrid size={20} />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <h1 className="text-sm font-bold leading-tight truncate">Swiss Notes</h1>
                <p className="text-xs text-slate-500 font-medium">Premium Plan</p>
              </div>
            )}
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
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors mb-2 border border-slate-200 bg-slate-50`}
            title={isCollapsed ? "Search" : undefined}
          >
            <div className="flex items-center gap-2">
              <Search size={16} />
              {!isCollapsed && <span className="text-sm font-medium">Search...</span>}
            </div>
            {!isCollapsed && <span className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-200">⌘K</span>}
          </button>

          <button
            onClick={onOpenAgents}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-primary hover:bg-primary/5 transition-colors mb-4 border border-primary/20 bg-primary/5`}
            title={isCollapsed ? "AI Agents" : undefined}
          >
            <Sparkles size={18} className="shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col items-start">
                <span className="text-sm font-bold">AI Agents</span>
                <span className="text-[10px] opacity-70">Ask anything...</span>
              </div>
            )}
            {!isCollapsed && <span className="ml-auto text-[10px] font-bold bg-white/50 px-1.5 py-0.5 rounded shadow-sm border border-primary/10">⌘J</span>}
          </button>

          {navItems.map((item) => (
            <div key={item.id}>
              <div
                className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors group ${
                  currentView === item.id && item.id !== 'database'
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <button
                  onClick={() => setCurrentView(item.id)}
                  className="flex items-center gap-3 flex-1 text-left overflow-hidden"
                >
                  <item.icon size={20} className="shrink-0" />
                  {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
                </button>
                
                {!isCollapsed && item.id === 'database' && (
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
              {!isCollapsed && item.id === 'database' && isDatabasesExpanded && (
                <div className="ml-6 mt-1 flex flex-col gap-0.5 border-l border-slate-200 pl-2">
                  {databases.map(db => (
                    <div key={db.id} className="flex flex-col">
                      <div className="flex items-center justify-between group/db-item pr-2">
                        <button
                          onClick={() => {
                            setCurrentView('database');
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('navigate-database', { detail: { id: db.id } }));
                            }, 50);
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors text-xs text-left truncate flex-1"
                        >
                          <Database size={12} className="shrink-0" />
                          <span className="truncate">{db.name}</span>
                        </button>
                        <div className="flex items-center opacity-0 group-hover/db-item:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleCreatePage(db.id); }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-primary"
                            title="New Page"
                          >
                            <Plus size={12} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleExpand(db.id); }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400"
                          >
                            {expandedItems[db.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </button>
                        </div>
                      </div>
                      
                      {/* Pages under database */}
                      {expandedItems[db.id] && (
                        <div className="ml-4 flex flex-col gap-0.5 border-l border-slate-100 pl-2 mt-0.5">
                          {pages.filter(p => p.databaseId === db.id && p.parentId === null && !p.isTemplate).map(page => (
                            <button
                              key={page.id}
                              onClick={() => {
                                setCurrentView('database');
                                setTimeout(() => {
                                  window.dispatchEvent(new CustomEvent('navigate-page', { detail: { id: page.id, databaseId: db.id, page } }));
                                }, 50);
                              }}
                              className="flex items-center gap-2 px-2 py-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors text-[11px] text-left truncate"
                            >
                              <FileText size={10} className="shrink-0" />
                              <span className="truncate">{renderPropertyValue(page.title)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleCreateDatabase}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-slate-50 transition-colors text-xs text-left"
                  >
                    <Plus size={12} className="shrink-0" />
                    <span>Add a database</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>
        
        {!isCollapsed && (
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
        )}
      </div>

      <div>
      <div className="relative">
        {isNewMenuOpen && !isCollapsed && (
          <div className="absolute bottom-full left-0 mb-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button 
              onClick={() => {
                setIsNewMenuOpen(false);
                if (currentView === 'notes') {
                  window.dispatchEvent(new CustomEvent('new-note'));
                } else if (currentView === 'database') {
                  const dbId = databases[0]?.id || 'workspace-db';
                  handleCreatePage(dbId);
                } else {
                  handleCreatePage('workspace-db');
                }
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <FileText size={16} className="text-slate-400" />
              <div className="flex flex-col">
                <span className="font-bold">New Page</span>
                <span className="text-[10px] text-slate-400">Create a blank document</span>
              </div>
            </button>
            <button 
              onClick={() => {
                setIsNewMenuOpen(false);
                handleCreateDatabase();
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <Database size={16} className="text-slate-400" />
              <div className="flex flex-col">
                <span className="font-bold">New Database</span>
                <span className="text-[10px] text-slate-400">Create a structured table</span>
              </div>
            </button>
          </div>
        )}
        <button 
          onClick={() => {
            if (isCollapsed) {
              handleCreatePage('workspace-db');
            } else {
              setIsNewMenuOpen(!isNewMenuOpen);
            }
          }}
          className={`w-full flex items-center justify-center gap-2 bg-primary text-white rounded-lg ${isCollapsed ? 'size-10' : 'h-11'} font-bold text-sm shadow-sm hover:opacity-90 transition-all mx-auto`}
          title={isCollapsed ? "New Item" : undefined}
        >
          <Plus size={20} />
          {!isCollapsed && <span>New</span>}
        </button>
      </div>
        <div className="mt-auto pt-4 border-t border-slate-200 flex flex-col gap-1">
          <button 
            onClick={onOpenSettings}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 w-full text-left rounded-lg text-slate-500 hover:bg-slate-100 transition-colors`}
            title={isCollapsed ? "Settings" : undefined}
          >
            <Settings size={18} />
            {!isCollapsed && <span className="font-medium text-sm">Settings</span>}
          </button>
          <button 
            onClick={() => supabase.auth.signOut()}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 w-full text-left rounded-lg text-red-500 hover:bg-red-50 transition-colors`}
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <LogOut size={18} />
            {!isCollapsed && <span className="font-medium text-sm">Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
