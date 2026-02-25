import React, { useState, useEffect } from 'react';
import { X, Check, Palette, Type } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLORS = [
  { name: 'Blue', value: '#135bec' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Slate', value: '#475569' },
];

const FONTS = [
  { name: 'Inter', value: '"Inter", ui-sans-serif, system-ui, sans-serif' },
  { name: 'Roboto', value: '"Roboto", ui-sans-serif, system-ui, sans-serif' },
  { name: 'Playfair Display', value: '"Playfair Display", ui-serif, Georgia, serif' },
  { name: 'Space Grotesk', value: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif' },
];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeColor, setActiveColor] = useState(COLORS[0].value);
  const [activeFont, setActiveFont] = useState(FONTS[0].value);

  useEffect(() => {
    const savedColor = localStorage.getItem('theme-color');
    const savedFont = localStorage.getItem('theme-font');
    if (savedColor) setActiveColor(savedColor);
    if (savedFont) setActiveFont(savedFont);
  }, [isOpen]);

  const handleColorChange = (color: string) => {
    setActiveColor(color);
    document.documentElement.style.setProperty('--color-primary', color);
    localStorage.setItem('theme-color', color);
  };

  const handleFontChange = (font: string) => {
    setActiveFont(font);
    document.documentElement.style.setProperty('--font-sans', font);
    localStorage.setItem('theme-font', font);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Settings</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Color Theme */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Palette size={18} className="text-slate-400" />
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Color Theme</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => handleColorChange(color.value)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${activeColor === color.value ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {activeColor === color.value && <Check size={16} className="text-white" />}
                </button>
              ))}
            </div>
          </section>

          {/* Typography */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Type size={18} className="text-slate-400" />
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Typography</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {FONTS.map((font) => (
                <button
                  key={font.name}
                  onClick={() => handleFontChange(font.value)}
                  className={`px-4 py-3 rounded-xl border text-left transition-colors ${activeFont === font.value ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}
                  style={{ fontFamily: font.value }}
                >
                  <span className="block font-medium">{font.name}</span>
                  <span className="text-xs opacity-70 mt-1 block">The quick brown fox</span>
                </button>
              ))}
            </div>
          </section>
        </div>
        
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
