import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize2, ExternalLink } from 'lucide-react';

interface SidePeekPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  onExpand?: () => void;
  onPopOut?: () => void;
}

const SidePeekPanel: React.FC<SidePeekPanelProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  title = "Page",
  onExpand,
  onPopOut
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-[60]"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full md:w-[600px] lg:w-[800px] bg-white shadow-2xl z-[70] flex flex-col border-l border-slate-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <button 
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
                <h2 className="font-bold text-slate-900 text-sm truncate max-w-[300px]">{title}</h2>
              </div>
              
              <div className="flex items-center gap-2">
                {onExpand && (
                  <button 
                    onClick={onExpand}
                    className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                    title="Open in full page"
                  >
                    <Maximize2 size={18} />
                  </button>
                )}
                {onPopOut && (
                  <button 
                    onClick={onPopOut}
                    className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                    title="Pop out window"
                  >
                    <ExternalLink size={18} />
                  </button>
                )}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SidePeekPanel;
