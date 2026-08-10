import {analyticsByRoute} from '../config/analyticsCatalog';

export const RECENT_TOOLS_KEY = 'aureqin_recent_tools_v1';
export const FAVORITE_TOOLS_KEY = 'aureqin_favorite_tools_v1';

export function navigationItems(navigation = []) {
  return (Array.isArray(navigation) ? navigation : []).filter(Boolean).flatMap(section => [
    ...(Array.isArray(section.items) ? section.items : []).filter(Boolean).map(item => ({ ...item, suite:section.section || '', suiteId:section.suiteId || null, phase:null, phaseId:null, cluster:null, clusterId:null })),
    ...(Array.isArray(section.groups) ? section.groups : []).filter(Boolean).flatMap(phase => (Array.isArray(phase.clusters || phase.subgroups) ? phase.clusters || phase.subgroups : []).filter(Boolean).flatMap(workflow => (Array.isArray(workflow.items) ? workflow.items : []).filter(Boolean).map(item => ({
      ...item,
      suite:section.section,
      suiteId:section.suiteId || null,
      phase:phase.name,
      phaseId:phase.id,
      cluster:workflow.label,
      clusterId:workflow.id || String(workflow.label || '').toLowerCase().replace(/[^a-z0-9]+/g,'-'),
    })))),
  ]);
}

export function canonicalNavigationItems(navigation = [], predicate = () => true) {
  const seen = new Set();
  return navigationItems(navigation).filter(item => {
    if (!predicate(item) || seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });
}

const validPath=path=>typeof path==='string'&&path.startsWith('/');
export function navigationPlacementsForRoute(navigation,path){if(!validPath(path))return[];return navigationItems(navigation).filter(item=>validPath(item.path)&&(path===item.path||path.startsWith(`${item.path}/`)))}
export function resolveNavigationPlacement(navigation,path,context={}){const matches=navigationPlacementsForRoute(navigation,path);if(!matches.length)return null;const safeContext=context&&typeof context==='object'?context:{};return matches.find(item=>(!safeContext.suite||item.suite===safeContext.suite)&&(!safeContext.phaseId||item.phaseId===safeContext.phaseId)&&(!safeContext.clusterId||item.clusterId===safeContext.clusterId))||matches[0]}
export function navigationContextFor(item){return item&&item.phaseId?{suite:item.suite||'',phaseId:item.phaseId,clusterId:item.clusterId||''}:undefined}

export function toolIndex(navigation = []) {
  return canonicalNavigationItems(navigation, item => String(item.id).startsWith('tool-')).map(item => {
    const methods=analyticsByRoute(item.path),aliases=[...new Set([...(item.aliases||[]),...methods.flatMap(method=>method.aliases),...methods.map(method=>method.name)])];
    return ({
    ...item,methods:methods.map(method=>method.id),
    aliases,
    context:[item.cluster,item.phase,item.suite].filter(Boolean).join(' · '),
    searchText:[item.name,item.cluster,item.phase,item.suite,item.type,...aliases,...methods.map(method=>method.question)].filter(Boolean).join(' ').toLowerCase(),
  })});
}

export function searchTools(tools, query) {
  const terms = String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const normalizedQuery=terms.join(' '),scopeMatches=tools.filter(tool=>[tool.phase,tool.suite,tool.cluster].some(scope=>String(scope||'').toLowerCase()===normalizedQuery));
  if(scopeMatches.length)return scopeMatches;
  return tools.filter(tool => terms.every(term => tool.searchText.includes(term))).sort((a, b) => {
    const aStarts=Number(a.name.toLowerCase().startsWith(terms[0]));
    const bStarts=Number(b.name.toLowerCase().startsWith(terms[0]));
    return bStarts-aStarts || a.name.localeCompare(b.name);
  });
}

const safeItems=value=>Array.isArray(value)?value.filter(item=>item&&typeof item==='object'&&validPath(item.path)):[];
const sameItem=(left,right)=>Boolean(left&&right&&validPath(left.path)&&validPath(right.path)&&left.path===right.path);
export function addRecentTool(recent, tool, limit = 5) { if(!tool||!validPath(tool.path))return safeItems(recent).slice(0,limit);return [tool, ...safeItems(recent).filter(item => !sameItem(item,tool))].slice(0, limit); }
export function toggleFavoriteTool(favorites, tool) { const safe=safeItems(favorites);if(!tool||!validPath(tool.path))return safe;return safe.some(item => sameItem(item,tool)) ? safe.filter(item => !sameItem(item,tool)) : [tool, ...safe]; }
export function reconcileStoredTools(stored, canonical) { const safeCanonical=safeItems(canonical);return safeItems(stored).map(entry => safeCanonical.find(item=>sameItem(item,entry))).filter(Boolean).filter((item,index,items)=>items.findIndex(candidate=>sameItem(candidate,item))===index); }
export function readStoredTools(key) { try { return safeItems(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return []; } }
export function persistTools(key, tools) { try { localStorage.setItem(key, JSON.stringify(tools)); } catch { /* Browser storage may be unavailable; navigation remains functional. */ } }
