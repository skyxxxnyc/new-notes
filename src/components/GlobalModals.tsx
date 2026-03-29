import React, { useState, useEffect } from 'react';

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

export const GlobalModals = () => {
  const [promptState, setPromptState] = useState<PromptState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [inputValue, setInputValue] = useState('');

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
