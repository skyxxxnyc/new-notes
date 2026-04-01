import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, FileText, Calendar, Database, CheckSquare, Plus, X, Search, Settings, ChevronRight, ChevronDown, ChevronLeft, LogOut, Sparkles, Star, Lock, Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import PageTree from './PageTree';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

import * as ContextMenu from '@radix-ui/react-context-menu';

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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    favorites: true,
    private: true,
    shared: true,
    databases: true
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchDatabases();
    fetchPages().then(setPages);
    
    const handleChange = () => {
      fetchDatabases();
      fetchPages().then(setPages);
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
      const data = await apiFetch(`/api/pages`);
      return data;
    } catch (error) {
      console.error('Failed to fetch pages:', error);
      return [];
    }
  };

  const handleNavigate = (page: any) => {
    setCurrentView('database');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('navigate-page', { detail: { id: page.id, databaseId: page.databaseId, page } }));
    }, 50);
  };

  const handleDatabaseClick = (id: string) => {
    setCurrentView('database');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('navigate-database', { detail: { id } }));
    }, 50);
  };

  const handleCreateDatabase = async () => {
    try {
      const name = prompt('Database name:', 'New Database');
      if (!name) return;
      const data = await apiFetch('/api/databases', {
        method: 'POST',
        body: JSON.stringify({ name, icon: 'Database' })
      });
      fetchDatabases();
      handleDatabaseClick(data.id);
    } catch (error) {
      console.error('Failed to create database:', error);
    }
  };

  const handleCreatePage = async (isShared: boolean = false) => {
    try {
      const title = prompt('Page title:', 'New Page');
      if (!title) return;
      const data = await apiFetch('/api/pages', {
        method: 'POST',
        body: JSON.stringify({ 
          title, 
          content: '', 
          properties: JSON.stringify({ isShared }),
          isShared 
        })
      });
      window.dispatchEvent(new CustomEvent('pages-changed'));
      handleNavigate(data);
    } catch (error) {
      console.error('Failed to create page:', error);
    }
  };

  const handleRenameDatabase = async (id: string, currentName: string) => {
    const newName = prompt('New database name:', currentName);
    if (!newName || newName === currentName) return;
    try {
      await apiFetch(`/api/databases/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: newName })
      });
      fetchDatabases();
    } catch (error) {
      console.error('Failed to rename database:', error);
    }
  };

  const handleDeleteDatabase = async (id: string) => {
    if (!confirm('Are you sure you want to delete this database and all its pages?')) return;
    try {
      await apiFetch(`/api/databases/${id}`, { method: 'DELETE' });
      fetchDatabases();
      if (currentView === 'database') setCurrentView('dashboard');
    } catch (error) {
      console.error('Failed to delete database:', error);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard', action: () => setCurrentView('dashboard') },
    { id: 'notes', icon: FileText, label: 'All Notes', action: () => setCurrentView('notes') },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks', action: () => setCurrentView('tasks') },
    { id: 'calendar', icon: Calendar, label: 'Calendar', action: () => setCurrentView('calendar') },
    { id: 'agents', icon: Sparkles, label: 'AI Agents', action: onOpenAgents },
    { id: 'settings', icon: Settings, label: 'Settings', action: onOpenSettings },
  ];

  const handleRename = async (id: string, newTitle: string) => {
    try {
      await apiFetch(`/api/pages/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: newTitle })
      });
      window.dispatchEvent(new CustomEvent('pages-changed'));
    } catch (error) {
      console.error('Failed to rename page:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    try {
      await apiFetch(`/api/pages/${id}`, { method: 'DELETE' });
      window.dispatchEvent(new CustomEvent('pages-changed'));
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((p) => p.id === active.id);
        const newIndex = items.findIndex((p) => p.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      // TODO: Call API to persist reordering/reparenting
    }
  };

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} h-full flex-shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between p-4 transition-all duration-300 overflow-y-auto overflow-x-hidden relative group/sidebar`}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-6">
          {/* Navigation */}
          <nav className="flex flex-col gap-1">
            {navItems.map(item => (
              <button 
                key={item.id} 
                onClick={item.action} 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${currentView === item.id ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <item.icon size={18} />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Sections */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col">
              <div className="flex items-center justify-between group/section pr-2">
                <button onClick={() => toggleSection('databases')} className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider px-2 py-1 flex-1 text-left">
                  {expandedSections.databases ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Database size={12} /> Databases
                </button>
                {!isCollapsed && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCreateDatabase(); }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 opacity-0 group-hover/section:opacity-100 transition-opacity"
                    title="Create New Database"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
              {expandedSections.databases && (
                <div className="ml-6 flex flex-col gap-1">
                  {databases.map(db => (
                    <ContextMenu.Root key={db.id}>
                      <ContextMenu.Trigger asChild>
                        <button onClick={() => handleDatabaseClick(db.id)} className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 truncate text-left w-full hover:bg-slate-50 rounded">
                          {db.name}
                        </button>
                      </ContextMenu.Trigger>
                      <ContextMenu.Portal>
                        <ContextMenu.Content className="bg-white rounded-md shadow-lg border border-slate-200 p-1 min-w-[150px] z-50">
                          <ContextMenu.Item onClick={() => handleRenameDatabase(db.id, db.name)} className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded cursor-pointer">Rename</ContextMenu.Item>
                          <ContextMenu.Item onClick={() => handleDeleteDatabase(db.id)} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded cursor-pointer">Delete</ContextMenu.Item>
                        </ContextMenu.Content>
                      </ContextMenu.Portal>
                    </ContextMenu.Root>
                  ))}
                </div>
              )}
            </div>

            {/* Favorites, Private, Shared */}
            {['favorites', 'private', 'shared'].map(section => (
              <div key={section} className="flex flex-col">
                <div className="flex items-center justify-between group/section pr-2">
                  <button onClick={() => toggleSection(section)} className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider px-2 py-1 flex-1 text-left">
                    {expandedSections[section] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    {section === 'favorites' && <Star size={12} />}
                    {section === 'private' && <Lock size={12} />}
                    {section === 'shared' && <Users size={12} />}
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </button>
                  {!isCollapsed && section !== 'favorites' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleCreatePage(section === 'shared'); }}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 opacity-0 group-hover/section:opacity-100 transition-opacity"
                      title={`Create New ${section === 'shared' ? 'Shared' : 'Private'} Page`}
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>
                {expandedSections[section] && (
                  <div className="ml-6">
                    <SortableContext items={pages.filter(p => section === 'favorites' ? p.isFavorite : section === 'private' ? !p.isShared : p.isShared).map(p => p.id)} strategy={verticalListSortingStrategy}>
                      <PageTree pages={pages.filter(p => section === 'favorites' ? p.isFavorite : section === 'private' ? !p.isShared : p.isShared)} parentId={null} databaseId={null} onNavigate={handleNavigate} onRename={handleRename} onDelete={handleDelete} />
                    </SortableContext>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </DndContext>
      
      <div className="mt-auto pt-4 border-t border-slate-200">
        <button 
          onClick={() => document.documentElement.classList.toggle('dark')}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors text-sm w-full text-left"
        >
          <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-400 flex items-center justify-center overflow-hidden">
            <div className="w-1/2 h-full bg-slate-400" />
          </div>
          {!isCollapsed && <span>Toggle Theme</span>}
        </button>
        <button 
          onClick={onOpenSearch}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors text-sm w-full text-left"
        >
          <Search size={18} />
          {!isCollapsed && <span>Search</span>}
        </button>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors text-sm w-full text-left"
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
