'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
  c: typeof darkColors;
}

const lightColors = {
  bg: '#f8fafc',
  surface: '#ffffff',
  surfaceHover: '#f8fafc',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#1e293b',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  sidebar: 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)',
  sidebarBorder: 'rgba(255,255,255,0.07)',
  topbar: '#ffffff',
  topbarBorder: '#e2e8f0',
  input: '#ffffff',
  inputBg: '#f1f5f9',
  shadow: '0 1px 4px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.08)',
  badge: '#f1f5f9',
  badgeText: '#475569',
};

const darkColors = {
  bg: '#0f172a',
  surface: '#1e293b',
  surfaceHover: '#263348',
  border: '#334155',
  borderLight: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  sidebar: 'linear-gradient(160deg,#020617 0%,#0f172a 100%)',
  sidebarBorder: 'rgba(255,255,255,0.05)',
  topbar: '#1e293b',
  topbarBorder: '#334155',
  input: '#1e293b',
  inputBg: '#0f172a',
  shadow: '0 1px 4px rgba(0,0,0,0.3)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.4)',
  badge: '#334155',
  badgeText: '#94a3b8',
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
  c: lightColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = localStorage.getItem('finora-theme') as Theme;
    if (saved) setTheme(saved);
  }, []);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('finora-theme', next);
  }

  const isDark = theme === 'dark';
  const c = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark, c }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
