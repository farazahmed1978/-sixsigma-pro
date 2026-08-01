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

  // ── Grid editing — cell-level updates and structural changes (add/remove
  // rows and columns, rename), used by the editable Data Grid tab. Everything
  // is addressed by index rather than name, since names can change mid-edit. ──

  const updateCell = useCallback((colIndex, rowIndex, value) => {
    setColumns(prev => prev.map((c, i) => {
      if (i !== colIndex) return c;
      const data = [...c.data];
      while (data.length <= rowIndex) data.push('');
      data[rowIndex] = value;
      return { ...c, data };
    }));
    setRowCount(prev => Math.max(prev, rowIndex + 1));
  }, []);

  const renameColumn = useCallback((colIndex, newName) => {
    setColumns(prev => prev.map((c, i) => (i === colIndex ? { ...c, name: newName } : c)));
  }, []);

  const deleteColumn = useCallback((colIndex) => {
    setColumns(prev => prev.filter((_, i) => i !== colIndex));
  }, []);

  const addBlankColumn = useCallback(() => {
    setColumns(prev => {
      const name = `Column${prev.length + 1}`;
      const data = new Array(rowCount).fill('');
      return [...prev, { name, data }];
    });
  }, [rowCount]);

  const addBlankRow = useCallback(() => {
    setColumns(prev => prev.map(c => ({ ...c, data: [...c.data, ''] })));
    setRowCount(prev => prev + 1);
  }, []);

  const deleteRow = useCallback((rowIndex) => {
    setColumns(prev => prev.map(c => ({ ...c, data: c.data.filter((_, i) => i !== rowIndex) })));
    setRowCount(prev => Math.max(0, prev - 1));
  }, []);

  // Starts a completely empty, typeable grid — like opening a new blank sheet in
  // Minitab/jamovi — rather than requiring a file to be imported first.
  const startBlankSheet = useCallback((numCols = 5, numRows = 15) => {
    const cols = Array.from({ length: numCols }, (_, i) => ({ name: `Column${i + 1}`, data: new Array(numRows).fill('') }));
    setColumns(cols);
    setFileName('New Worksheet');
    setRowCount(numRows);
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
      updateCell, renameColumn, deleteColumn, addBlankColumn, addBlankRow, deleteRow, startBlankSheet,
      getNumericColumns, getCategoricalColumns,
      getColumnData, getRawColumnData,
      hasData: columns.length > 0
    }}>
      {children}
    </WorksheetContext.Provider>
  );
}

export const useWorksheet = () => useContext(WorksheetContext);
