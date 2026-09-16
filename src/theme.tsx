import React from 'react';
import type { ThemeName } from '../design-system';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
});

const STORAGE_KEY = 'msl-theme';

function readStored(): ThemeName {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* private mode, blocked storage — fall through to the default */
  }
  return 'dark';
}

/**
 * Owns the theme and writes it to <html data-theme>, which is what
 * design-system/tokens/theme-light.css keys off.
 *
 * Dark is the default and the canonical theme — see DESIGN.md → Colour.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<ThemeName>(readStored);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* not fatal — the theme still applies for this session */
    }
  }, [theme]);

  const value = React.useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
