'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if theme exists in local storage
    const storedTheme = localStorage.getItem('theme');
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
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Prevent hydration mismatch by not rendering anything until mounted
  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        width: '3.5rem',
        height: '3.5rem',
        borderRadius: '50%',
        background: 'var(--color-surface-800)',
        border: '1px solid var(--color-surface-700)',
        color: 'var(--color-surface-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        cursor: 'pointer',
        zIndex: 9999,
        boxShadow: 'var(--shadow-glass)',
        transition: 'all 0.2s',
      }}
      className="hover-row"
      aria-label="Toggle Light/Dark Theme"
      title="Toggle Light/Dark Theme"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
