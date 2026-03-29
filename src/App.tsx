/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import NotesView from './components/NotesView';
import TasksView from './components/TasksView';
import CalendarView from './components/CalendarView';
import DatabaseView from './components/DatabaseView';
import FocusMode from './components/FocusMode';
import GlobalSearch from './components/GlobalSearch';
import SettingsModal from './components/SettingsModal';
import { GlobalModals } from './components/GlobalModals';
import { Loader2 } from 'lucide-react';
import { LayoutProvider } from './contexts/LayoutContext';
import PageDetailView from './components/PageDetailView';
import ErrorBoundary from './components/ErrorBoundary';
import AiAgentPanel from './components/AiAgentPanel';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      
      // Handle initial route for pop-out windows
      const path = window.location.pathname;
      if (path.startsWith('/page/')) {
        const id = path.split('/')[2];
        if (id) {
          setCurrentView('page');
          setCurrentPageId(id);
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Initialize theme
    const savedColor = localStorage.getItem('theme-color');
    const savedFont = localStorage.getItem('theme-font');
    if (savedColor) document.documentElement.style.setProperty('--color-primary', savedColor);
    if (savedFont) document.documentElement.style.setProperty('--font-sans', savedFont);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsAgentPanelOpen(prev => !prev);
      }
    };

    const handleNavigateFull = (e: any) => {
      setCurrentView('page');
      setCurrentPageId(e.detail.id);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('navigate-page-full', handleNavigateFull);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('navigate-page-full', handleNavigateFull);
    };
  }, []);

  const handleNavigate = (type: string, id: string, parentId?: string, item?: any) => {
    setIsSearchOpen(false);
    if (type === 'dashboard') {
      setCurrentView('dashboard');
      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-dashboard', { detail: { id } })), 100);
    } else if (type === 'database') {
      setCurrentView('database');
      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-database', { detail: { id } })), 100);
    } else if (type === 'page') {
      setCurrentView('database');
      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-page', { detail: { id, databaseId: parentId, page: item } })), 100);
    } else if (type === 'note') {
      setCurrentView('notes');
      setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-note', { detail: { id, note: item } })), 100);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (isFocusMode) {
    return <FocusMode onExit={() => setIsFocusMode(false)} />;
  }

  return (
    <ErrorBoundary>
      <LayoutProvider>
        <div className="flex h-screen w-full overflow-hidden bg-background-light relative">
          {/* Mobile Sidebar Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarCollapsed ? 'md:w-16' : 'md:w-64'} ${currentView === 'page' ? 'hidden md:flex' : ''}`}>
            <Sidebar 
              currentView={currentView} 
              setCurrentView={(v) => { setCurrentView(v); setIsSidebarOpen(false); }} 
              onOpenSearch={() => setIsSearchOpen(true)} 
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenAgents={() => setIsAgentPanelOpen(true)}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
            />
          </div>
          
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
            {currentView === 'dashboard' && <DashboardView onToggleSidebar={() => setIsSidebarOpen(true)} />}
            {currentView === 'notes' && <NotesView onEnterFocus={() => setIsFocusMode(true)} onToggleSidebar={() => setIsSidebarOpen(true)} />}
            {currentView === 'tasks' && <TasksView onToggleSidebar={() => setIsSidebarOpen(true)} />}
            {currentView === 'calendar' && <CalendarView onToggleSidebar={() => setIsSidebarOpen(true)} />}
            {currentView === 'database' && <DatabaseView onToggleSidebar={() => setIsSidebarOpen(true)} />}
            {currentView === 'page' && currentPageId && (
              <PageDetailView 
                pageId={currentPageId} 
                onBack={() => setCurrentView('database')} 
              />
            )}
          </div>

          {isAgentPanelOpen && (
            <div className="fixed inset-y-0 right-0 z-[60] flex">
              <div 
                className="fixed inset-0 bg-black/5 backdrop-blur-[1px]" 
                onClick={() => setIsAgentPanelOpen(false)}
              />
              <AiAgentPanel onClose={() => setIsAgentPanelOpen(false)} />
            </div>
          )}

        <GlobalSearch 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
          onNavigate={handleNavigate} 
        />

        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
        
        <GlobalModals />
      </div>
      </LayoutProvider>
    </ErrorBoundary>
  );
}
