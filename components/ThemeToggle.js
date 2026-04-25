import React, { useEffect, useState } from 'react';

// Toggles the `dark` class on <html> and persists the choice in localStorage.
// The initial paint is handled by the inline script in _document.js so this
// component only mirrors that state and updates it on user action.
const ThemeToggle = () => {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next === 'dark');
    }
    try {
      window.localStorage.setItem('theme', next);
    } catch (e) {
      // ignore storage errors (private mode, quota)
    }
  };

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label="Toggle theme"
      className="flex items-center justify-center w-9 h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--text-muted)] hover:text-[color:var(--accent)] hover:border-[color:var(--accent)] transition-colors"
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;
