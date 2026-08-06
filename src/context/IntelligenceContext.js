import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import {useProjects} from './ProjectsContext';
import {useWorksheet} from './WorksheetContext';
import {useAnalysis} from './AnalysisContext';
import {useReport} from './ReportContext';
import {NAVIGATION} from '../config/navigation';

const IntelligenceContext=createContext();
const FAVORITES_KEY='sixsigmapro_favorites_v1';
const loadFavorites=()=>{try{return JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]')}catch{return[]}};
const toolLinks=NAVIGATION.flatMap(section=>section.groups||[]).flatMap(group=>group.subgroups||[]).filter(group=>group.label==='Tools').flatMap(group=>group.items);

export function IntelligenceProvider({children}){
 const {projects}=useProjects();const{datasets}=useWorksheet();const{analysisResults}=useAnalysis();const{items:reports}=useReport();
 const[favorites,setFavorites]=useState(loadFavorites);
 useEffect(()=>{try{localStorage.setItem(FAVORITES_KEY,JSON.stringify(favorites))}catch(error){console.warn('Favorites could not be saved:',error)}},[favorites]);
 const toggleFavorite=useCallback(asset=>setFavorites(previous=>previous.some(item=>item.type===asset.type&&item.id===asset.id)?previous.filter(item=>!(item.type===asset.type&&item.id===asset.id)):[asset,...previous]),[]);
 const isFavorite=useCallback((type,id)=>favorites.some(item=>item.type===type&&item.id===id),[favorites]);
 const index=useMemo(()=>[
  ...projects.map(project=>({type:'Project',id:project.id,title:project.name,subtitle:project.goal,path:`/projects/${project.id}`})),
  ...projects.flatMap(project=>[...(project.charter?[{type:'Document',id:`${project.id}:charter`,title:'Project Charter',subtitle:project.name,path:`/projects/${project.id}/charter`}]:[]),...Object.values(project.documents||{}).map(document=>({type:'Document',id:`${project.id}:${document.id}`,title:document.title,subtitle:project.name,path:`/projects/${project.id}/documents/${document.templateId}`}))]),
  ...datasets.map(dataset=>({type:'Dataset',id:dataset.id,title:dataset.name,subtitle:dataset.description||'Project dataset',path:'/worksheet'})),
  ...analysisResults.map(analysis=>({type:'Analysis',id:analysis.id,title:analysis.title||analysis.name||analysis.id,subtitle:analysis.phase||'Completed analysis',path:analysis.toolId?`/tool/${analysis.toolId}`:'/projects'})),
  ...reports.map(report=>({type:'Report',id:report.id,title:report.title||'Report item',subtitle:'Report Builder',path:'/report'})),
  ...toolLinks.map(item=>({type:'Tool',id:item.id,title:item.name,subtitle:'Statistical tool',path:item.path})),
 ],[analysisResults,datasets,projects,reports]);
 const search=useCallback(query=>{const value=query.trim().toLowerCase();if(!value)return[];return index.filter(item=>`${item.title} ${item.subtitle} ${item.type}`.toLowerCase().includes(value)).slice(0,40)},[index]);
 return <IntelligenceContext.Provider value={{favorites,toggleFavorite,isFavorite,index,search}}>{children}</IntelligenceContext.Provider>;
}
export const useIntelligence=()=>useContext(IntelligenceContext);
