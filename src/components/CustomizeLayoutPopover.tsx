import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings2, 
  Eye, 
  EyeOff, 
  GripVertical, 
  Type, 
  ImageIcon, 
  MessageSquare, 
  Link2, 
  PanelRight, 
  Maximize2, 
  ArrowUpRight, 
  ExternalLink,
  X
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { useLayout, LayoutMode, PropertyConfig, PropertyVisibility } from '../contexts/LayoutContext';

interface CustomizeLayoutPopoverProps {
  databaseId: string;
  columns: { id: string; name: string; type: string }[];
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const Toggle: React.FC<{ 
  checked: boolean; 
  onChange: (checked: boolean) => void;
  label?: string;
}> = ({ checked, onChange, label }) => (
  <button 
    onClick={() => onChange(!checked)}
    className="flex items-center justify-between w-full group cursor-pointer"
  >
    {label && <span className="text-sm text-slate-600">{label}</span>}
    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-primary' : 'bg-slate-200'}`}>
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`}
      />
    </div>
  </button>
);

const CustomizeLayoutPopover: React.FC<CustomizeLayoutPopoverProps> = ({ 
  databaseId, 
  columns, 
  onClose,
  triggerRef
}) => {
  const { getLayoutConfig, updateLayoutConfig, updatePropertyConfig } = useLayout();
  const config = getLayoutConfig(databaseId);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initialize properties if empty
  useEffect(() => {
    if (config.properties.length === 0 && columns.length > 0) {
      const initialProps: PropertyConfig[] = columns.map(col => ({
        id: col.id,
        visibility: 'show'
      }));
      updatePropertyConfig(databaseId, initialProps);
    }
  }, [databaseId, columns, config.properties.length]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, triggerRef]);

  // Handle Esc key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const modes: { id: LayoutMode; icon: any; label: string }[] = [
    { id: 'side-peek', icon: PanelRight, label: 'Side Peek' },
    { id: 'center-peek', icon: Maximize2, label: 'Center Peek' },
    { id: 'full-page', icon: ArrowUpRight, label: 'Full Page' },
    { id: 'pop-out', icon: ExternalLink, label: 'Pop-out' },
  ];

  const visibilityOptions: { value: PropertyVisibility; label: string; icon: any }[] = [
    { value: 'show', label: 'Show', icon: Eye },
    { value: 'hide', label: 'Hide', icon: EyeOff },
    { value: 'always-show', label: 'Always show', icon: Eye },
  ];

  const handleReorder = (newOrder: string[]) => {
    const reorderedProps = newOrder.map(id => {
      const existing = config.properties.find(p => p.id === id);
      return existing || { id, visibility: 'show' as PropertyVisibility };
    });
    updatePropertyConfig(databaseId, reorderedProps);
  };

  const toggleVisibility = (propId: string) => {
    const newProps = config.properties.map(p => {
      if (p.id === propId) {
        const nextVisibility: Record<PropertyVisibility, PropertyVisibility> = {
          'show': 'hide',
          'hide': 'always-show',
          'always-show': 'show'
        };
        return { ...p, visibility: nextVisibility[p.visibility] };
      }
      return p;
    });
    updatePropertyConfig(databaseId, newProps);
  };

  const propertyList = config.properties.length > 0 
    ? config.properties 
    : columns.map(c => ({ id: c.id, visibility: 'show' as PropertyVisibility }));

  return (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden flex flex-col"
      style={{ maxHeight: '85vh' }}
    >
      <div className="p-4 flex items-center justify-between border-bottom border-slate-100">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Settings2 size={16} className="text-slate-400" />
          Customize Layout
        </h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100">
          <X size={16} />
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {/* Section 1: Layout Mode */}
        <div className="p-4 border-bottom border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Layout</span>
          <div className="grid grid-cols-4 gap-2">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => updateLayoutConfig(databaseId, { mode: mode.id })}
                className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-all border ${
                  config.mode === mode.id
                    ? 'bg-primary/5 border-primary text-primary shadow-sm'
                    : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <mode.icon size={20} />
                <span className="text-[10px] font-medium text-center leading-tight">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Properties */}
        <div className="p-4 border-bottom border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Properties</span>
          <div className="max-height-[280px] overflow-y-auto pr-1 -mr-1">
            <Reorder.Group 
              axis="y" 
              values={propertyList.map(p => p.id)} 
              onReorder={handleReorder}
              className="space-y-1"
            >
              {propertyList.map((prop) => {
                const col = columns.find(c => c.id === prop.id);
                if (!col) return null;
                
                return (
                  <Reorder.Item 
                    key={prop.id} 
                    value={prop.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 group transition-colors"
                  >
                    <GripVertical size={14} className="text-slate-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-xs text-slate-700 flex-1 truncate">{col.name}</span>
                    <button 
                      onClick={() => toggleVisibility(prop.id)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                        prop.visibility === 'show' ? 'text-primary bg-primary/5' :
                        prop.visibility === 'always-show' ? 'text-green-600 bg-green-50' :
                        'text-slate-400 bg-slate-100'
                      }`}
                    >
                      {prop.visibility === 'hide' ? <EyeOff size={12} /> : <Eye size={12} />}
                      {prop.visibility === 'show' ? 'Show' : prop.visibility === 'always-show' ? 'Always show' : 'Hide'}
                    </button>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          </div>
        </div>

        {/* Section 3: Page Header */}
        <div className="p-4 border-bottom border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Page setup</span>
          <div className="space-y-4">
            <Toggle 
              checked={config.showHeaderIcon} 
              onChange={(val) => updateLayoutConfig(databaseId, { showHeaderIcon: val })}
              label="Show page icon"
            />
            <Toggle 
              checked={config.showCoverImage} 
              onChange={(val) => updateLayoutConfig(databaseId, { showCoverImage: val })}
              label="Show cover image"
            />
            <Toggle 
              checked={config.showBacklinks} 
              onChange={(val) => updateLayoutConfig(databaseId, { showBacklinks: val })}
              label="Show backlinks"
            />
            <Toggle 
              checked={config.showComments} 
              onChange={(val) => updateLayoutConfig(databaseId, { showComments: val })}
              label="Show comments"
            />
          </div>
        </div>

        {/* Section 4: Content Width */}
        <div className="p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Width</span>
          <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => updateLayoutConfig(databaseId, { fullWidth: false })}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                !config.fullWidth 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Default
            </button>
            <button
              onClick={() => updateLayoutConfig(databaseId, { fullWidth: true })}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                config.fullWidth 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Full width
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CustomizeLayoutPopover;
