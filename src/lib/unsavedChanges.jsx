import React, { createContext, useContext, useState, useCallback } from 'react';

const UnsavedCtx = createContext({ isDirty: false, setDirty: () => {}, requestNavigation: null, setRequestNavigation: () => {} });

export function UnsavedChangesProvider({ children }) {
  const [isDirty, setIsDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState(null); // { callback }

  const setDirty = useCallback((v) => setIsDirty(v), []);

  const requestNavigation = useCallback((callback) => {
    if (isDirty) {
      setPendingNav({ callback });
    } else {
      callback();
    }
  }, [isDirty]);

  const confirm = useCallback(() => {
    if (pendingNav) { setIsDirty(false); pendingNav.callback(); setPendingNav(null); }
  }, [pendingNav]);

  const cancel = useCallback(() => setPendingNav(null), []);

  return (
    <UnsavedCtx.Provider value={{ isDirty, setDirty, requestNavigation, pendingNav, confirm, cancel }}>
      {children}
    </UnsavedCtx.Provider>
  );
}

export const useUnsavedChanges = () => useContext(UnsavedCtx);