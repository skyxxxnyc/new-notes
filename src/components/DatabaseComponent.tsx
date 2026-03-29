import React, { useState, useEffect } from 'react';
import { 
  Plus, FileText, Trash2, Edit2, List as ListIcon, LayoutGrid, 
  Settings, Type, Hash, AlignLeft, Calendar, CircleDot, ChevronRight, CheckSquare, Link, ArrowUpDown, Square,
  Sparkles, Wand2, Loader2
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { safeJsonParse, renderPropertyValue, cn } from '../lib/utils';
import { generateAutofillValue } from '../services/aiService';

interface Column {
  id: string;
  name: string;
  type: 'text' | 'select' | 'date' | 'number' | 'checkbox' | 'url';
  width: number;
  options?: string[];
  visibleInBoard?: boolean;
  ai_autofill?: {
    prompt: string;
    source_properties: string[];
    trigger: "manual" | "on_create" | "on_update";
  };
}

interface Page {
  id: string;
  title: string;
  content: string;
  properties: string;
  parentId: string | null;
  databaseId: string;
  isTemplate: number;
}

interface Database {
  id: string;
  name: string;
  icon: string;
  columns: string;
}

interface DatabaseComponentProps {
  databaseId: string;
  onSelectPage?: (page: Page) => void;
  isInline?: boolean;
}

export default function DatabaseComponent({ databaseId, onSelectPage, isInline = false }: DatabaseComponentProps) {
  const [database, setDatabase] = useState<Database | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const [isEditingColumns, setIsEditingColumns] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filterText, setFilterText] = useState('');
  const [isAutofilling, setIsAutofilling] = useState<Record<string, boolean>>({});

  const updateDatabase = async (updates: Partial<Database>) => {
    if (!database) return;
    setDatabase({ ...database, ...updates });
    try {
      await apiFetch(`/api/databases/${database.id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      window.dispatchEvent(new CustomEvent('databases-changed'));
    } catch (error) {
      console.error('Failed to update database:', error);
      fetchData();
    }
  };

  const addColumn = async () => {
    if (!database) return;
    const name = await window.appPrompt("Column Name:");
    if (!name) return;
    const columns: Column[] = safeJsonParse<Column[]>(database.columns, []);
    const newCol: Column = { id: name.toLowerCase().replace(/\s+/g, '-'), name, type: 'text', width: 150, visibleInBoard: true };
    updateDatabase({ columns: JSON.stringify([...columns, newCol]) });
  };

  const toggleColumnVisibilityInBoard = (colId: string) => {
    const updatedColumns = columns.map(col => 
      col.id === colId ? { ...col, visibleInBoard: !col.visibleInBoard } : col
    );
    updateDatabase({ columns: JSON.stringify(updatedColumns) });
  };

  const removeColumn = async (colId: string) => {
    if (!database) return;
    if (!await window.appConfirm("Remove this column?")) return;
    const columns: Column[] = safeJsonParse<Column[]>(database.columns, []);
    updateDatabase({ columns: JSON.stringify(columns.filter(c => c.id !== colId)) });
  };

  const renameColumn = async (colId: string) => {
    if (!database) return;
    const columns: Column[] = safeJsonParse<Column[]>(database.columns, []);
    const col = columns.find(c => c.id === colId);
    if (!col) return;
    const name = await window.appPrompt("New Column Name:", col.name);
    if (!name) return;
    updateDatabase({ columns: JSON.stringify(columns.map(c => c.id === colId ? { ...c, name } : c)) });
  };

  const changeColumnType = (colId: string, type: Column['type']) => {
    if (!database) return;
    const columns: Column[] = safeJsonParse<Column[]>(database.columns, []);
    updateDatabase({ columns: JSON.stringify(columns.map(c => c.id === colId ? { ...c, type } : c)) });
  };

  const configureAutofill = async (colId: string) => {
    if (!database) return;
    const columns: Column[] = safeJsonParse<Column[]>(database.columns, []);
    const col = columns.find(c => c.id === colId);
    if (!col) return;

    const prompt = await window.appPrompt("AI Autofill Prompt (use prop('Name') to reference properties):", col.ai_autofill?.prompt || "");
    if (prompt === null) return;

    if (prompt === "") {
      updateDatabase({ columns: JSON.stringify(columns.map(c => c.id === colId ? { ...c, ai_autofill: undefined } : c)) });
      return;
    }

    const trigger = await window.appPrompt("Trigger (manual, on_create, on_update):", col.ai_autofill?.trigger || "manual") as any;
    
    updateDatabase({ columns: JSON.stringify(columns.map(c => c.id === colId ? { 
      ...c, 
      ai_autofill: { 
        prompt, 
        trigger: trigger || "manual",
        source_properties: [] // We could parse this from prompt if needed
      } 
    } : c)) });
  };

  const runAutofill = async (pageId: string, colId: string) => {
    if (!database) return;
    const col = columns.find(c => c.id === colId);
    if (!col || !col.ai_autofill) return;

    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    const key = `${pageId}-${colId}`;
    setIsAutofilling(prev => ({ ...prev, [key]: true }));

    try {
      const props = safeJsonParse<Record<string, any>>(page.properties, {});
      const context = {
        title: page.title,
        content: page.content,
        ...props
      };

      const result = await generateAutofillValue(col.ai_autofill.prompt, context);
      
      if (result) {
        const updatedProps = { ...props, [colId]: result };
        await apiFetch(`/api/pages/${pageId}`, {
          method: 'PUT',
          body: JSON.stringify({ properties: JSON.stringify(updatedProps) })
        });
        
        setPages(prev => prev.map(p => p.id === pageId ? { ...p, properties: JSON.stringify(updatedProps) } : p));
        window.dispatchEvent(new CustomEvent('pages-changed'));
      }
    } catch (error) {
      console.error('Autofill failed:', error);
    } finally {
      setIsAutofilling(prev => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    fetchData();
    
    const handlePagesChanged = () => fetchData();
    window.addEventListener('pages-changed', handlePagesChanged);
    return () => window.removeEventListener('pages-changed', handlePagesChanged);
  }, [databaseId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dbs, pagesData] = await Promise.all([
        apiFetch(`/api/databases`),
        apiFetch(`/api/pages?databaseId=${databaseId}`)
      ]);
      const db = dbs.find((d: any) => d.id === databaseId);
      
      setDatabase(db);
      setPages(pagesData);
    } catch (error) {
      console.error('Failed to fetch database data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createPage = async (initialProps = '{}') => {
    try {
      const newPage = await apiFetch('/api/pages', {
        method: 'POST',
        body: JSON.stringify({ 
          title: 'Untitled', 
          content: '', 
          properties: initialProps, 
          databaseId 
        })
      });
      setPages([...pages, newPage]);
      window.dispatchEvent(new CustomEvent('pages-changed'));
      if (onSelectPage) onSelectPage(newPage);
    } catch (error) {
      console.error('Failed to create page:', error);
    }
  };

  const deletePage = async (id: string) => {
    try {
      await apiFetch(`/api/pages/${id}`, { method: 'DELETE' });
      setPages(pages.filter(p => p.id !== id));
      window.dispatchEvent(new CustomEvent('pages-changed'));
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  const handlePageClick = (page: Page) => {
    if (onSelectPage) {
      onSelectPage(page);
    } else {
      // Default navigation behavior
      window.dispatchEvent(new CustomEvent('navigate-page', { 
        detail: { 
          id: page.id, 
          databaseId: page.databaseId, 
          page 
        } 
      }));
    }
  };

  const renameDatabase = async () => {
    if (!database) return;
    const name = await window.appPrompt("New Database Name:", database.name);
    if (!name) return;
    updateDatabase({ name });
  };

  if (isLoading) return <div className="p-8 text-center text-slate-400 text-sm">Loading database...</div>;
  if (!database) return <div className="p-8 text-center text-red-400 text-sm">Database not found</div>;

  const columns: Column[] = safeJsonParse<Column[]>(database.columns, []);
  const currentPages = pages.filter(p => !p.isTemplate);
  
  const sortedAndFilteredPages = React.useMemo(() => {
    let result = [...currentPages];
    
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      result = result.filter(p => {
        if (p.title.toLowerCase().includes(lowerFilter)) return true;
        const props = safeJsonParse<Record<string, any>>(p.properties, {});
        return Object.values(props).some(v => String(v).toLowerCase().includes(lowerFilter));
      });
    }

    if (sortConfig !== null) {
      result.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === 'title') {
          aValue = a.title;
          bValue = b.title;
        } else {
          const aProps = safeJsonParse<Record<string, any>>(a.properties, {});
          const bProps = safeJsonParse<Record<string, any>>(b.properties, {});
          aValue = aProps[sortConfig.key] || '';
          bValue = bProps[sortConfig.key] || '';
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [currentPages, sortConfig, filterText]);

  const statusCol = columns.find(c => c.type === 'select' && (c.name.toLowerCase() === 'status' || c.id === 'status'));
  const statuses = statusCol?.options || ['Todo', 'In Progress', 'Done'];

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'text': return <AlignLeft size={14} />;
      case 'number': return <Hash size={14} />;
      case 'date': return <Calendar size={14} />;
      case 'select': return <CircleDot size={14} />;
      case 'checkbox': return <CheckSquare size={14} />;
      case 'url': return <Link size={14} />;
      default: return <Type size={14} />;
    }
  };

  return (
    <div className={`flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${isInline ? 'my-4' : ''}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <h3 
            className="font-bold text-slate-900 text-sm cursor-pointer hover:text-primary transition-colors"
            onClick={renameDatabase}
          >
            {database.name}
          </h3>
          <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5">
            <button 
              onClick={() => setViewMode('table')}
              className={`p-1 rounded transition-colors ${viewMode === 'table' ? 'bg-slate-100 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ListIcon size={14} />
            </button>
            <button 
              onClick={() => setViewMode('board')}
              className={`p-1 rounded transition-colors ${viewMode === 'board' ? 'bg-slate-100 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
          <button 
            onClick={() => setIsEditingColumns(!isEditingColumns)}
            className={`p-1.5 rounded transition-colors ${isEditingColumns ? 'bg-slate-100 text-slate-900 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            title="Edit Columns"
          >
            <Settings size={14} />
          </button>
        </div>
        <button 
          onClick={() => createPage()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> New
        </button>
      </div>

      <div className="overflow-x-auto">
        {viewMode === 'table' ? (
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-100">
                <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span 
                    className="cursor-pointer hover:text-primary transition-colors flex items-center gap-1"
                    onClick={() => handleSort('title')}
                  >
                    Title
                    {sortConfig?.key === 'title' && (
                      <ArrowUpDown size={10} className={sortConfig.direction === 'desc' ? 'rotate-180' : ''} />
                    )}
                  </span>
                </th>
                {columns.map(col => (
                  <th key={col.id} className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider group relative" style={{ width: col.width }}>
                    <div className="flex items-center gap-1.5">
                      {getIconForType(col.type)}
                      <span 
                        className="cursor-pointer hover:text-primary transition-colors flex items-center gap-1"
                        onClick={() => handleSort(col.id)}
                      >
                        {col.name}
                        {sortConfig?.key === col.id && (
                          <ArrowUpDown size={10} className={sortConfig.direction === 'desc' ? 'rotate-180' : ''} />
                        )}
                      </span>
                      {isEditingColumns && (
                        <div className="flex items-center gap-1 ml-auto">
                          <select 
                            className="text-[9px] bg-slate-100 border-none rounded px-1 py-0.5 outline-none cursor-pointer"
                            value={col.type}
                            onChange={(e) => changeColumnType(col.id, e.target.value as Column['type'])}
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="select">Select</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="url">URL</option>
                          </select>
                          <button 
                            onClick={() => toggleColumnVisibilityInBoard(col.id)} 
                            className={`p-0.5 rounded ${col.visibleInBoard !== false ? 'bg-primary text-white' : 'hover:bg-slate-200 text-slate-500'}`}
                            title="Toggle visibility in board view"
                          >
                            <LayoutGrid size={10} />
                          </button>
                          <button onClick={() => renameColumn(col.id)} className="p-0.5 hover:bg-slate-200 rounded text-slate-500"><Edit2 size={10} /></button>
                          <button onClick={() => configureAutofill(col.id)} className={cn("p-0.5 rounded transition-colors", col.ai_autofill ? "bg-primary/10 text-primary" : "hover:bg-slate-200 text-slate-500")} title="Configure AI Autofill"><Sparkles size={10} /></button>
                          <button onClick={() => removeColumn(col.id)} className="p-0.5 hover:bg-slate-200 rounded text-red-500"><Trash2 size={10} /></button>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                {isEditingColumns && (
                  <th className="px-4 py-2 w-10">
                    <button onClick={addColumn} className="p-1 hover:bg-slate-200 rounded text-slate-500"><Plus size={12} /></button>
                  </th>
                )}
                {!isEditingColumns && <th className="px-4 py-2 w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentPages.map(page => {
                const props = safeJsonParse<Record<string, any>>(page.properties, {});
                return (
                  <tr 
                    key={page.id} 
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => handlePageClick(page)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" />
                        {renderPropertyValue(page.title)}
                      </div>
                    </td>
                    {columns.map(col => (
                      <td key={col.id} className="px-4 py-3 text-xs text-slate-600 truncate group/cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 truncate">
                            {col.type === 'select' ? (
                              props[col.id] ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                                  {renderPropertyValue(props[col.id])}
                                </span>
                              ) : null
                            ) : col.type === 'checkbox' ? (
                              <div className="flex items-center">
                                {props[col.id] === 'true' ? <CheckSquare size={14} className="text-primary" /> : <Square size={14} className="text-slate-300" />}
                              </div>
                            ) : col.type === 'url' ? (
                              props[col.id] ? (
                                <a 
                                  href={String(props[col.id]).startsWith('http') ? props[col.id] : `https://${props[col.id]}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline truncate block"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {renderPropertyValue(props[col.id])}
                                </a>
                              ) : null
                            ) : (
                              renderPropertyValue(props[col.id]) || ''
                            )}
                          </div>
                          {col.ai_autofill && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); runAutofill(page.id, col.id); }}
                              disabled={isAutofilling[`${page.id}-${col.id}`]}
                              className={cn(
                                "p-1 rounded opacity-0 group-hover/cell:opacity-100 transition-all",
                                isAutofilling[`${page.id}-${col.id}`] ? "text-primary animate-pulse" : "text-slate-400 hover:text-primary hover:bg-primary/5"
                              )}
                              title="Run AI Autofill"
                            >
                              {isAutofilling[`${page.id}-${col.id}`] ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            </button>
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex gap-4 p-4 overflow-x-auto min-h-[300px] bg-slate-50/30">
            {statuses.map(status => {
              const columnPages = currentPages.filter(p => {
                const props = safeJsonParse<Record<string, any>>(p.properties, {});
                return renderPropertyValue(props[statusCol?.id || 'status']) === renderPropertyValue(status);
              });
              return (
                <div key={renderPropertyValue(status)} className="flex-shrink-0 w-64 flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      {renderPropertyValue(status)}
                      <span className="bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full text-[9px]">{columnPages.length}</span>
                    </h4>
                  </div>
                  {columnPages.map(page => {
                    const props = safeJsonParse<Record<string, any>>(page.properties, {});
                    return (
                      <div 
                        key={page.id}
                        onClick={() => handlePageClick(page)}
                        className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="text-xs font-bold text-slate-900 leading-tight">{renderPropertyValue(page.title)}</h5>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {columns.filter(c => c.id !== statusCol?.id && props[c.id] && (c.visibleInBoard !== false)).map(col => (
                            <span key={col.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-100 uppercase tracking-wider">
                              {col.type === 'checkbox' ? (
                                props[col.id] === 'true' ? <CheckSquare size={10} className="text-primary" /> : <Square size={10} className="text-slate-300" />
                              ) : col.type === 'url' ? (
                                <span className="truncate max-w-[100px]">{renderPropertyValue(props[col.id])}</span>
                              ) : (
                                renderPropertyValue(props[col.id])
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <button 
                    onClick={() => createPage(JSON.stringify({ [statusCol?.id || 'status']: status }))}
                    className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-slate-400 hover:text-primary hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200"
                  >
                    <Plus size={12} /> New
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
