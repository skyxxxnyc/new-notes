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
        <div className="h-full flex flex-col bg-white overflow-hidden">
          <div className="px-5 py-3 border-b-2 border-black flex items-center gap-3 bg-white">
            <FileText size={18} strokeWidth={2.5} className="text-black" />
            <h3 className="font-black text-xs uppercase tracking-widest text-black">Archives</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            {recentNotes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-widest italic">No Data</div>
            ) : (
              <div className="flex flex-col gap-2">
                {recentNotes.map(note => (
                  <div key={note.id} className="px-4 py-3 hover:bg-slate-50 border border-slate-100 cursor-pointer transition-all group">
                    <p className="text-xs font-black text-black uppercase tracking-tight truncate group-hover:text-primary">{note.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase truncate mt-1">{note.content.replace(/<[^>]+>/g, '') || 'Status: Empty'}</p>
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
        <div className="h-full flex flex-col bg-white overflow-hidden">
          <div className="px-5 py-3 border-b-2 border-black flex items-center gap-3 bg-white">
            <CheckSquare size={18} strokeWidth={2.5} className="text-black" />
            <h3 className="font-black text-xs uppercase tracking-widest text-black">Action Items</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            {tasks.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-widest italic">No Data</div>
            ) : (
              <div className="flex flex-col gap-2">
                {tasks.map(task => {
                  const props = JSON.parse(task.properties || '{}');
                  const isDone = props.status?.toLowerCase() === 'done';
                  return (
                    <div key={task.id} className="px-4 py-3 hover:bg-slate-50 border border-slate-100 cursor-pointer transition-all flex items-start gap-4">
                      <div className="mt-0.5">
                        {isDone ? <CheckSquare size={18} strokeWidth={3} className="text-primary" /> : <Square size={18} strokeWidth={3} className="text-black" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-black uppercase tracking-tight truncate ${isDone ? 'text-slate-300 line-through' : 'text-black'}`}>{task.title}</p>
                        {props.status && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-black text-white text-[9px] font-black uppercase tracking-widest">
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
        <div className="h-full flex flex-col bg-white overflow-hidden">
          <div className="px-5 py-3 border-b-2 border-black flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <DatabaseIcon size={18} strokeWidth={2.5} className="text-black" />
              <h3 className="font-black text-xs uppercase tracking-widest text-black">{db?.name || 'Dataset'}</h3>
            </div>
            <span className="text-[9px] uppercase tracking-widest font-black text-white bg-black px-2 py-1 italic">{widget.viewMode}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {widget.viewMode === 'table' ? (
              <div className="flex flex-col gap-1.5">
                {dbPages.slice(0, 5).map(page => (
                  <div key={page.id} className="flex items-center justify-between p-3 hover:bg-slate-50 border border-slate-100 transition-colors">
                    <span className="text-[11px] font-black uppercase tracking-tight text-black truncate">{page.title}</span>
                  </div>
                ))}
                {dbPages.length === 0 && <div className="text-slate-300 text-[10px] font-black uppercase tracking-widest text-center py-8 italic">Dataset Empty</div>}
              </div>
            ) : (
              <div className="flex gap-4 h-full">
                {['Todo', 'In Progress', 'Done'].map(status => {
                  const colPages = dbPages.filter(p => {
                    const props = JSON.parse(p.properties || '{}');
                    return props.status === status;
                  });
                  return (
                    <div key={status} className="flex-1 border border-black p-3 flex flex-col gap-3">
                      <h4 className="text-[9px] font-black text-black uppercase tracking-[0.2em] border-b border-black pb-2 italic">{status}</h4>
                      {colPages.slice(0, 3).map(page => (
                        <div key={page.id} className="bg-white p-2 border border-slate-200 text-[10px] font-bold uppercase tracking-tight text-black truncate">
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
    <main className="flex-1 flex flex-col min-w-0 bg-white relative overflow-hidden">
      <header className="h-20 border-b-2 border-black flex items-center justify-between px-6 md:px-10 bg-white sticky top-0 z-10">
        <nav className="flex items-center text-sm font-black uppercase tracking-tighter">
          <button
            onClick={onToggleSidebar}
            className="md:hidden mr-4 p-2 -ml-2 text-black hover:text-primary transition-colors"
          >
            <Menu size={24} strokeWidth={3} />
          </button>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-black text-white px-2 py-0.5 italic font-bold">MODE</span>
              <select
                className="bg-transparent text-black font-black outline-none cursor-pointer border-none hover:bg-slate-100 px-2 py-1 transition-colors max-w-[120px] md:max-w-xs truncate uppercase tracking-tight"
                value={currentDashboardId || ''}
                onChange={(e) => setCurrentDashboardId(e.target.value)}
              >
                {dashboards.map(db => (
                  <option key={db.id} value={db.id}>{db.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={createDashboard}
                className="p-1.5 border border-black text-black hover:bg-black hover:text-white transition-all"
                title="New Dashboard"
              >
                <Plus size={18} strokeWidth={3} />
              </button>
              {currentDashboardId && (
                <button
                  onClick={() => deleteDashboard(currentDashboardId)}
                  className="p-1.5 border border-black text-black hover:bg-primary hover:border-primary hover:text-white transition-all ml-1"
                  title="Delete Dashboard"
                >
                  <Trash2 size={18} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-6 py-2 text-xs font-black uppercase tracking-widest transition-all border-2 ${isEditing ? 'bg-primary border-primary text-white' : 'bg-black border-black text-white hover:bg-white hover:text-black'}`}
          >
            {isEditing ? 'Finalize' : 'Modify Layout'}
          </button>

          {isEditing && (
            <div className="relative">
              <button
                onClick={() => setShowAddWidget(!showAddWidget)}
                className="flex items-center gap-2 px-6 py-2 text-xs font-black uppercase tracking-widest bg-white border-2 border-black text-black hover:bg-black hover:text-white transition-all"
              >
                <Plus size={18} strokeWidth={3} /> <span>Components</span>
              </button>

              {showAddWidget && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-black text-[10px] font-black text-white uppercase tracking-[0.2em]">
                    Core Modules
                  </div>
                  <button onClick={() => addWidget('notes')} className="w-full text-left px-5 py-4 text-xs font-black uppercase tracking-tight text-black hover:bg-primary hover:text-white flex items-center gap-4 border-b border-black transition-colors">
                    <FileText size={18} strokeWidth={2.5} /> Notes Archive
                  </button>
                  <button onClick={() => addWidget('tasks')} className="w-full text-left px-5 py-4 text-xs font-black uppercase tracking-tight text-black hover:bg-primary hover:text-white flex items-center gap-4 border-b-2 border-black transition-colors">
                    <CheckSquare size={18} strokeWidth={2.5} /> Task Control
                  </button>

                  <div className="px-4 py-3 bg-black text-[10px] font-black text-white uppercase tracking-[0.2em]">
                    Data Repositories
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {databases.map(db => (
                      <React.Fragment key={db.id}>
                        <button onClick={() => addWidget('database', db.id, 'table')} className="w-full text-left px-5 py-3 text-[11px] font-bold uppercase text-black hover:bg-slate-100 flex items-center gap-4 transition-colors">
                          <ListIcon size={16} strokeWidth={2.5} /> {db.name} (Grid)
                        </button>
                        <button onClick={() => addWidget('database', db.id, 'board')} className="w-full text-left px-5 py-3 text-[11px] font-bold uppercase text-black hover:bg-slate-100 flex items-center gap-4 border-b border-slate-200 transition-colors">
                          <LayoutGrid size={16} strokeWidth={2.5} /> {db.name} (Kanban)
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

      <div className="flex-1 overflow-y-auto p-8 md:p-12">
        {widgets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="border-4 border-black p-10 flex flex-col items-center">
              <LayoutDashboard size={80} strokeWidth={3} className="mb-6" />
              <p className="text-2xl font-black uppercase tracking-tighter mb-2">Null State Detected</p>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-8 italic">No components active in current viewport</p>
              <button
                onClick={() => setIsEditing(true)}
                className="px-10 py-4 bg-black text-white font-black uppercase tracking-[0.2em] hover:bg-primary transition-colors"
              >
                Initialize Layout
              </button>
            </div>
          </div>
        ) : (
          <ResponsiveGridLayoutAny
            className="layout"
            layouts={{ lg: widgets }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 3, md: 3, sm: 2, xs: 1, xxs: 1 }}
            rowHeight={180}
            onLayoutChange={onLayoutChange}
            isDraggable={isEditing}
            isResizable={isEditing}
            margin={[32, 32]}
          >
            {widgets.map(widget => (
              <div key={widget.i} className={`relative group border-2 border-black bg-white transition-all ${isEditing ? 'cursor-move' : ''}`}>
                <div className="absolute -top-0.5 -left-0.5 bg-black text-white text-[9px] font-black px-1.5 py-0.5 z-10 uppercase tracking-widest">
                  {widget.type}
                </div>
                {renderWidgetContent(widget)}
                {isEditing && (
                  <button
                    onClick={() => removeWidget(widget.i)}
                    className="absolute -top-3 -right-3 bg-primary text-white p-2 border-2 border-black hover:bg-black transition-all z-20"
                  >
                    <X size={16} strokeWidth={3} />
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
