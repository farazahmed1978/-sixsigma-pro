import React, { createContext, useContext, useState, useCallback } from 'react';

const ReportContext = createContext();

export function ReportProvider({ children }) {
  const [items, setItems] = useState([]); // [{ id, title, toolId, timestamp, statsSummary, interpretation, chartImage, includeRawData, rawData }]

  const addReportItem = useCallback((item) => {
    const id = `${item.toolId}-${Date.now()}`;
    setItems(prev => [...prev, { id, includeRawData: false, ...item }]);
    return id;
  }, []);

  const removeReportItem = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const toggleIncludeRawData = useCallback((id) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, includeRawData: !i.includeRawData } : i));
  }, []);

  const reorderItems = useCallback((fromIndex, toIndex) => {
    setItems(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  const clearReport = useCallback(() => setItems([]), []);

  return (
    <ReportContext.Provider value={{
      items, addReportItem, removeReportItem, toggleIncludeRawData, reorderItems, clearReport,
      hasItems: items.length > 0,
    }}>
      {children}
    </ReportContext.Provider>
  );
}

export const useReport = () => useContext(ReportContext);
