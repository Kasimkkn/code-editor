import { useCallback, useEffect } from 'react';

export interface CodeVersion {
  id: number;
  code: string;
  timestamp: string;
  language: string;
}

export const useCodeStorage = () => {
  // Save code version to localStorage
  const saveCodeVersion = useCallback((code: string, language: string) => {
    try {
      const versions = getStoredVersions();
      const newVersion: CodeVersion = {
        id: Date.now(),
        code,
        timestamp: new Date().toISOString(),
        language
      };
      
      versions.push(newVersion);
      
      // Keep only last 10 versions
      if (versions.length > 10) {
        versions.splice(0, versions.length - 10);
      }
      
      localStorage.setItem('cosmic-editor-versions', JSON.stringify(versions));
    } catch (error) {
      console.error('Failed to save code version:', error);
    }
  }, []);

  // Get stored versions from localStorage
  const getStoredVersions = useCallback((): CodeVersion[] => {
    try {
      const stored = localStorage.getItem('cosmic-editor-versions');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load code versions:', error);
      return [];
    }
  }, []);

  // Save current editor state
  const saveEditorState = useCallback((state: any) => {
    try {
      localStorage.setItem('cosmic-editor-state', JSON.stringify({
        ...state,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save editor state:', error);
    }
  }, []);

  // Load editor state
  const loadEditorState = useCallback(() => {
    try {
      const stored = localStorage.getItem('cosmic-editor-state');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load editor state:', error);
      return null;
    }
  }, []);

  // Clear old storage data
  const clearOldData = useCallback(() => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cosmic-editor-') && !key.includes('versions') && !key.includes('state')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear old data:', error);
    }
  }, []);

  // Initialize storage cleanup on mount
  useEffect(() => {
    // Clean up old data on startup
    const cleanupTimeout = setTimeout(() => {
      clearOldData();
    }, 1000);

    return () => clearTimeout(cleanupTimeout);
  }, [clearOldData]);

  return {
    saveCodeVersion,
    getStoredVersions,
    saveEditorState,
    loadEditorState,
    clearOldData
  };
};
