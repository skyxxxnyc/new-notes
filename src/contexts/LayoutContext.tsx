import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeJsonParse } from '../lib/utils';

export type LayoutMode = 'side-peek' | 'center-peek' | 'full-page' | 'pop-out';
export type PropertyVisibility = 'show' | 'hide' | 'always-show';

export interface PropertyConfig {
  id: string;
  visibility: PropertyVisibility;
}

export interface LayoutConfig {
  mode: LayoutMode;
  properties: PropertyConfig[];
  showHeaderIcon: boolean;
  showCoverImage: boolean;
  showBacklinks: boolean;
  showComments: boolean;
  fullWidth: boolean;
}

interface LayoutContextType {
  getLayoutConfig: (databaseId: string) => LayoutConfig;
  updateLayoutMode: (databaseId: string, mode: LayoutMode) => void;
  updateLayoutConfig: (databaseId: string, updates: Partial<LayoutConfig>) => void;
  updatePropertyConfig: (databaseId: string, properties: PropertyConfig[]) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [configs, setConfigs] = useState<Record<string, LayoutConfig>>(() => {
    const saved = localStorage.getItem('layout-configs');
    return safeJsonParse(saved, {});
  });

  useEffect(() => {
    localStorage.setItem('layout-configs', JSON.stringify(configs));
  }, [configs]);

  const getLayoutConfig = (databaseId: string): LayoutConfig => {
    const defaultConfig: LayoutConfig = {
      mode: 'side-peek',
      properties: [],
      showHeaderIcon: true,
      showCoverImage: true,
      showBacklinks: false,
      showComments: false,
      fullWidth: false
    };
    return { ...defaultConfig, ...(configs[databaseId] || {}) };
  };

  const updateLayoutMode = (databaseId: string, mode: LayoutMode) => {
    setConfigs(prev => ({
      ...prev,
      [databaseId]: { ...getLayoutConfig(databaseId), mode }
    }));
  };

  const updateLayoutConfig = (databaseId: string, updates: Partial<LayoutConfig>) => {
    setConfigs(prev => ({
      ...prev,
      [databaseId]: { ...getLayoutConfig(databaseId), ...updates }
    }));
  };

  const updatePropertyConfig = (databaseId: string, properties: PropertyConfig[]) => {
    setConfigs(prev => ({
      ...prev,
      [databaseId]: { ...getLayoutConfig(databaseId), properties }
    }));
  };

  return (
    <LayoutContext.Provider value={{ getLayoutConfig, updateLayoutMode, updateLayoutConfig, updatePropertyConfig }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};
