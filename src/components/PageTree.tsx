import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { renderPropertyValue } from '../lib/utils';
import { apiFetch } from '../lib/api';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Page {
  id: string;
  title: string;
  parentId: string | null;
  databaseId: string | null;
  isTemplate: number;
}

interface PageTreeProps {
  pages: Page[];
  parentId: string | null;
  databaseId: string | null;
  onNavigate: (page: Page) => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
}

function PageItem({ page, pages, onNavigate, onRename, onDelete }: { page: Page, pages: Page[], onNavigate: (page: Page) => void, onRename: (id: string, newTitle: string) => void, onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleCreateSubpage = async () => {
    try {
      const title = prompt('Subpage title:', 'New Subpage');
      if (!title) return;
      await apiFetch('/api/pages', {
        method: 'POST',
        body: JSON.stringify({ 
          title, 
          content: '', 
          properties: JSON.stringify({}),
          parentId: page.id,
          databaseId: page.databaseId
        })
      });
      window.dispatchEvent(new CustomEvent('pages-changed'));
    } catch (error) {
      console.error('Failed to create subpage:', error);
    }
  };

  const handleDuplicate = async () => {
    try {
      await apiFetch(`/api/pages/${page.id}/duplicate`, { method: 'POST' });
      window.dispatchEvent(new CustomEvent('pages-changed'));
    } catch (error) {
      console.error('Failed to duplicate page:', error);
    }
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex flex-col">
          <div className="flex items-center justify-between group/page-item pr-2">
            <button
              onClick={() => onNavigate(page)}
              className="flex items-center gap-2 px-2 py-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors text-[11px] text-left truncate flex-1"
            >
              <FileText size={10} className="shrink-0" />
              <span className="truncate">{renderPropertyValue(page.title)}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="p-1 hover:bg-slate-200 rounded text-slate-400 opacity-0 group-hover/page-item:opacity-100 transition-opacity"
            >
              {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>
          </div>
          {expanded && (
            <div className="ml-4 flex flex-col gap-0.5 border-l border-slate-100 pl-2 mt-0.5">
              <PageTree pages={pages} parentId={page.id} databaseId={page.databaseId} onNavigate={onNavigate} onRename={onRename} onDelete={onDelete} />
            </div>
          )}
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="bg-white rounded-md shadow-lg border border-slate-200 p-1 min-w-[150px] z-50">
          <ContextMenu.Item onClick={handleCreateSubpage} className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded cursor-pointer">Create Subpage</ContextMenu.Item>
          <ContextMenu.Item onClick={handleDuplicate} className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded cursor-pointer">Duplicate</ContextMenu.Item>
          <ContextMenu.Separator className="h-px bg-slate-100 my-1" />
          <ContextMenu.Item onClick={() => onRename(page.id, prompt('New title:', page.title) || page.title)} className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded cursor-pointer">Rename</ContextMenu.Item>
          <ContextMenu.Item onClick={() => onDelete(page.id)} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded cursor-pointer">Delete</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export default function PageTree({ pages, parentId, databaseId, onNavigate, onRename, onDelete }: PageTreeProps) {
  const children = pages.filter(p => p.databaseId === databaseId && p.parentId === parentId && !p.isTemplate);

  return (
    <div className="flex flex-col gap-0.5">
      {children.map(page => (
        <PageItem key={page.id} page={page} pages={pages} onNavigate={onNavigate} onRename={onRename} onDelete={onDelete} />
      ))}
    </div>
  );
}
