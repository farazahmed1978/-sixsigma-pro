import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import './Layout.css';

const NAV = [
  {
    section: 'Workspace',
    items: [
      { id: 'worksheet', name: 'Data Worksheet', icon: '🗂️', path: '/worksheet' },
      { id: 'projects', name: 'Project Workspace', icon: '📁', path: '/projects' },
      { id: 'dashboard', name: 'Classic Dashboard', icon: '🏠', path: '/dashboard' },
    ]
  },
  {
    section: 'Define',
    color: 'var(--yellow)',
    items: [
      { id: 'templates', name: 'Project Templates', icon: '📋', path: '/templates' },
      { id: 'report', name: 'Report Builder', icon: '📄', path: '/report' },
    ]
  },
  {
    section: 'Measure',
    color: 'var(--green)',
    items: [
      { id: 'control-chart', name: 'Control Chart', icon: '📈', path: '/tool/control-chart' },
      { id: 'run-chart', name: 'Run Chart', icon: '📉', path: '/tool/run-chart' },
      { id: 'capability', name: 'Capability Analysis', icon: '🎯', path: '/tool/capability' },
      { id: 'histogram', name: 'Histogram', icon: '📊', path: '/tool/histogram' },
      { id: 'msa', name: 'MSA / Gage R&R', icon: '📏', path: '/tool/msa' },
      { id: 'descriptive', name: 'Descriptive Stats', icon: '🔢', path: '/tool/descriptive' },
      { id: 'sigma-calculator', name: 'Sigma Level / DPMO', icon: '🎚️', path: '/tool/sigma-calculator' },
      { id: 'sample-size-calculator', name: 'Sample Size Calculator', icon: '🧮', path: '/tool/sample-size-calculator' },
      { id: 'power-calculator', name: 'Power Calculator', icon: '⚡', path: '/tool/power-calculator' },
    ]
  },
  {
    section: 'Analyze',
    color: 'var(--orange)',
    items: [
      { id: 'hypothesis', name: 'Hypothesis Testing', icon: '🧪', path: '/hypothesis' },
      { id: 'pareto', name: 'Pareto Chart', icon: '🏆', path: '/tool/pareto' },
      { id: 'scatter', name: 'Scatter Plot', icon: '🔵', path: '/tool/scatter' },
      { id: 'boxplot', name: 'Box Plot', icon: '📦', path: '/tool/boxplot' },
      { id: 'fishbone', name: 'Fishbone Diagram', icon: '🐟', path: '/tool/fishbone' },
      { id: 'multivari', name: 'Multi-Vari Chart', icon: '🔀', path: '/tool/multivari' },
      { id: 'correlation', name: 'Correlation Matrix', icon: '🔗', path: '/tool/correlation' },
      { id: 'regression', name: 'Regression', icon: '📐', path: '/tool/regression' },
      { id: 'multiregression', name: 'Multiple Regression', icon: '📊', path: '/tool/multiregression' },
      { id: 'logistic', name: 'Logistic Regression', icon: '🎲', path: '/tool/logistic' },
      { id: 'anova', name: 'ANOVA', icon: '📶', path: '/tool/anova' },
    ]
  },
  {
    section: 'Improve',
    color: 'var(--purple)',
    items: [
      { id: 'doe', name: 'Design of Experiments', icon: '⚗️', path: '/doe' },
      { id: 'fmea', name: 'FMEA', icon: '⚠️', path: '/tool/fmea' },
      { id: 'vsm', name: 'Value Stream Map', icon: '🗺️', path: '/tool/vsm' },
    ]
  },
  {
    section: 'Control',
    color: 'var(--cyan)',
    items: [
      { id: 'gage-rr', name: 'Gage R&R', icon: '🔬', path: '/tool/gage-rr' },
    ]
  },
  {
    section: 'Resources',
    items: [
      { id: 'resources', name: 'Guides & References', icon: '📚', path: '/resources' },
      { id: 'about', name: 'About', icon: 'ℹ️', path: '/about' },
    ]
  }
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [collapsed, setCollapsed] = useState({});
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSection = (section) => setCollapsed(p => ({ ...p, [section]: !p[section] }));
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Desktop: toggle the sidebar's collapsed/expanded state.
  // Mobile: toggle the slide-in overlay instead — these must NOT both fire from one click,
  // or the full-screen mobile overlay renders on desktop and blocks the page.
  const handleMenuClick = () => {
    if (isMobile) setMobileOpen(prev => !prev);
    else setSidebarOpen(prev => !prev);
  };

  return (
    <div className={`layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'} theme-${theme}`}>
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-left">
          <button className="menu-btn" onClick={handleMenuClick}>
            <span /><span /><span />
          </button>
          <Link to="/" className="logo">
            <div className="logo-icon">
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                <rect width="30" height="30" rx="8" fill="var(--accent)" />
                <path d="M7 22L11 15L15 19L19 11L22 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="7" cy="22" r="1.8" fill="white" />
                <circle cx="22" cy="15" r="1.8" fill="white" />
              </svg>
            </div>
            <div>
              <div className="logo-name">SixSigma<span>Pro</span></div>
              <div className="logo-sub">by Faraz Ahmed</div>
            </div>
          </Link>
        </div>

        <nav className="topbar-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
          <Link to="/worksheet" className={isActive('/worksheet') ? 'active' : ''}>Worksheet</Link>
          <Link to="/projects" className={isActive('/projects') ? 'active' : ''}>Projects</Link>
          <Link to="/hypothesis" className={isActive('/hypothesis') ? 'active' : ''}>Hypothesis Tests</Link>
          <Link to="/templates" className={isActive('/templates') ? 'active' : ''}>Templates</Link>
          <Link to="/resources" className={isActive('/resources') ? 'active' : ''}>Resources</Link>
        </nav>

        <div className="topbar-right">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle light/dark mode">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link to="/pricing" className="trial-btn">Start Free Trial</Link>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-inner">
          {NAV.map(group => (
            <div key={group.section} className="sidebar-group">
              <button
                className="sidebar-section-label"
                onClick={() => toggleSection(group.section)}
                style={group.color ? { color: group.color } : {}}
              >
                {group.color && <span className="cat-dot" style={{ background: group.color }} />}
                {group.section}
                <span className="collapse-arrow">{collapsed[group.section] ? '›' : '∨'}</span>
              </button>
              {!collapsed[group.section] && group.items.map(item => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
                >
                  <span className="tool-icon">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {isMobile && mobileOpen && <div className="overlay" onClick={() => setMobileOpen(false)} />}

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
