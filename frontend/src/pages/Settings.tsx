import { Settings as SettingsIcon, Accessibility, Volume2, Info } from 'lucide-react';
import { useSettings, type AppSettings } from '../contexts/SettingsContext';
import { Card } from '../components/Card';

function Toggle({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-3 text-left"
    >
      <div className="pr-4">
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-slate-400 mt-0.5">{description}</div>
      </div>
      <div
        className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${
          checked ? 'bg-violet-500' : 'bg-slate-600'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}

export function Settings() {
  const { settings, updateSetting } = useSettings();

  const toggles: { section: string; icon: React.ReactNode; items: { key: keyof AppSettings; label: string; description: string }[] }[] = [
    {
      section: 'Accessibility',
      icon: <Accessibility className="w-4 h-4 text-violet-400" />,
      items: [
        { key: 'reduceMotion', label: 'Reduce Motion', description: 'Disables animations, typewriter effects, and narrator animation' },
        { key: 'highContrast', label: 'High Contrast Mode', description: 'Increases contrast for better text readability' },
        { key: 'largerText', label: 'Larger Text', description: 'Increases base font size across the app' },
      ],
    },
    {
      section: 'Audio',
      icon: <Volume2 className="w-4 h-4 text-cyan-400" />,
      items: [
        { key: 'ttsEnabled', label: 'Text-to-Speech Narration', description: 'Read story text aloud in Griot Mode' },
        { key: 'soundEnabled', label: 'Sound Effects', description: 'Play sounds for correct answers and transitions' },
      ],
    },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-slate-300" />
        </div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {toggles.map(group => (
        <Card key={group.section}>
          <div className="flex items-center gap-2 mb-2">
            {group.icon}
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{group.section}</h2>
          </div>
          <div className="divide-y divide-slate-700/50">
            {group.items.map(item => (
              <Toggle
                key={item.key}
                label={item.label}
                description={item.description}
                checked={settings[item.key] as boolean}
                onChange={v => updateSetting(item.key, v)}
              />
            ))}
          </div>
        </Card>
      ))}

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">About</h2>
        </div>
        <div className="space-y-1 text-sm text-slate-400">
          <p className="text-white font-medium">Quizora</p>
          <p>Version 1.0.0</p>
          <p>Offline Multiplayer Quiz Platform</p>
        </div>
      </Card>
    </div>
  );
}
