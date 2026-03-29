import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize2, ExternalLink } from 'lucide-react';

interface CenterPeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  onExpand?: () => void;
  onPopOut?: () => void;
}

const CenterPeekModal: React.FC<CenterPeekModalProps> = ({ 
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
          />
          
          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[90] pointer-events-none p-4 md:p-10">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-5xl h-full max-h-[90vh] bg-white shadow-2xl rounded-2xl flex flex-col border border-slate-200 pointer-events-auto overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <h2 className="font-bold text-slate-900 text-sm truncate max-w-[400px]">{title}</h2>
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
                  <button 
                    onClick={onClose}
                    className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CenterPeekModal;
