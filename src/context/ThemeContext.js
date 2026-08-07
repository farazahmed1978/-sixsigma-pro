import React, { createContext, useContext, useState, useEffect } from 'react';
import {supabase} from '../lib/supabase';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('sp-theme') ||
    (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sp-theme', theme);
    if (supabase) supabase.auth.getUser().then(({data}) => {
      if (data.user) supabase.from('user_preferences').upsert({user_id:data.user.id,created_by:data.user.id,theme},{onConflict:'user_id'}).then(()=>{});
    });
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
