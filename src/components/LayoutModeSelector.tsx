import React from 'react';
import { PanelRight, Maximize2, ArrowUpRight, ExternalLink } from 'lucide-react';
import { useLayout, LayoutMode } from '../contexts/LayoutContext';

interface LayoutModeSelectorProps {
  databaseId: string;
}

const LayoutModeSelector: React.FC<LayoutModeSelectorProps> = ({ databaseId }) => {
  const { getLayoutConfig, updateLayoutMode } = useLayout();
  const config = getLayoutConfig(databaseId);

  const modes: { id: LayoutMode; icon: any; label: string }[] = [
    { id: 'side-peek', icon: PanelRight, label: 'Side Peek' },
    { id: 'center-peek', icon: Maximize2, label: 'Center Peek' },
    { id: 'full-page', icon: ArrowUpRight, label: 'Full Page' },
    { id: 'pop-out', icon: ExternalLink, label: 'Pop-out' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => updateLayoutMode(databaseId, mode.id)}
          className={`p-2 rounded-md transition-all flex items-center gap-2 ${
            config.mode === mode.id
              ? 'bg-white text-primary shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200 border border-transparent'
          }`}
          title={mode.label}
        >
          <mode.icon size={18} />
          <span className="text-xs font-medium hidden lg:inline">{mode.label}</span>
        </button>
      ))}
    </div>
  );
};

export default LayoutModeSelector;
