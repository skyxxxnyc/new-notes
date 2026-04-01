import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type PromptState = {
  isOpen: boolean;
  message: string;
  defaultValue: string;
  resolve: (value: string | null) => void;
};

type ConfirmState = {
  isOpen: boolean;
  message: string;
  resolve: (value: boolean) => void;
};

type ToastType = 'success' | 'error' | 'info';

type ToastState = {
  id: string;
  message: string;
  type: ToastType;
};

export const GlobalModals = () => {
  const [promptState, setPromptState] = useState<PromptState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [toasts, setToasts] = useState<ToastState[]>([]);

  useEffect(() => {
    // @ts-ignore
    window.appPrompt = (message: string, defaultValue: string = '') => {
      return new Promise<string | null>((resolve) => {
        setInputValue(defaultValue);
        setPromptState({ isOpen: true, message, defaultValue, resolve });
      });
    };

    // @ts-ignore
    window.appConfirm = (message: string) => {
      return new Promise<boolean>((resolve) => {
        setConfirmState({ isOpen: true, message, resolve });
      });
    };

    // @ts-ignore
    window.appAlert = (message: string) => {
      return new Promise<void>((resolve) => {
        setConfirmState({ isOpen: true, message, resolve: () => resolve() });
      });
    };

    // @ts-ignore
    window.appToast = (message: string, type: ToastType = 'info') => {
      const id = Math.random().toString(36).substring(7);
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };
  }, []);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promptState) {
      promptState.resolve(inputValue);
      setPromptState(null);
    }
  };

  const handlePromptCancel = () => {
    if (promptState) {
      promptState.resolve(null);
      setPromptState(null);
    }
  };

  const handleConfirmSubmit = () => {
    if (confirmState) {
      confirmState.resolve(true);
      setConfirmState(null);
    }
  };

  const handleConfirmCancel = () => {
    if (confirmState) {
      confirmState.resolve(false);
      setConfirmState(null);
    }
  };

  return (
    <>
      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg pointer-events-auto animate-in slide-in-from-bottom-5 fade-in duration-300 ${
              toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
              toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
              'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle size={18} className="text-green-500" />}
            {toast.type === 'error' && <AlertCircle size={18} className="text-red-500" />}
            {toast.type === 'info' && <Info size={18} className="text-blue-500" />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-2 p-1 hover:bg-black/5 rounded-md transition-colors"
            >
              <X size={14} className="opacity-50" />
            </button>
          </div>
        ))}
      </div>

      {/* Prompt Modal */}
      {promptState?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{promptState.message}</h3>
            <form onSubmit={handlePromptSubmit}>
              <input
                type="text"
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-6"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handlePromptCancel}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  OK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmState?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-6">{confirmState.message}</h3>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
