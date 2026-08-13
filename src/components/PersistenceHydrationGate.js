import React from 'react';
import {useAuth} from '../context/AuthContext';
import {useProjects} from '../context/ProjectsContext';
import {useWorksheet} from '../context/WorksheetContext';
import {useAnalysis} from '../context/AnalysisContext';
import {useReport} from '../context/ReportContext';
import {useProjectPlacement} from '../context/ProjectPlacementContext';
import {HYDRATION} from '../services/persistenceSafety';

export default function PersistenceHydrationGate({children}){
  const auth=useAuth(),stores=[useProjects(),useWorksheet(),useAnalysis(),useReport(),useProjectPlacement()];
  if(!auth.configured||!auth.user)return children;
  const failed=stores.find(store=>store.hydrationStatus===HYDRATION.ERROR);
  if(failed)return <main className="empty-state" role="alert"><h2>Workspace could not be loaded</h2><p>{failed.persistenceError||'Aureqin could not verify authoritative project data. Cached content has not been shown.'}</p><button className="btn-primary" onClick={()=>window.location.reload()}>Retry</button></main>;
  if(auth.loading||stores.some(store=>store.hydrationStatus!==HYDRATION.READY))return <main className="empty-state" aria-busy="true"><h2>Loading your workspace…</h2><p>Verifying projects, datasets, analyses, reports, and placements with Aureqin.</p></main>;
  return children;
}
