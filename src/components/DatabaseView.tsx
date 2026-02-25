import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, ArrowUpDown, Plus, MoreHorizontal,
  X, Maximize2, CheckSquare, Square, PlusCircle, 
  Palette, Calendar, AlertCircle, User, CircleDot,
  ChevronRight, FileText, Trash2, Database as DatabaseIcon,
  Settings, Type, Hash, AlignLeft, Edit2,
  Download, Upload, LayoutGrid, List as ListIcon, Menu
} from 'lucide-react';
import Papa from 'papaparse';
import TextareaAutosize from 'react-textarea-autosize';
import RichTextEditor from './RichTextEditor';

type Column = {
  id: string;
  name: string;
  type: 'text' | 'select' | 'date' | 'number';
  width: number;
  options?: string[];
};

type Database = {
  id: string;
  name: string;
  icon: string;
  columns: string; // JSON string
};

type Page = {
  id: string;
  title: string;
  content: string;
  properties: string; // JSON string
  parentId: string | null;
  databaseId: string;
  isTemplate: number;
};

export default function DatabaseView({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [currentDatabaseId, setCurrentDatabaseId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Page | null>(null);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingColumns, setIsEditingColumns] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const [attachments, setAttachments] = useState<any[]>([]);

  useEffect(() => {
    fetchDatabases();

    const handleNavigateDb = (e: any) => {
      if (e.detail.id) {
        setCurrentDatabaseId(e.detail.id);
        setCurrentParentId(null);
        setSelectedEntry(null);
      }
    };
    
    const handleNavigatePage = (e: any) => {
      if (e.detail.databaseId) {
        setCurrentDatabaseId(e.detail.databaseId);
        if (e.detail.page) {
          setSelectedEntry(e.detail.page);
          setCurrentParentId(e.detail.page.parentId);
        }
      }
    };

    window.addEventListener('navigate-database', handleNavigateDb);
    window.addEventListener('navigate-page', handleNavigatePage);
    return () => {
      window.removeEventListener('navigate-database', handleNavigateDb);
      window.removeEventListener('navigate-page', handleNavigatePage);
    };
  }, []);

  useEffect(() => {
    if (currentDatabaseId) {
      fetchPages(currentDatabaseId);
    }
  }, [currentDatabaseId]);

  const fetchDatabases = async () => {
    try {
      const res = await fetch('/api/databases');
      const data = await res.json();
      setDatabases(data);
      if (data.length > 0 && !currentDatabaseId) {
        setCurrentDatabaseId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch databases:', error);
    }
  };

  const createDatabase = async () => {
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
      setCurrentDatabaseId(newDb.id);
      setCurrentParentId(null);
      setSelectedEntry(null);
      window.dispatchEvent(new CustomEvent('databases-changed'));
    } catch (error) {
      console.error('Failed to create database:', error);
    }
  };

  const updateDatabase = async (id: string, updates: Partial<Database>) => {
    setDatabases(databases.map(db => db.id === id ? { ...db, ...updates } : db));
    try {
      await fetch(`/api/databases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      window.dispatchEvent(new CustomEvent('databases-changed'));
    } catch (error) {
      console.error('Failed to update database:', error);
      fetchDatabases();
    }
  };

  const deleteDatabase = async (id: string) => {
    if (!confirm("Are you sure you want to delete this database and all its pages?")) return;
    
    try {
      await fetch(`/api/databases/${id}`, { method: 'DELETE' });
      setDatabases(databases.filter(db => db.id !== id));
      if (currentDatabaseId === id) {
        setCurrentDatabaseId(databases[0]?.id || null);
        setCurrentParentId(null);
        setSelectedEntry(null);
      }
      window.dispatchEvent(new CustomEvent('databases-changed'));
    } catch (error) {
      console.error('Failed to delete database:', error);
    }
  };

  const fetchPages = async (dbId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/pages?databaseId=${dbId}`);
      const data = await res.json();
      setPages(data);
    } catch (error) {
      console.error('Failed to fetch pages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createPage = async (
    parentId: string | null = null, 
    templateId: string | null = null, 
    initialProperties: string | null = null,
    titleOverride: string | null = null,
    contentOverride: string | null = null
  ) => {
    if (!currentDatabaseId) return;
    
    let initialData = { 
      title: titleOverride || 'Untitled', 
      content: contentOverride || '', 
      properties: initialProperties || '{}', 
      isTemplate: false 
    };
    
    if (templateId) {
      const template = pages.find(p => p.id === templateId);
      if (template) {
        initialData = {
          title: titleOverride || template.title,
          content: contentOverride || template.content,
          properties: template.properties,
          isTemplate: false
        };
      }
    }

    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...initialData, parentId, databaseId: currentDatabaseId })
      });
      const newPage = await res.json();
      setPages([...pages, newPage]);
      if (parentId || !templateId) {
        setSelectedEntry(newPage);
      }
    } catch (error) {
      console.error('Failed to create page:', error);
    }
  };

  const createTemplate = async () => {
    if (!currentDatabaseId) return;
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Template', content: '', properties: '{}', parentId: null, databaseId: currentDatabaseId, isTemplate: true })
      });
      const newPage = await res.json();
      setPages([...pages, newPage]);
      setSelectedEntry(newPage);
    } catch (error) {
      console.error('Failed to create template:', error);
    }
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

  const updatePage = async (id: string, updates: Partial<Page>) => {
    setPages(pages.map(p => p.id === id ? { ...p, ...updates } : p));
    if (selectedEntry?.id === id) {
      setSelectedEntry({ ...selectedEntry, ...updates });
    }

    try {
      await fetch(`/api/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Failed to update page:', error);
      if (currentDatabaseId) fetchPages(currentDatabaseId);
    }
  };

  const deletePage = async (id: string) => {
    setPages(pages.filter(p => p.id !== id && p.parentId !== id));
    if (selectedEntry?.id === id) {
      setSelectedEntry(null);
    }

    try {
      await fetch(`/api/pages/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete page:', error);
      if (currentDatabaseId) fetchPages(currentDatabaseId);
    }
  };

  const exportDatabase = async () => {
    if (!currentDatabaseId || !currentDb) return;
    try {
      const res = await fetch(`/api/pages?databaseId=${currentDatabaseId}`);
      const dbPages = await res.json();
      const exportData = {
        database: currentDb,
        pages: dbPages
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentDb.name.replace(/\s+/g, '-').toLowerCase()}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export database:', error);
      alert('Failed to export database');
    }
  };

  const importDatabase = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv,.md';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const extension = file.name.split('.').pop()?.toLowerCase();
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        try {
          if (extension === 'json') {
            const data = JSON.parse(text);
            if (!data.database || !data.pages) throw new Error("Invalid format");
            
            const res = await fetch('/api/databases/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            const newDb = await res.json();
            setDatabases([...databases, newDb]);
            setCurrentDatabaseId(newDb.id);
            setCurrentParentId(null);
            setSelectedEntry(null);
            window.dispatchEvent(new CustomEvent('databases-changed'));
          } else if (extension === 'csv') {
            Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
              complete: async (results) => {
                const headers = results.meta.fields || [];
                const columns = headers.map(h => ({
                  id: h.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                  name: h,
                  type: 'text',
                  width: 150
                }));
                
                const pagesData = results.data.map((row: any, index) => {
                  const titleCol = headers[0];
                  const title = titleCol && row[titleCol] ? row[titleCol] : `Row ${index + 1}`;
                  const properties: Record<string, any> = {};
                  headers.forEach(h => {
                    const colId = h.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    properties[colId] = row[h];
                  });
                  
                  return {
                    id: `temp-${index}`,
                    title,
                    content: '',
                    properties: JSON.stringify(properties),
                    parentId: null,
                    isTemplate: false
                  };
                });

                const data = {
                  database: {
                    name: file.name.replace(/\.csv$/i, ''),
                    icon: 'Database',
                    columns: JSON.stringify(columns)
                  },
                  pages: pagesData
                };

                const res = await fetch('/api/databases/import', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                const newDb = await res.json();
                setDatabases([...databases, newDb]);
                setCurrentDatabaseId(newDb.id);
                setCurrentParentId(null);
                setSelectedEntry(null);
                window.dispatchEvent(new CustomEvent('databases-changed'));
              }
            });
          } else if (extension === 'md') {
            if (!currentDatabaseId) {
              alert("Please select a database first to import a Markdown file as a page.");
              return;
            }
            const title = file.name.replace(/\.md$/i, '');
            await createPage(currentParentId, null, null, title, text);
          }
        } catch (err) {
          console.error("Import failed", err);
          alert("Import failed. Please check the file format.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const currentDb = databases.find(db => db.id === currentDatabaseId);
  const columns: Column[] = currentDb && currentDb.columns ? JSON.parse(currentDb.columns) : [];
  
  const currentPages = pages.filter(p => p.parentId === currentParentId && !p.isTemplate);
  const templates = pages.filter(p => p.isTemplate && p.databaseId === currentDatabaseId);
  
  const breadcrumbs = [];
  let curr = currentParentId;
  while (curr) {
    const page = pages.find(p => p.id === curr);
    if (page) {
      breadcrumbs.unshift(page);
      curr = page.parentId;
    } else {
      break;
    }
  }

  const addColumn = () => {
    if (!currentDb) return;
    const name = prompt("Column Name:");
    if (!name) return;
    const newCol: Column = { id: name.toLowerCase().replace(/\s+/g, '-'), name, type: 'text', width: 150 };
    updateDatabase(currentDb.id, { columns: JSON.stringify([...columns, newCol]) });
  };

  const removeColumn = (colId: string) => {
    if (!currentDb) return;
    if (!confirm("Remove this column?")) return;
    updateDatabase(currentDb.id, { columns: JSON.stringify(columns.filter(c => c.id !== colId)) });
  };

  const renameColumn = (colId: string) => {
    if (!currentDb) return;
    const col = columns.find(c => c.id === colId);
    if (!col) return;
    const name = prompt("New Column Name:", col.name);
    if (!name) return;
    updateDatabase(currentDb.id, { columns: JSON.stringify(columns.map(c => c.id === colId ? { ...c, name } : c)) });
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'text': return <AlignLeft size={14} />;
      case 'number': return <Hash size={14} />;
      case 'date': return <Calendar size={14} />;
      case 'select': return <CircleDot size={14} />;
      default: return <Type size={14} />;
    }
  };

  const getTaskProgress = (pageId: string) => {
    const subPages = pages.filter(p => p.parentId === pageId && !p.isTemplate);
    if (subPages.length === 0) return null;
    
    const statusCol = columns.find(c => c.type === 'select' && (c.name.toLowerCase() === 'status' || c.id === 'status'));
    const statusId = statusCol?.id || 'status';
    
    const completed = subPages.filter(p => {
      const props = JSON.parse(p.properties || '{}');
      const val = props[statusId]?.toLowerCase() || '';
      return val === 'done' || val === 'completed' || val === 'finished';
    }).length;
    
    return {
      total: subPages.length,
      completed,
      percentage: Math.round((completed / subPages.length) * 100)
    };
  };

  const statusCol = columns.find(c => c.type === 'select' && (c.name.toLowerCase() === 'status' || c.id === 'status'));
  const statuses = statusCol?.options || ['Todo', 'In Progress', 'Done'];

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-white relative overflow-hidden">
      <header className="h-auto min-h-16 py-2 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-8 bg-white sticky top-0 z-10 gap-2">
        <nav className="flex items-center text-sm font-medium text-slate-400 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <button onClick={onToggleSidebar} className="md:hidden mr-2 p-2 -ml-2 text-slate-600 hover:text-primary shrink-0">
            <Menu size={20} />
          </button>
          <select 
            className="bg-transparent text-slate-900 font-semibold outline-none cursor-pointer border-none hover:bg-slate-100 px-2 py-1 rounded transition-colors max-w-[120px] md:max-w-xs truncate shrink-0"
            value={currentDatabaseId || ''}
            onChange={(e) => {
              setCurrentDatabaseId(e.target.value);
              setCurrentParentId(null);
              setSelectedEntry(null);
            }}
          >
            {databases.map(db => (
              <option key={db.id} value={db.id}>{db.name}</option>
            ))}
          </select>
          <button 
            onClick={createDatabase}
            className="ml-2 p-1 text-slate-400 hover:text-primary hover:bg-slate-100 rounded transition-colors"
            title="New Database"
          >
            <Plus size={16} />
          </button>
          {currentDatabaseId && (
            <button 
              onClick={() => deleteDatabase(currentDatabaseId)}
              className="ml-1 p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded transition-colors"
              title="Delete Database"
            >
              <Trash2 size={16} />
            </button>
          )}

          {breadcrumbs.length > 0 && (
            <>
              <span className="mx-2 text-slate-300">/</span>
              <span 
                className="hover:text-slate-900 cursor-pointer transition-colors"
                onClick={() => setCurrentParentId(null)}
              >
                Root
              </span>
            </>
          )}

          {breadcrumbs.map(bc => (
            <React.Fragment key={bc.id}>
              <ChevronRight size={14} className="mx-1 text-slate-300 shrink-0" />
              <span 
                className="hover:text-slate-900 cursor-pointer transition-colors truncate max-w-[100px] md:max-w-[150px] shrink-0"
                onClick={() => setCurrentParentId(bc.id)}
              >
                {bc.title}
              </span>
            </React.Fragment>
          ))}
        </nav>
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center">
            <button onClick={importDatabase} className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded transition-colors" title="Import Database">
              <Upload size={18} />
            </button>
            <button onClick={exportDatabase} className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded transition-colors" title="Export Database">
              <Download size={18} />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-2"></div>
          </div>
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search entries..." 
              className="pl-10 pr-4 py-1.5 text-sm bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-primary w-full md:w-64 outline-none"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50/30">
        <div className="px-4 md:px-8 pt-6 md:pt-10 pb-4 md:pb-6 max-w-7xl mx-auto w-full">
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900 mb-2 truncate">
            {currentParentId ? breadcrumbs[breadcrumbs.length - 1]?.title : currentDb?.name || 'Database'}
          </h1>
          <p className="text-slate-500 max-w-2xl text-sm md:text-base">
            {currentParentId 
              ? 'Nested pages and tasks for this project.' 
              : 'A high-density structured view of tasks, updates, and notes.'}
          </p>
        </div>

        <div className="px-4 md:px-8 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between py-4 sticky top-0 bg-white/90 backdrop-blur-md z-10 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto border-b md:border-b-0 border-slate-100 pb-2 md:pb-0">
            <button 
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 text-sm font-semibold md:pb-4 md:-mb-4 transition-colors ${viewMode === 'table' ? 'md:border-b-2 md:border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ListIcon size={16} /> Table
            </button>
            <button 
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-2 text-sm font-semibold md:pb-4 md:-mb-4 transition-colors ${viewMode === 'board' ? 'md:border-b-2 md:border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid size={16} /> Board
            </button>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <button 
              onClick={() => setIsEditingColumns(!isEditingColumns)}
              className={`flex items-center gap-2 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg border transition-colors ${isEditingColumns ? 'bg-slate-100 border-slate-300 text-slate-900' : 'text-slate-600 hover:bg-slate-100 border-slate-200 bg-white'}`}
            >
              <Settings size={16} /> <span className="hidden md:inline">Columns</span>
            </button>
            
            <div className="relative group">
              <button 
                onClick={() => createPage(currentParentId)}
                className="bg-primary text-white px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1 md:gap-2 ml-2 hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus size={16} /> New Entry
              </button>
              
              {/* Templates Dropdown */}
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
                <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Templates</div>
                {templates.map(tpl => (
                  <button 
                    key={tpl.id}
                    onClick={() => createPage(currentParentId, tpl.id)}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileText size={14} className="text-slate-400" />
                    <span className="truncate">{tpl.title}</span>
                  </button>
                ))}
                <div className="border-t border-slate-100 my-1"></div>
                <button 
                  onClick={createTemplate}
                  className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-slate-50 flex items-center gap-2"
                >
                  <Plus size={14} />
                  <span>Create Template</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full">
          {viewMode === 'table' ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest min-w-[200px]">Title</th>
                    {columns.map(col => (
                      <th key={col.id} className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest group relative" style={{ width: col.width }}>
                        <div className="flex items-center gap-1.5">
                          {getIconForType(col.type)}
                          {col.name}
                          {isEditingColumns && (
                            <div className="flex items-center gap-1 ml-auto">
                              <button onClick={() => renameColumn(col.id)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><Edit2 size={12} /></button>
                              <button onClick={() => removeColumn(col.id)} className="p-1 hover:bg-slate-200 rounded text-red-500"><Trash2 size={12} /></button>
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                    {isEditingColumns && (
                      <th className="px-4 py-3 w-10">
                        <button onClick={addColumn} className="p-1 hover:bg-slate-200 rounded text-slate-500"><Plus size={14} /></button>
                      </th>
                    )}
                    {!isEditingColumns && <th className="px-4 py-3 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr><td colSpan={columns.length + 2} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                  ) : currentPages.length === 0 ? (
                    <tr><td colSpan={columns.length + 2} className="px-4 py-8 text-center text-slate-400">No entries found. Click "New Entry" to create one.</td></tr>
                  ) : (
                    currentPages.map((entry) => {
                      const props = JSON.parse(entry.properties || '{}');
                      const progress = getTaskProgress(entry.id);
                      return (
                        <tr 
                          key={entry.id} 
                          className="hover:bg-slate-50 transition-colors group cursor-pointer"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              <FileText size={16} className="text-slate-400" />
                              {entry.title}
                            </div>
                            {progress && (
                              <div className="mt-2 flex items-center gap-2 w-48">
                                <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${progress.percentage}%` }}></div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400">{progress.completed}/{progress.total}</span>
                              </div>
                            )}
                          </td>
                          {columns.map(col => (
                            <td key={col.id} className="px-4 py-4 text-sm text-slate-600 truncate">
                              {col.type === 'select' ? (
                                props[col.id] ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                                    {props[col.id]}
                                  </span>
                                ) : null
                              ) : (
                                props[col.id] || ''
                              )}
                            </td>
                          ))}
                          <td className="px-4 py-4 text-center">
                            <button 
                              onClick={(e) => { e.stopPropagation(); deletePage(entry.id); }}
                              className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-8 items-start min-h-[500px]">
              {statuses.map(status => {
                const columnPages = currentPages.filter(p => {
                  const props = JSON.parse(p.properties || '{}');
                  return props[statusCol?.id || 'status'] === status;
                });
                return (
                  <div key={status} className="flex-shrink-0 w-80 bg-slate-100/50 rounded-2xl p-4 border border-slate-200/60">
                    <div className="flex items-center justify-between mb-4 px-1">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        {status} 
                        <span className="bg-slate-200 text-slate-600 text-xs py-0.5 px-2 rounded-full font-semibold">{columnPages.length}</span>
                      </h3>
                      <button 
                        onClick={() => {
                          const initialProps = JSON.stringify({ [statusCol?.id || 'status']: status });
                          createPage(currentParentId, null, initialProps);
                        }}
                        className="text-slate-400 hover:text-primary transition-colors p-1 hover:bg-slate-200 rounded"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {columnPages.map(page => {
                        const props = JSON.parse(page.properties || '{}');
                        const progress = getTaskProgress(page.id);
                        return (
                          <div 
                            key={page.id} 
                            onClick={() => setSelectedEntry(page)}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-slate-900 leading-tight pr-4">{page.title}</h4>
                              <button 
                                onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {columns.filter(c => c.id !== statusCol?.id && props[c.id]).map(col => (
                                <span key={col.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-100 uppercase tracking-wider">
                                  {props[col.id]}
                                </span>
                              ))}
                            </div>

                            {progress && (
                              <div className="mt-4 pt-3 border-t border-slate-100">
                                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                  <span>Progress</span>
                                  <span>{progress.percentage}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress.percentage}%` }}></div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {columnPages.length === 0 && (
                        <div className="text-center py-8 text-sm text-slate-400 font-medium border-2 border-dashed border-slate-200 rounded-xl">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Side-peek Overlay */}
      {selectedEntry && (
        <>
          <div 
            className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] z-20 transition-opacity" 
            onClick={() => setSelectedEntry(null)}
          />
          <div className="absolute inset-y-0 right-0 w-full md:w-[600px] bg-white border-l border-slate-200 shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                {!selectedEntry.isTemplate && (
                  <button 
                    onClick={() => {
                      setCurrentParentId(selectedEntry.id);
                      setSelectedEntry(null);
                    }}
                    className="flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Maximize2 size={16} /> Open as Page
                  </button>
                )}
                {selectedEntry.isTemplate && (
                  <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded uppercase tracking-wider">Template</span>
                )}
              </div>
              <button onClick={() => setSelectedEntry(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
                <span className="text-sm font-bold">Close</span>
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 md:p-10 space-y-8 md:space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Palette size={24} />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Project Note</span>
                  </div>
                  <TextareaAutosize 
                    value={selectedEntry.title}
                    onChange={(e) => updatePage(selectedEntry.id, { title: e.target.value })}
                    className="text-2xl md:text-4xl font-black text-slate-900 leading-tight w-full outline-none bg-transparent placeholder-slate-300 resize-none"
                    placeholder="Untitled"
                    minRows={1}
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-100">
                  {columns.map(col => {
                    const props = JSON.parse(selectedEntry.properties || '{}');
                    return (
                      <div key={col.id} className="grid grid-cols-[140px_1fr] bg-white py-3 px-4">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          {getIconForType(col.type)} <span>{col.name}</span>
                        </div>
                        <div className="flex items-center">
                          {col.type === 'select' ? (
                            <select 
                              value={props[col.id] || ''}
                              onChange={(e) => {
                                const newProps = { ...props, [col.id]: e.target.value };
                                updatePage(selectedEntry.id, { properties: JSON.stringify(newProps) });
                              }}
                              className="px-2 py-1 rounded text-xs font-bold outline-none cursor-pointer bg-slate-100 text-slate-700"
                            >
                              <option value="">Empty</option>
                              {col.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              {!col.options?.includes(props[col.id]) && props[col.id] && <option value={props[col.id]}>{props[col.id]}</option>}
                            </select>
                          ) : (
                            <TextareaAutosize 
                              value={props[col.id] || ''}
                              onChange={(e) => {
                                const newProps = { ...props, [col.id]: e.target.value };
                                updatePage(selectedEntry.id, { properties: JSON.stringify(newProps) });
                              }}
                              className="text-sm text-slate-700 outline-none w-full bg-transparent resize-none py-1"
                              placeholder="Empty"
                              minRows={1}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-6">
                  <RichTextEditor 
                    content={selectedEntry.content || ''} 
                    onChange={(content) => updatePage(selectedEntry.id, { content })} 
                    attachments={attachments}
                    onAddAttachment={handleAddAttachment}
                    onRemoveAttachment={handleRemoveAttachment}
                  />
                  
                  {!selectedEntry.isTemplate && (
                    <div className="space-y-3 pt-6 border-t border-slate-100">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Sub-pages (Tasks)</h3>
                      <div className="space-y-2">
                        {pages.filter(p => p.parentId === selectedEntry.id).map(subPage => {
                          const subProps = JSON.parse(subPage.properties || '{}');
                          const statusId = statusCol?.id || 'status';
                          const isDone = subProps[statusId]?.toLowerCase() === 'done';
                          
                          return (
                            <div 
                              key={subPage.id}
                              className="flex items-center gap-3 group cursor-pointer p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all"
                              onClick={() => {
                                setSelectedEntry(subPage);
                              }}
                            >
                              <div onClick={(e) => {
                                e.stopPropagation();
                                const newProps = { ...subProps, [statusId]: isDone ? 'Todo' : 'Done' };
                                updatePage(subPage.id, { properties: JSON.stringify(newProps) });
                              }}>
                                {isDone ? <CheckSquare className="text-primary" size={18} /> : <Square className="text-slate-300" size={18} />}
                              </div>
                              <span className={`text-sm font-medium ${isDone ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{subPage.title}</span>
                            </div>
                          );
                        })}
                      </div>
                      <button 
                        onClick={() => createPage(selectedEntry.id)}
                        className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors mt-2"
                      >
                        <Plus size={16} /> Add Sub-page
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-8 py-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Last edited just now</span>
              <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-green-500"></span> Live Session</span>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
