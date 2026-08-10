export const RECENT_TOOLS_KEY = 'aureqin_recent_tools_v1';
export const FAVORITE_TOOLS_KEY = 'aureqin_favorite_tools_v1';

export function navigationItems(navigation = []) {
  return navigation.flatMap(section => [
    ...(section.items || []).map(item => ({ ...item, suite:section.section, phase:null, cluster:null })),
    ...(section.groups || []).flatMap(phase => (phase.clusters || phase.subgroups || []).flatMap(workflow => (workflow.items || []).map(item => ({
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

export function toolIndex(navigation = []) {
  return canonicalNavigationItems(navigation, item => String(item.id).startsWith('tool-')).map(item => ({
    ...item,
    aliases:item.aliases || [],
    context:[item.cluster,item.phase,item.suite].filter(Boolean).join(' · '),
    searchText:[item.name,item.cluster,item.phase,item.suite,item.type,...(item.aliases || [])].filter(Boolean).join(' ').toLowerCase(),
  }));
}

export function searchTools(tools, query) {
  const terms = String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return tools.filter(tool => terms.every(term => tool.searchText.includes(term))).sort((a, b) => {
    const aStarts=Number(a.name.toLowerCase().startsWith(terms[0]));
    const bStarts=Number(b.name.toLowerCase().startsWith(terms[0]));
    return bStarts-aStarts || a.name.localeCompare(b.name);
  });
}

const sameItem=(left,right)=>left.path===right.path;
export function addRecentTool(recent, tool, limit = 5) { return [tool, ...(recent || []).filter(item => !sameItem(item,tool))].slice(0, limit); }
export function toggleFavoriteTool(favorites, tool) { return (favorites || []).some(item => sameItem(item,tool)) ? favorites.filter(item => !sameItem(item,tool)) : [tool, ...(favorites || [])]; }
export function reconcileStoredTools(stored, canonical) { return (stored || []).map(entry => canonical.find(item => sameItem(item,entry))).filter(Boolean).filter((item,index,items)=>items.findIndex(candidate=>sameItem(candidate,item))===index); }
export function readStoredTools(key) { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
export function persistTools(key, tools) { try { localStorage.setItem(key, JSON.stringify(tools)); } catch { /* Browser storage may be unavailable; navigation remains functional. */ } }
