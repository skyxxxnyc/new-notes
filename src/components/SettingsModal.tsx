import React, { useState, useEffect } from 'react';
import { X, Check, Palette, Type, Database, Search, Loader2, FileText, Key } from 'lucide-react';
import { searchNotion, importNotionDatabase, importNotionPage, saveNotionToken, getNotionToken } from '../services/notionService';
import AgentManagement from './AgentManagement';
import { cn } from '../lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'settings' | 'agents';
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

export default function SettingsModal({ isOpen, onClose, initialTab = 'settings' }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'agents'>(initialTab);
  const [activeColor, setActiveColor] = useState(COLORS[0].value);
  const [activeFont, setActiveFont] = useState(FONTS[0].value);
  const [notionSearchQuery, setNotionSearchQuery] = useState('');
  const [notionResults, setNotionResults] = useState<any[]>([]);
  const [isSearchingNotion, setIsSearchingNotion] = useState(false);
  const [isImporting, setIsImporting] = useState<string | null>(null);
  const [notionTokenInput, setNotionTokenInput] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const savedColor = localStorage.getItem('theme-color');
    const savedFont = localStorage.getItem('theme-font');
    if (savedColor) setActiveColor(savedColor);
    if (savedFont) setActiveFont(savedFont);
    
    if (isOpen) {
      // Try to fetch existing token status
      getNotionToken()
        .then(() => setTokenSaved(true))
        .catch(() => setTokenSaved(false));
    }
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

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notionTokenInput.trim()) return;
    
    setIsSavingToken(true);
    setTokenError(null);
    try {
      await saveNotionToken(notionTokenInput.trim());
      setTokenSaved(true);
      setNotionTokenInput('');
      alert('Notion token saved successfully!');
    } catch (error: any) {
      console.error('Failed to save Notion token:', error);
      setTokenError(error.message || 'Failed to save token');
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleNotionSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearchingNotion(true);
    try {
      const results = await searchNotion(notionSearchQuery);
      setNotionResults(results);
    } catch (error: any) {
      console.error('Notion search failed:', error);
      alert(error.message || 'Notion search failed');
    } finally {
      setIsSearchingNotion(false);
    }
  };

  const handleImport = async (item: any) => {
    const dbId = item.id;
    const title = item.title?.[0]?.plain_text || 
                  item.properties?.Name?.title?.[0]?.plain_text || 
                  item.properties?.title?.title?.[0]?.plain_text || 
                  'Untitled';
    const isPage = item.object === 'page';

    setIsImporting(dbId);
    try {
      if (isPage) {
        await importNotionPage(dbId);
      } else {
        await importNotionDatabase(dbId);
      }
      alert(`Successfully imported ${isPage ? 'page' : 'database'} "${title}"`);
    } catch (error: any) {
      console.error('Import failed:', error);
      alert('Import failed: ' + error.message);
    } finally {
      setIsImporting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn("text-lg font-bold transition-colors", activeTab === 'settings' ? "text-slate-800" : "text-slate-400 hover:text-slate-600")}
            >
              Settings
            </button>
            <button 
              onClick={() => setActiveTab('agents')}
              className={cn("text-lg font-bold transition-colors", activeTab === 'agents' ? "text-slate-800" : "text-slate-400 hover:text-slate-600")}
            >
              Agents
            </button>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'settings' ? (
            <div className="p-6 space-y-8">
              {/* Notion Integration */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Database size={18} className="text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Notion Integration</h3>
                </div>
                
                <form onSubmit={handleSaveToken} className="mb-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500">Notion Internal Integration Token</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="password" 
                        placeholder={tokenSaved ? "Token is saved. Enter new token to update..." : "secret_..."}
                        value={notionTokenInput}
                        onChange={(e) => setNotionTokenInput(e.target.value)}
                        className="w-full pl-10 pr-24 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                      <button 
                        type="submit"
                        disabled={isSavingToken || !notionTokenInput.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-white rounded-lg text-xs font-bold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {isSavingToken ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                      </button>
                    </div>
                    {tokenError && <p className="text-xs text-red-500 mt-1">{tokenError}</p>}
                    {tokenSaved && !tokenError && <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1"><Check size={12} /> Token is configured</p>}
                  </div>
                </form>
                
                <form onSubmit={handleNotionSearch} className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search Notion (pages or databases)..." 
                    value={notionSearchQuery}
                    onChange={(e) => setNotionSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                  <button 
                    type="submit"
                    disabled={isSearchingNotion}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-white text-slate-600 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {isSearchingNotion ? <Loader2 size={14} className="animate-spin" /> : 'Search'}
                  </button>
                </form>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 no-scrollbar">
                  {notionResults.length > 0 ? (
                    notionResults.map((result: any) => {
                      const title = result.title?.[0]?.plain_text || 
                                    result.properties?.Name?.title?.[0]?.plain_text || 
                                    result.properties?.title?.title?.[0]?.plain_text || 
                                    'Untitled';
                      const isPage = result.object === 'page';

                      return (
                        <div key={result.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                              {result.icon?.emoji || (isPage ? <FileText size={14} className="text-slate-400" /> : <Database size={14} className="text-slate-400" />)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-700 truncate">{title}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{result.object}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleImport(result)}
                            disabled={isImporting === result.id}
                            className="px-3 py-1.5 bg-white text-primary rounded-lg text-xs font-bold shadow-sm hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                          >
                            {isImporting === result.id ? <Loader2 size={12} className="animate-spin" /> : 'Import'}
                          </button>
                        </div>
                      );
                    })
                  ) : notionSearchQuery && !isSearchingNotion ? (
                    <p className="text-center py-4 text-xs text-slate-400 font-medium italic">No results found for "{notionSearchQuery}"</p>
                  ) : !notionSearchQuery && !isSearchingNotion ? (
                    <button 
                      onClick={() => handleNotionSearch()}
                      className="w-full py-4 text-xs text-slate-400 font-bold hover:text-primary transition-colors border-2 border-dashed border-slate-100 rounded-xl"
                    >
                      Click to list shared content
                    </button>
                  ) : null}
                </div>
              </section>

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
          ) : (
            <div className="h-full">
              <AgentManagement onClose={onClose} onAgentsUpdated={() => {}} />
            </div>
          )}
        </div>
        {activeTab === 'settings' && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
            <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
