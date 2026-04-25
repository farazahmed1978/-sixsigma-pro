import React, { createContext, useContext, useState, useCallback } from 'react';

const WorksheetContext = createContext();

export function WorksheetProvider({ children }) {
  const [columns, setColumns] = useState([]);   // [{ name, data: [] }]
  const [fileName, setFileName] = useState('');
  const [rowCount, setRowCount] = useState(0);

  const loadData = useCallback((parsedColumns, name) => {
    setColumns(parsedColumns);
    setFileName(name || 'Worksheet');
    setRowCount(parsedColumns[0]?.data?.length || 0);
  }, []);

  const clearData = useCallback(() => {
    setColumns([]);
    setFileName('');
    setRowCount(0);
  }, []);

  const addColumn = useCallback((name, data) => {
    setColumns(prev => {
      const exists = prev.findIndex(c => c.name === name);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = { name, data };
        return updated;
      }
      return [...prev, { name, data }];
    });
    setRowCount(prev => Math.max(prev, data.length));
  }, []);

  const getNumericColumns = () => columns.filter(c =>
    c.data.some(v => !isNaN(parseFloat(v)) && v !== '' && v !== null)
  );

  const getCategoricalColumns = () => columns.filter(c =>
    !c.data.every(v => !isNaN(parseFloat(v)))
  );

  const getColumnData = (name) => {
    const col = columns.find(c => c.name === name);
    return col ? col.data.map(v => parseFloat(v)).filter(v => !isNaN(v)) : [];
  };

  const getRawColumnData = (name) => {
    const col = columns.find(c => c.name === name);
    return col ? col.data : [];
  };

  return (
    <WorksheetContext.Provider value={{
      columns, fileName, rowCount,
      loadData, clearData, addColumn,
      getNumericColumns, getCategoricalColumns,
      getColumnData, getRawColumnData,
      hasData: columns.length > 0
    }}>
      {children}
    </WorksheetContext.Provider>
  );
}

export const useWorksheet = () => useContext(WorksheetContext);
