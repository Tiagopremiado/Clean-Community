import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  feedDensity: 'comfortable' | 'compact';
  openLinksInNewTab: boolean;
  defaultCategory: string;
  autoWebpNotice: boolean;
  reducedMotion: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  feedDensity: 'comfortable',
  openLinksInNewTab: true,
  defaultCategory: 'todos',
  autoWebpNotice: true,
  reducedMotion: false,
};

interface SettingsContextType {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
  resolvedTheme: 'light' | 'dark';
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSetting: () => {},
  resetSettings: () => {},
  resolvedTheme: 'light',
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedTheme = settings.theme === 'system' ? systemTheme : settings.theme;

  useEffect(() => {
    // Apply or remove dark class on root element
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, resolvedTheme }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
