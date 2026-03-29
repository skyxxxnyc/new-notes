import React, { useEffect } from 'react';
import { useLayout } from '../contexts/LayoutContext';
import SidePeekPanel from './SidePeekPanel';
import CenterPeekModal from './CenterPeekModal';

interface PageOpenerProps {
  pageId: string | null;
  databaseId: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

const PageOpener: React.FC<PageOpenerProps> = ({ 
  pageId, 
  databaseId, 
  isOpen, 
  onClose, 
  children,
  title
}) => {
  const { getLayoutConfig, updateLayoutMode } = useLayout();
  const config = getLayoutConfig(databaseId);

  useEffect(() => {
    if (isOpen && pageId) {
      if (config.mode === 'full-page') {
        // Navigate to full page
        window.dispatchEvent(new CustomEvent('navigate-page-full', { detail: { id: pageId, databaseId } }));
        onClose();
      } else if (config.mode === 'pop-out') {
        // Pop out window
        const url = `${window.location.origin}/page/${pageId}?databaseId=${databaseId}`;
        window.open(url, '_blank', 'width=900,height=700');
        onClose();
      }
    }
  }, [isOpen, pageId, config.mode, databaseId, onClose]);

  const handleExpand = () => {
    updateLayoutMode(databaseId, 'full-page');
  };

  const handlePopOut = () => {
    updateLayoutMode(databaseId, 'pop-out');
  };

  if (!isOpen || !pageId) return null;

  if (config.mode === 'side-peek') {
    return (
      <SidePeekPanel 
        isOpen={isOpen} 
        onClose={onClose} 
        title={title}
        onExpand={handleExpand}
        onPopOut={handlePopOut}
      >
        {children}
      </SidePeekPanel>
    );
  }

  if (config.mode === 'center-peek') {
    return (
      <CenterPeekModal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={title}
        onExpand={handleExpand}
        onPopOut={handlePopOut}
      >
        {children}
      </CenterPeekModal>
    );
  }

  return null;
};

export default PageOpener;
