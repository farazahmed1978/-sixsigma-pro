import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {useAuth} from './AuthContext';

const ReportContext = createContext();
const STORAGE_KEY = 'sixsigmapro_report_items';
const MAX_IMAGE_WIDTH = 1000;   // px — chart snapshots are captured at scale:2, far larger than needed for storage
const IMAGE_QUALITY = 0.72;     // JPEG quality — typically cuts base64 size 70-90% vs the original PNG
const PHASE_ORDER = ['Define','Measure','Analyze','Improve','Control'];
export const sortReportItemsByPhase=items=>[...items].sort((a,b)=>{const left=PHASE_ORDER.indexOf(a.phase),right=PHASE_ORDER.indexOf(b.phase);return(left<0?99:left)-(right<0?99:right)});
export const reportIdentity=item=>item.analysisId?`analysis:${item.projectId||''}:${item.analysisId}`:item.documentId?`document:${item.projectId||''}:${item.documentId}`:item.reportKey?`source:${item.reportKey}`:'';

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Downscales + re-encodes a captured chart (PNG data URL from html2canvas) as a
// compressed JPEG before it's ever stored, so a project full of chart snapshots
// doesn't fill up localStorage's ~5-10MB quota.
function compressImage(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_WIDTH / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      // JPEG has no alpha channel — flatten onto white first or transparent chart
      // backgrounds turn black.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
    };
    img.onerror = () => resolve(dataUrl); // fall back to the original rather than lose it
    img.src = dataUrl;
  });
}

function trySave(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

// If storage is still over quota even after compression (e.g. a project with many
// items), strip the chart image from the oldest items first and retry — this keeps
// the stats and interpretation (the data that actually matters) instead of just
// failing the save silently and staying broken on every future change.
function saveWithFallback(items, setWarning) {
  if (trySave(items)) { setWarning(null); return; }

  const attempt = items.map(i => ({ ...i }));
  let strippedCount = 0;
  for (let i = 0; i < attempt.length; i++) {
    if (attempt[i].chartImage) {
      attempt[i].chartImage = null;
      strippedCount++;
      if (trySave(attempt)) {
        setWarning(`Storage was nearly full — removed the saved chart image from ${strippedCount} older report item${strippedCount > 1 ? 's' : ''} to keep everything else. Stats and interpretations are unaffected.`);
        return;
      }
    }
  }
  setWarning('Report items could not be saved to browser storage — they will be lost on reload. Try removing some older items.');
}

export function ReportProvider({ children }) {
  const {user,profile}=useAuth();
  // [{ id, title, toolId, timestamp, statsSummary, interpretation, chartImage, includeRawData, rawData }]
  const [items, setItems] = useState(loadItems);
  const [storageWarning, setStorageWarning] = useState(null);

  useEffect(() => {
    saveWithFallback(items, setStorageWarning);
  }, [items]);

  const addReportItem = useCallback(async (item) => {
    const identity=reportIdentity(item),existing=identity?items.find(entry=>reportIdentity(entry)===identity):null;
    if(existing)return existing.id;
    const id = `${item.toolId}-${Date.now()}`;
    const compressedImage = await compressImage(item.chartImage);
    setItems(prev => {
      const next={ id, includeRawData: false,organizationId:item.organizationId||profile?.default_organization_id||'',createdBy:item.createdBy||user?.id||'',status:item.status||'active',methodology:item.methodology||'lean-six-sigma',createdAt:item.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(), assetType:item.documentId?'document':item.assetType||'analysis', ...item, chartImage: compressedImage };
      const withoutDuplicate=identity?prev.filter(existing=>reportIdentity(existing)!==identity):prev;
      const updated=[...withoutDuplicate,next];
      return sortReportItemsByPhase(updated);
    });
    return id;
  }, [items,profile,user]);

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
      storageWarning, dismissStorageWarning: () => setStorageWarning(null),
    }}>
      {children}
    </ReportContext.Provider>
  );
}

export const useReport = () => useContext(ReportContext);
