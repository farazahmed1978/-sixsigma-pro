import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useTheme} from '../context/ThemeContext';
import {NAVIGATION} from '../config/navigation';
import logoMark from '../assets/axentra-mark.svg';
import GlobalSearch from './GlobalSearch';
import LocalMigrationBanner from './LocalMigrationBanner';
import {useAuth} from '../context/AuthContext';
import {useEntitlements} from '../context/EntitlementContext';
import {useProjects} from '../context/ProjectsContext';
import {getSuite,SUITE_STATES} from '../config/suites';
import {addRecentTool,FAVORITE_TOOLS_KEY,navigationContextFor,persistTools,readStoredTools,reconcileStoredTools,RECENT_TOOLS_KEY,resolveNavigationPlacement,searchTools,toggleFavoriteTool,toolIndex} from '../utils/navigationTools';
import './Layout.css';

export default function Layout({children}){
 const [sidebarOpen,setSidebarOpen]=useState(true);
 const [mobileOpen,setMobileOpen]=useState(false);
 const [isMobile,setIsMobile]=useState(typeof window!=='undefined'?window.innerWidth<=768:false);
 const [collapsed,setCollapsed]=useState({});
 const {theme,toggleTheme}=useTheme();
 const {user,profile,signOut}=useAuth();
 const {statusFor}=useEntitlements();
 const [accountOpen,setAccountOpen]=useState(false);
 const [toolQuery,setToolQuery]=useState('');
 const [recentTools,setRecentTools]=useState(()=>readStoredTools(RECENT_TOOLS_KEY));
 const [favoriteTools,setFavoriteTools]=useState(()=>readStoredTools(FAVORITE_TOOLS_KEY));
 const location=useLocation();
 const {getProject}=useProjects();
 // Issue 1 (Phase 5C QA) — the sidebar must be hidden for the whole guided flow, not just while
 // location.state.guided is set: a user who leaves the browser mid-flow and comes back (losing
 // router state, e.g. via a bookmark or browser back/forward) is still "in" a guided project until
 // its mandatory documents are actually done. So this also resolves the current /projects/:id from
 // the URL directly (Layout wraps <Routes>, so it has no route params of its own to read) and
 // checks that project's own persisted guidedFlowState as a second, state-independent signal.
 const guidedProjectId=location.pathname.match(/^\/projects\/([^/]+)/)?.[1];
 const guidedProject=guidedProjectId?getProject(guidedProjectId):null;
 const guidedModeActive=Boolean(location.state?.guided)||guidedProject?.guidedFlowState?.mandatoryComplete===false;
 const mainRef=useRef(null);
 const scrollPositions=useRef(new Map());
 useEffect(()=>setMobileOpen(false),[location.pathname]);
 useEffect(()=>{const previous=window.history.scrollRestoration;window.history.scrollRestoration='manual';return()=>{window.history.scrollRestoration=previous}},[]);
 useLayoutEffect(()=>{const node=mainRef.current,positions=scrollPositions.current;if(!node)return;const saved=positions.get(location.key);node.scrollTop=saved?.container||0;window.scrollTo(0,saved?.window||0);return()=>positions.set(location.key,{container:node.scrollTop,window:window.scrollY})},[location.key]);
 useEffect(()=>{const resize=()=>setIsMobile(window.innerWidth<=768);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 const toggle=key=>setCollapsed(previous=>({...previous,[key]:!(previous[key]??false)}));
 const toggleGroup=key=>setCollapsed(previous=>{const opening=previous[key]??true;const next={...previous};Object.keys(next).filter(item=>item.startsWith('group-')).forEach(item=>{next[item]=true});next[key]=!opening;return next});
 const toggleCluster=(key,phaseKey)=>setCollapsed(previous=>{const opening=previous[key]??true;const next={...previous};Object.keys(next).filter(item=>item.startsWith(`cluster-${phaseKey}-`)).forEach(item=>{next[item]=true});next[key]=!opening;return next});
 const active=path=>location.pathname===path||location.pathname.startsWith(`${path}/`);
 const menu=()=>isMobile?setMobileOpen(open=>!open):setSidebarOpen(open=>!open);
 const indexedTools=useMemo(()=>toolIndex(NAVIGATION),[]);
 const toolResults=useMemo(()=>searchTools(indexedTools,toolQuery),[indexedTools,toolQuery]);
 useEffect(()=>{setRecentTools(previous=>reconcileStoredTools(previous,indexedTools));setFavoriteTools(previous=>reconcileStoredTools(previous,indexedTools));},[indexedTools]);
 useEffect(()=>{const hint=location.state?.navigationContext,matches=[];for(const section of NAVIGATION)for(const group of section.groups||[])for(const workflow of group.clusters||group.subgroups||[])if(workflow.items?.some(item=>location.pathname===item.path||location.pathname.startsWith(`${item.path}/`)))matches.push({section,group,workflow});if(!matches.length)return;setCollapsed(previous=>{const selected=matches.find(({section,group,workflow})=>hint?.suite===section.section&&hint?.phaseId===group.id&&hint?.clusterId===(workflow.id||workflow.label))||matches.find(({section,group,workflow})=>previous[`group-${section.section}-${group.id}`]===false&&previous[`cluster-${section.section}-${group.id}-${workflow.id||workflow.label}`]===false)||matches[0],phaseKey=`${selected.section.section}-${selected.group.id}`,groupKey=`group-${phaseKey}`,clusterKey=`cluster-${phaseKey}-${selected.workflow.id||selected.workflow.label}`,next={...previous};Object.keys(next).filter(item=>item.startsWith('group-')).forEach(item=>{next[item]=true});Object.keys(next).filter(item=>item.startsWith(`cluster-${phaseKey}-`)).forEach(item=>{next[item]=true});next[groupKey]=false;next[clusterKey]=false;return next})},[location.pathname,location.state]);
 const rememberTool=tool=>{const next=addRecentTool(recentTools,tool);setRecentTools(next);persistTools(RECENT_TOOLS_KEY,next)};
 const favorite=tool=>{const next=toggleFavoriteTool(favoriteTools,tool);setFavoriteTools(next);persistTools(FAVORITE_TOOLS_KEY,next)};
 const navLink=(item,showFavorite=true,showContext=false)=>{if(!item||typeof item.path!=='string'||!item.path.startsWith('/'))return null;const placement=resolveNavigationPlacement(NAVIGATION,item.path,item),tool=indexedTools.find(candidate=>candidate.path===item.path),resolved={...(placement||{}),...item},starred=tool&&favoriteTools.some(candidate=>candidate.path===tool.path),navigationContext=navigationContextFor(resolved);return <div className="sidebar-link-row" key={resolved.id||resolved.path}><Link to={resolved.path} state={navigationContext?{navigationContext}:undefined} onClick={()=>tool?.recentEligible!==false&&rememberTool(tool)} className={`sidebar-link ${active(resolved.path)?'active':''}`}><span>{resolved.name}</span>{showContext&&tool?.context&&<small>{tool.context}</small>}</Link>{tool&&tool.favoriteEligible!==false&&showFavorite&&<button type="button" className={`sidebar-favorite ${starred?'active':''}`} onClick={()=>favorite(tool)} aria-label={`${starred?'Remove':'Add'} ${tool.name} ${starred?'from':'to'} favorites`}>{starred?'★':'☆'}</button>}</div>};
 const links=(items,context={})=>items.map(item=>navLink({...item,...context}));
 const suiteLinks=ids=>ids.map(id=>{const suite=getSuite(id),status=statusFor(id),available=[SUITE_STATES.ACTIVE,SUITE_STATES.TRIAL].includes(status);return <Link key={id} to={`/suites/${id}`} className={`sidebar-link sidebar-suite-link ${available?'available':'locked'} ${active(`/suites/${id}`)?'active':''}`}><span className="sidebar-suite-lock" aria-hidden="true">{available?'●':'🔒'}</span><span>{suite.name}</span><small>{status===SUITE_STATES.COMING_SOON?'Soon':status===SUITE_STATES.TRIAL?'Trial':status===SUITE_STATES.ACTIVE?'Active':status===SUITE_STATES.EXPIRED?'Expired':'Locked'}</small></Link>});

 return <div className={`layout ${sidebarOpen?'sidebar-open':'sidebar-closed'} theme-${theme}${guidedModeActive?' guided-mode':''}`}>
  <header className="topbar"><div className="topbar-left"><button className="menu-btn" onClick={menu} aria-label="Toggle navigation"><span/><span/><span/></button><Link to="/" className="logo"><div className="logo-icon"><img src={logoMark} alt="Aureqin"/></div><div><div className="logo-name">AUREQIN</div><div className="logo-sub">The productivity platform for professionals.</div></div></Link></div><nav className="topbar-nav"><Link to="/" className={location.pathname==='/'?'active':''}>Home</Link><Link to="/suites" className={active('/suites')?'active':''}>Suites</Link><Link to="/projects" className={active('/projects')?'active':''}>Projects</Link><Link to="/worksheet" className={active('/worksheet')?'active':''}>Worksheet</Link><Link to="/report" className={active('/report')?'active':''}>Reports</Link><Link to="/templates" className={active('/templates')?'active':''}>Document Library</Link><Link to="/ai-assistant" className={active('/ai-assistant')?'active':''}>AI Assistant</Link></nav><div className="topbar-right"><GlobalSearch/><button className="theme-toggle" onClick={toggleTheme} aria-label={theme==='dark'?'Switch to light mode':'Switch to dark mode'} title={theme==='dark'?'Switch to light mode':'Switch to dark mode'}>{theme==='dark'?<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.2A8 8 0 0 1 8.8 4 8.2 8.2 0 1 0 20 15.2Z"/></svg>}</button>{user?<><Link to="/projects" className="trial-btn">Open Workspace</Link><div className="account-menu"><button onClick={()=>setAccountOpen(open=>!open)} aria-expanded={accountOpen}>{(profile?.full_name||user.email||'A').charAt(0).toUpperCase()}</button>{accountOpen&&<div><strong>{profile?.full_name||'Aureqin account'}</strong><small>{user.email}</small><Link to="/account/billing" onClick={()=>setAccountOpen(false)}>Billing & Plans</Link><button onClick={async()=>{await signOut();setAccountOpen(false);window.location.assign('/')}}>Sign Out</button></div>}</div></>:<><Link to="/signin" className="topbar-signin">Sign In</Link><Link to="/start" className="trial-btn">Start Free Trial</Link></>}</div></header>
  <aside className={`sidebar ${mobileOpen?'mobile-open':''}`}><div className="sidebar-inner"><div className="sidebar-tool-launcher"><label><span>Search tools</span><input type="search" value={toolQuery} onChange={event=>setToolQuery(event.target.value)} placeholder="Gage, capability, ANOVA…" /></label>{toolQuery&&<div className="sidebar-search-results">{toolResults.length?toolResults.slice(0,12).map(tool=>navLink(tool,true,true)):<p>No matching tools</p>}</div>}{!toolQuery&&favoriteTools.length>0&&<section><h3>Favorites</h3>{favoriteTools.slice(0,5).map(tool=>navLink(tool,true,true))}</section>}{!toolQuery&&recentTools.length>0&&<section><h3>Recent tools</h3>{recentTools.slice(0,5).map(tool=>navLink(tool,false,true))}</section>}</div>{!toolQuery&&NAVIGATION.map(section=>{const sectionKey=`section-${section.section}`;const sectionClosed=collapsed[sectionKey]??false;const suiteAvailable=!section.suiteId||[SUITE_STATES.ACTIVE,SUITE_STATES.TRIAL].includes(statusFor(section.suiteId));if(!suiteAvailable)return <div key={section.section} className="sidebar-group"><div className="sidebar-section-static">{section.section}</div>{suiteLinks([section.suiteId])}</div>;return <div key={section.section} className="sidebar-group"><button className="sidebar-section-label" onClick={()=>toggle(sectionKey)}>{section.section}<span className="collapse-arrow">{sectionClosed?'›':'⌄'}</span></button>{!sectionClosed&&<>{section.items&&links(section.items)}{section.suiteIds&&suiteLinks(section.suiteIds)}{section.groups?.map(group=>{const phaseKey=`${section.section}-${group.id}`,groupKey=`group-${phaseKey}`,groupClosed=collapsed[groupKey]??true;return <div className="sidebar-phase" key={group.id}><button className="sidebar-phase-label" onClick={()=>toggleGroup(groupKey)} style={group.color?{color:group.color}:undefined}>{group.color&&<span className="cat-dot" style={{background:group.color}}/>}{group.name}<span>{groupClosed?'›':'⌄'}</span></button>{!groupClosed&&(group.clusters||group.subgroups||[]).map(workflow=>{const clusterKey=`cluster-${phaseKey}-${workflow.id||workflow.label}`,clusterClosed=collapsed[clusterKey]??true;return <div className="sidebar-subgroup" key={workflow.id||workflow.label}><button type="button" className="sidebar-subheading" onClick={()=>toggleCluster(clusterKey,phaseKey)} aria-expanded={!clusterClosed}>{workflow.label}<span>{clusterClosed?'›':'⌄'}</span></button>{!clusterClosed&&<div className="sidebar-cluster-items">{links(workflow.items||[])}</div>}</div>})}</div>;})}</>}</div>;})}</div></aside>
  {isMobile&&mobileOpen&&<div className="overlay" onClick={()=>setMobileOpen(false)}/>}
  <main ref={mainRef} className="main-content"><LocalMigrationBanner/>{children}</main>
 </div>;
}
