import {ANALYTICS_CATALOG,analyticsById} from './analyticsCatalog';

export const methodDeepLink=method=>`${method.route}?method=${encodeURIComponent(method.id)}`;
export function resolveMethodContext(route,methodId){const method=analyticsById(methodId);return method&&method.route===route?method:null}
export function analyticsSearchEntries(){return ANALYTICS_CATALOG.map(method=>({type:'Method',id:`method-${method.id}`,title:method.name,subtitle:`${method.family} · ${method.aliases.join(', ')}`,path:methodDeepLink(method),methodId:method.id,validationStatus:method.validationStatus}))}
export function searchAnalyticsMethods(query){const terms=String(query||'').trim().toLowerCase().split(/\s+/).filter(Boolean);if(!terms.length)return[];return ANALYTICS_CATALOG.filter(method=>{const text=[method.name,method.family,method.question,...method.aliases].join(' ').toLowerCase();return terms.every(term=>text.includes(term))})}
