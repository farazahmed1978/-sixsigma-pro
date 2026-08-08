import React,{useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useTheme} from '../context/ThemeContext';
import {NAVIGATION} from '../config/navigation';
import logoMark from '../assets/axentra-mark.svg';
import GlobalSearch from './GlobalSearch';
import LocalMigrationBanner from './LocalMigrationBanner';
import {useAuth} from '../context/AuthContext';
import './Layout.css';

export default function Layout({children}){
 const [sidebarOpen,setSidebarOpen]=useState(true);
 const [mobileOpen,setMobileOpen]=useState(false);
 const [isMobile,setIsMobile]=useState(typeof window!=='undefined'?window.innerWidth<=768:false);
 const [collapsed,setCollapsed]=useState({});
 const {theme,toggleTheme}=useTheme();
 const {user,profile,signOut}=useAuth();
 const [accountOpen,setAccountOpen]=useState(false);
 const location=useLocation();
 useEffect(()=>setMobileOpen(false),[location.pathname]);
 useEffect(()=>{const resize=()=>setIsMobile(window.innerWidth<=768);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 const toggle=key=>setCollapsed(previous=>({...previous,[key]:!(previous[key]??false)}));
 const toggleGroup=key=>setCollapsed(previous=>({...previous,[key]:!(previous[key]??true)}));
 const active=path=>location.pathname===path||location.pathname.startsWith(`${path}/`);
 const menu=()=>isMobile?setMobileOpen(open=>!open):setSidebarOpen(open=>!open);
 const links=items=>items.map(item=><Link key={item.id} to={item.path} className={`sidebar-link ${active(item.path)?'active':''}`}><span>{item.name}</span></Link>);

 return <div className={`layout ${sidebarOpen?'sidebar-open':'sidebar-closed'} theme-${theme}`}>
  <header className="topbar"><div className="topbar-left"><button className="menu-btn" onClick={menu} aria-label="Toggle navigation"><span/><span/><span/></button><Link to="/" className="logo"><div className="logo-icon"><img src={logoMark} alt="Axentra"/></div><div><div className="logo-name">AXENTRA</div><div className="logo-sub">Operational Excellence Platform</div></div></Link></div><nav className="topbar-nav"><Link to="/" className={location.pathname==='/'?'active':''}>Home</Link><Link to="/projects" className={active('/projects')?'active':''}>Projects</Link><Link to="/worksheet" className={active('/worksheet')?'active':''}>Worksheet</Link><Link to="/report" className={active('/report')?'active':''}>Reports</Link><Link to="/templates" className={active('/templates')?'active':''}>Document Library</Link><Link to="/ai-assistant" className={active('/ai-assistant')?'active':''}>AI Assistant</Link></nav><div className="topbar-right"><GlobalSearch/><button className="theme-toggle" onClick={toggleTheme} aria-label={theme==='dark'?'Switch to light mode':'Switch to dark mode'} title={theme==='dark'?'Switch to light mode':'Switch to dark mode'}>{theme==='dark'?<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.2A8 8 0 0 1 8.8 4 8.2 8.2 0 1 0 20 15.2Z"/></svg>}</button>{user?<><Link to="/projects" className="trial-btn">Open Workspace</Link><div className="account-menu"><button onClick={()=>setAccountOpen(open=>!open)} aria-expanded={accountOpen}>{(profile?.full_name||user.email||'A').charAt(0).toUpperCase()}</button>{accountOpen&&<div><strong>{profile?.full_name||'Axentra account'}</strong><small>{user.email}</small><button onClick={async()=>{await signOut();setAccountOpen(false);window.location.assign('/')}}>Sign Out</button></div>}</div></>:<><Link to="/signin" className="topbar-signin">Sign In</Link><Link to="/start" className="trial-btn">Start Free Trial</Link></>}</div></header>
  <aside className={`sidebar ${mobileOpen?'mobile-open':''}`}><div className="sidebar-inner">{NAVIGATION.map(section=>{const sectionKey=`section-${section.section}`;const sectionClosed=collapsed[sectionKey]??false;return <div key={section.section} className="sidebar-group"><button className="sidebar-section-label" onClick={()=>toggle(sectionKey)}>{section.section}<span className="collapse-arrow">{sectionClosed?'›':'⌄'}</span></button>{!sectionClosed&&<>{section.items&&links(section.items)}{section.groups?.map(group=>{const groupKey=`group-${section.section}-${group.id}`;const groupClosed=collapsed[groupKey]??true;return <div className="sidebar-phase" key={group.id}><button className="sidebar-phase-label" onClick={()=>toggleGroup(groupKey)} style={group.color?{color:group.color}:undefined}>{group.color&&<span className="cat-dot" style={{background:group.color}}/>}{group.name}<span>{groupClosed?'›':'⌄'}</span></button>{!groupClosed&&group.subgroups.map(subgroup=><div className="sidebar-subgroup" key={subgroup.label}><div className="sidebar-subheading">{subgroup.label}</div>{subgroup.items.length?links(subgroup.items):<div className="sidebar-empty">No dedicated tools</div>}</div>)}</div>;})}</>}</div>;})}</div></aside>
  {isMobile&&mobileOpen&&<div className="overlay" onClick={()=>setMobileOpen(false)}/>}
  <main className="main-content"><LocalMigrationBanner/>{children}</main>
 </div>;
}
