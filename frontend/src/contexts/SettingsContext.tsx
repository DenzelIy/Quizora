import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface AppSettings {
  reduceMotion: boolean;
  highContrast: boolean;
  largerText: boolean;
  ttsEnabled: boolean;
  soundEnabled: boolean;
}

const STORAGE_KEY = 'quizora-settings';

const defaults: AppSettings = {
  reduceMotion: false,
  highContrast: false,
  largerText: false,
  ttsEnabled: false,
  soundEnabled: true,
};

interface SettingsContextValue {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaults, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return { ...defaults };
}

function applyAttributes(s: AppSettings) {
  const root = document.documentElement;
  root.setAttribute('data-reduce-motion', String(s.reduceMotion));
  root.setAttribute('data-high-contrast', String(s.highContrast));
  root.setAttribute('data-larger-text', String(s.largerText));
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    applyAttributes(settings);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
