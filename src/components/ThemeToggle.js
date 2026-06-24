'use client';

import { useState, useEffect } from 'react';

/**
 * Global Theme Toggle (Client Component)
 * 
 * Floating action button that toggles the site between Light and Dark mode.
 * Persists the user's preference in `localStorage` and falls back to their
 * OS preference (`prefers-color-scheme`) if no stored value exists.
 * Injects `data-theme` on the `<html>` element which is intercepted by `globals.css`.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if theme exists in local storage
    const storedTheme = localStorage.getItem('recruitflow-theme');
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.setAttribute('data-theme', storedTheme);
    } else {
      // Check OS preference
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      if (prefersLight) {
        setTheme('light');
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('recruitflow-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Prevent hydration mismatch by not rendering anything until mounted
  if (!mounted) return null;

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-subtle)',
        borderRadius: '9999px',
        padding: '0.25rem',
        gap: '0.25rem',
        border: '1px solid var(--border-light)'
      }}
      aria-label="Toggle Light/Dark Theme"
      title="Toggle Light/Dark Theme"
    >
      <button
        onClick={() => {
          setTheme('light');
          localStorage.setItem('recruitflow-theme', 'light');
          document.documentElement.setAttribute('data-theme', 'light');
        }}
        style={{
          background: theme === 'light' ? 'var(--color-surface-100)' : 'transparent',
          color: theme === 'light' ? 'var(--color-surface-900)' : 'var(--color-surface-400)',
          border: 'none',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: theme === 'light' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
          fontSize: '0.875rem'
        }}
      >
        ☀️
      </button>
      <button
        onClick={() => {
          setTheme('dark');
          localStorage.setItem('recruitflow-theme', 'dark');
          document.documentElement.setAttribute('data-theme', 'dark');
        }}
        style={{
          background: theme === 'dark' ? 'var(--color-surface-800)' : 'transparent',
          color: theme === 'dark' ? 'var(--color-surface-100)' : 'var(--color-surface-400)',
          border: 'none',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.3)' : 'none',
          fontSize: '0.875rem'
        }}
      >
        🌙
      </button>
    </div>
  );
}
