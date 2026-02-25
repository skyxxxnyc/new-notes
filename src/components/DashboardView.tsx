import React, { useState, useEffect } from 'react';
import { Responsive as ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayoutAny = ResponsiveGridLayout as any;
import { 
  LayoutDashboard, Plus, Settings, Trash2, Database as DatabaseIcon, 
  FileText, CheckSquare, Maximize2, X, ListIcon, LayoutGrid, Circle, Square, Menu
} from 'lucide-react';

type Widget = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'database' | 'notes' | 'tasks';
  databaseId?: string;
  viewMode?: 'table' | 'board';
};

type Dashboard = {
  id: string;
  name: string;
  widgets: string; // JSON string
};

type Database = {
  id: string;
  name: string;
  icon: string;
  columns: string;
};

type Page = {
  id: string;
  title: string;
  content: string;
  properties: string;
  parentId: string | null;
  databaseId: string;
  isTemplate: number;
};

export default function DashboardView({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [currentDashboardId, setCurrentDashboardId] = useState<string | null>(null);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);

  useEffect(() => {
    fetchDashboards();
    fetchDatabases();
    fetchPages();

    const handleNavigate = (e: any) => {
      if (e.detail.id) {
        setCurrentDashboardId(e.detail.id);
      }
    };
    window.addEventListener('navigate-dashboard', handleNavigate);
    return () => window.removeEventListener('navigate-dashboard', handleNavigate);
  }, []);

  const fetchDashboards = async () => {
    try {
      const res = await fetch('/api/dashboards');
      const data = await res.json();
      setDashboards(data);
      if (data.length > 0 && !currentDashboardId) {
        setCurrentDashboardId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch dashboards:', error);
    }
  };

  const fetchDatabases = async () => {
    try {
      const res = await fetch('/api/databases');
      const data = await res.json();
      setDatabases(data);
    } catch (error) {
      console.error('Failed to fetch databases:', error);
    }
  };

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/pages');
      const data = await res.json();
      setPages(data);
    } catch (error) {
      console.error('Failed to fetch pages:', error);
    }
  };

  const createDashboard = async () => {
    const name = prompt("Enter new dashboard name:");
    if (!name) return;
    
    try {
      const res = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, widgets: '[]' })
      });
      const newDash = await res.json();
      setDashboards([...dashboards, newDash]);
      setCurrentDashboardId(newDash.id);
    } catch (error) {
      console.error('Failed to create dashboard:', error);
    }
  };

  const updateDashboard = async (id: string, updates: Partial<Dashboard>) => {
    setDashboards(dashboards.map(d => d.id === id ? { ...d, ...updates } : d));
    try {
      await fetch(`/api/dashboards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Failed to update dashboard:', error);
      fetchDashboards();
    }
  };

  const deleteDashboard = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dashboard?")) return;
    
    try {
      await fetch(`/api/dashboards/${id}`, { method: 'DELETE' });
      setDashboards(dashboards.filter(d => d.id !== id));
      if (currentDashboardId === id) {
        setCurrentDashboardId(dashboards[0]?.id || null);
      }
    } catch (error) {
      console.error('Failed to delete dashboard:', error);
    }
  };

  const currentDashboard = dashboards.find(d => d.id === currentDashboardId);
  const widgets: Widget[] = currentDashboard && currentDashboard.widgets ? JSON.parse(currentDashboard.widgets) : [];

  const onLayoutChange = (layout: any) => {
    if (!currentDashboard || !isEditing) return;
    
    // Map layout changes back to widgets
    const newWidgets = widgets.map(w => {
      const l = layout.find((item: any) => item.i === w.i);
      if (l) {
        return { ...w, x: l.x, y: l.y, w: l.w, h: l.h };
      }
      return w;
    });
    
    updateDashboard(currentDashboard.id, { widgets: JSON.stringify(newWidgets) });
  };

  const addWidget = (type: Widget['type'], databaseId?: string, viewMode?: 'table' | 'board') => {
    if (!currentDashboard) return;
    
    const newWidget: Widget = {
      i: `w-${Date.now()}`,
      x: 0,
      y: Infinity, // puts it at the bottom
      w: type === 'notes' || type === 'tasks' ? 1 : 2,
      h: 2,
      type,
      databaseId,
      viewMode
    };
    
    updateDashboard(currentDashboard.id, { widgets: JSON.stringify([...widgets, newWidget]) });
    setShowAddWidget(false);
  };

  const removeWidget = (id: string) => {
    if (!currentDashboard) return;
    updateDashboard(currentDashboard.id, { widgets: JSON.stringify(widgets.filter(w => w.i !== id)) });
  };

  const renderWidgetContent = (widget: Widget) => {
    if (widget.type === 'notes') {
      // Just grab some recent pages that look like notes (no parent, not template)
      const recentNotes = pages.filter(p => !p.isTemplate && !p.parentId).slice(0, 5);
      return (
        <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <FileText size={16} className="text-primary" />
            <h3 className="font-bold text-sm text-slate-800">Recent Notes</h3>
          </div>
          <div className="p-2 flex-1 overflow-y-auto">
            {recentNotes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No notes found</div>
            ) : (
              <div className="flex flex-col gap-1">
                {recentNotes.map(note => (
                  <div key={note.id} className="px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                    <p className="text-sm font-semibold text-slate-800 truncate">{note.title}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{note.content.replace(/<[^>]+>/g, '') || 'Empty note'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    if (widget.type === 'tasks') {
      // Find pages that have a status property
      const tasks = pages.filter(p => !p.isTemplate && p.properties.includes('status')).slice(0, 5);
      return (
        <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <CheckSquare size={16} className="text-primary" />
            <h3 className="font-bold text-sm text-slate-800">My Tasks</h3>
          </div>
          <div className="p-2 flex-1 overflow-y-auto">
            {tasks.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No tasks found</div>
            ) : (
              <div className="flex flex-col gap-1">
                {tasks.map(task => {
                  const props = JSON.parse(task.properties || '{}');
                  const isDone = props.status?.toLowerCase() === 'done';
                  return (
                    <div key={task.id} className="px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors flex items-start gap-3">
                      <div className="mt-0.5">
                        {isDone ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} className="text-slate-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</p>
                        {props.status && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded">
                            {props.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }
    if (widget.type === 'database') {
      const db = databases.find(d => d.id === widget.databaseId);
      const dbPages = pages.filter(p => p.databaseId === widget.databaseId && !p.isTemplate && !p.parentId);
      
      return (
        <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <DatabaseIcon size={16} className="text-primary" />
              <h3 className="font-bold text-sm text-slate-800">{db?.name || 'Unknown Database'}</h3>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">{widget.viewMode}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {widget.viewMode === 'table' ? (
              <div className="flex flex-col gap-2">
                {dbPages.slice(0, 5).map(page => (
                  <div key={page.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded border border-slate-100">
                    <span className="text-sm font-medium text-slate-700 truncate">{page.title}</span>
                  </div>
                ))}
                {dbPages.length === 0 && <div className="text-slate-400 text-sm text-center py-4">No entries</div>}
              </div>
            ) : (
              <div className="flex gap-2 h-full">
                {['Todo', 'In Progress', 'Done'].map(status => {
                  const colPages = dbPages.filter(p => {
                    const props = JSON.parse(p.properties || '{}');
                    return props.status === status;
                  });
                  return (
                    <div key={status} className="flex-1 bg-slate-50 rounded p-2 flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{status}</h4>
                      {colPages.slice(0, 3).map(page => (
                        <div key={page.id} className="bg-white p-2 rounded border border-slate-200 shadow-sm text-xs font-medium text-slate-700 truncate">
                          {page.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 relative overflow-hidden">
      <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-8 bg-white sticky top-0 z-10">
        <nav className="flex items-center text-sm font-medium text-slate-400">
          <button 
            onClick={onToggleSidebar}
            className="md:hidden mr-2 p-2 -ml-2 text-slate-600 hover:text-primary"
          >
            <Menu size={20} />
          </button>
          <LayoutDashboard size={18} className="mr-2 text-primary hidden md:block" />
          <select 
            className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer border-none hover:bg-slate-100 px-2 py-1 rounded transition-colors max-w-[120px] md:max-w-xs truncate"
            value={currentDashboardId || ''}
            onChange={(e) => setCurrentDashboardId(e.target.value)}
          >
            {dashboards.map(db => (
              <option key={db.id} value={db.id}>{db.name}</option>
            ))}
          </select>
          <button 
            onClick={createDashboard}
            className="ml-2 p-1 text-slate-400 hover:text-primary hover:bg-slate-100 rounded transition-colors"
            title="New Dashboard"
          >
            <Plus size={16} />
          </button>
          {currentDashboardId && (
            <button 
              onClick={() => deleteDashboard(currentDashboardId)}
              className="ml-1 p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded transition-colors"
              title="Delete Dashboard"
            >
              <Trash2 size={16} />
            </button>
          )}
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 px-2 md:px-3 py-1.5 text-xs md:text-sm font-bold rounded-lg transition-colors ${isEditing ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
          
          {isEditing && (
            <div className="relative">
              <button 
                onClick={() => setShowAddWidget(!showAddWidget)}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 text-xs md:text-sm font-bold rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-sm"
              >
                <Plus size={16} /> <span className="hidden md:inline">Add Widget</span>
              </button>
              
              {showAddWidget && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Standard Widgets
                  </div>
                  <button onClick={() => addWidget('notes')} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50">
                    <FileText size={16} className="text-slate-400" /> Notes List
                  </button>
                  <button onClick={() => addWidget('tasks')} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100">
                    <CheckSquare size={16} className="text-slate-400" /> Task List
                  </button>
                  
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Database Views
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {databases.map(db => (
                      <React.Fragment key={db.id}>
                        <button onClick={() => addWidget('database', db.id, 'table')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                          <ListIcon size={14} className="text-slate-400" /> {db.name} (Table)
                        </button>
                        <button onClick={() => addWidget('database', db.id, 'board')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50">
                          <LayoutGrid size={14} className="text-slate-400" /> {db.name} (Board)
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {widgets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <LayoutDashboard size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium mb-2">This dashboard is empty</p>
            <p className="text-sm mb-6">Click "Edit Layout" to add widgets.</p>
            <button 
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-sm"
            >
              Edit Layout
            </button>
          </div>
        ) : (
          <ResponsiveGridLayoutAny
            className="layout"
            layouts={{ lg: widgets }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 3, md: 3, sm: 2, xs: 1, xxs: 1 }}
            rowHeight={150}
            onLayoutChange={onLayoutChange}
            isDraggable={isEditing}
            isResizable={isEditing}
            margin={[24, 24]}
          >
            {widgets.map(widget => (
              <div key={widget.i} className="relative group">
                {renderWidgetContent(widget)}
                {isEditing && (
                  <button 
                    onClick={() => removeWidget(widget.i)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </ResponsiveGridLayoutAny>
        )}
      </div>
    </main>
  );
}
