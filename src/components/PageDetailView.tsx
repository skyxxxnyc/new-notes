import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, MessageSquare, Link2, ImageIcon, Smile } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { renderPropertyValue } from '../lib/utils';
import RichTextEditor from './RichTextEditor';
import { useLayout } from '../contexts/LayoutContext';

interface PageDetailViewProps {
  pageId: string;
  onBack: () => void;
}

const PageDetailView: React.FC<PageDetailViewProps> = ({ pageId, onBack }) => {
  const [page, setPage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getLayoutConfig } = useLayout();

  useEffect(() => {
    const fetchPage = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch(`/api/pages/${pageId}`);
        setPage(data);
      } catch (error) {
        console.error('Failed to fetch page:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPage();
  }, [pageId]);

  const config = page ? getLayoutConfig(page.databaseId) : null;

  const handleSave = async (content: string) => {
    if (!page) return;
    try {
      await apiFetch(`/api/pages/${pageId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...page, content })
      });
      window.dispatchEvent(new CustomEvent('pages-changed'));
    } catch (error) {
      console.error('Failed to save page:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white gap-4">
        <p className="text-slate-500">Page not found</p>
        <button onClick={onBack} className="text-primary hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white h-screen overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">{renderPropertyValue(page.title)}</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-white">
        {config?.showCoverImage && (
          <div className="w-full h-48 bg-slate-100 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 flex items-center justify-center text-slate-300">
              <ImageIcon size={48} strokeWidth={1} />
            </div>
          </div>
        )}

        <div className={`mx-auto py-12 px-6 transition-all duration-300 ${config?.fullWidth ? 'max-w-none px-12' : 'max-w-4xl'}`}>
          <div className="mb-8 relative">
            {config?.showHeaderIcon && (
              <div className="text-6xl mb-4 -mt-20 bg-white p-2 rounded-2xl w-fit shadow-sm border border-slate-100">
                <Smile size={64} className="text-slate-300" />
              </div>
            )}
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-4">
              {renderPropertyValue(page.title)}
            </h1>
            
            {(config?.showBacklinks || config?.showComments) && (
              <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-100 pt-4 mt-8">
                {config?.showBacklinks && (
                  <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <Link2 size={14} />
                    0 backlinks
                  </button>
                )}
                {config?.showComments && (
                  <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <MessageSquare size={14} />
                    0 comments
                  </button>
                )}
              </div>
            )}
          </div>

          <RichTextEditor 
            content={page.content} 
            onChange={handleSave}
          />
        </div>
      </div>
    </div>
  );
};

export default PageDetailView;
