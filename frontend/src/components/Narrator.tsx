import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export type NarratorMood = 'neutral' | 'happy' | 'thinking' | 'excited' | 'serious';

interface NarratorProps {
  mood: NarratorMood;
  isTalking?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const MOOD_COLORS: Record<NarratorMood, { primary: string; secondary: string; glow: string }> = {
  neutral: { primary: '#8b5cf6', secondary: '#a78bfa', glow: 'rgba(139,92,246,0.3)' },
  happy: { primary: '#f59e0b', secondary: '#fbbf24', glow: 'rgba(245,158,11,0.3)' },
  thinking: { primary: '#06b6d4', secondary: '#22d3ee', glow: 'rgba(6,182,212,0.3)' },
  excited: { primary: '#ef4444', secondary: '#f87171', glow: 'rgba(239,68,68,0.3)' },
  serious: { primary: '#64748b', secondary: '#94a3b8', glow: 'rgba(100,116,139,0.3)' },
};

const SIZE_MAP = { sm: 80, md: 120, lg: 160 };

export function Narrator({ mood, isTalking = false, size = 'md', className = '' }: NarratorProps) {
  const [blinkOpen, setBlinkOpen] = useState(true);
  const { settings } = useSettings();
  const colors = MOOD_COLORS[mood];
  const s = SIZE_MAP[size];
  const animated = !settings.reduceMotion;

  useEffect(() => {
    if (!animated) return;
    const interval = setInterval(() => {
      setBlinkOpen(false);
      setTimeout(() => setBlinkOpen(true), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [animated]);

  const eyeHeight = blinkOpen ? s * 0.06 : s * 0.015;
  const mouthWidth = isTalking ? s * 0.15 : s * 0.08;
  const mouthHeight = isTalking ? s * 0.08 : s * 0.02;

  return (
    <div className={`relative ${className}`} style={{ width: s, height: s }}>
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-full animate-pulse"
        style={{ background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`, transform: 'scale(1.3)' }}
      />

      <svg viewBox="0 0 100 100" className={`relative z-10 ${animated ? (isTalking ? 'narrator-talking' : 'narrator-idle') : ''}`}>
        {/* Head */}
        <circle cx="50" cy="50" r="38" fill={colors.primary} opacity="0.15" stroke={colors.primary} strokeWidth="2" />
        <circle cx="50" cy="50" r="30" fill={colors.primary} opacity="0.25" />

        {/* Hat/headwrap */}
        <path
          d="M 25 42 Q 25 22 50 20 Q 75 22 75 42"
          fill={colors.secondary}
          opacity="0.6"
        />
        <path
          d="M 28 42 Q 28 28 50 26 Q 72 28 72 42"
          fill={colors.primary}
          opacity="0.4"
        />

        {/* Face area */}
        <ellipse cx="50" cy="55" rx="22" ry="20" fill="#1e293b" opacity="0.6" />

        {/* Eyes */}
        <ellipse cx="40" cy="52" rx={s * 0.04} ry={eyeHeight} fill={colors.secondary}>
          <animate attributeName="ry" values={`${eyeHeight};${eyeHeight}`} dur="0.15s" />
        </ellipse>
        <ellipse cx="60" cy="52" rx={s * 0.04} ry={eyeHeight} fill={colors.secondary}>
          <animate attributeName="ry" values={`${eyeHeight};${eyeHeight}`} dur="0.15s" />
        </ellipse>

        {/* Eye shine */}
        {blinkOpen && (
          <>
            <circle cx="42" cy="50" r="1.5" fill="white" opacity="0.8" />
            <circle cx="62" cy="50" r="1.5" fill="white" opacity="0.8" />
          </>
        )}

        {/* Eyebrows - mood-dependent */}
        {mood === 'happy' && (
          <>
            <path d="M 34 47 Q 40 44 46 47" stroke={colors.secondary} strokeWidth="1.5" fill="none" />
            <path d="M 54 47 Q 60 44 66 47" stroke={colors.secondary} strokeWidth="1.5" fill="none" />
          </>
        )}
        {mood === 'thinking' && (
          <>
            <path d="M 34 46 L 46 48" stroke={colors.secondary} strokeWidth="1.5" fill="none" />
            <path d="M 54 48 L 66 46" stroke={colors.secondary} strokeWidth="1.5" fill="none" />
          </>
        )}
        {mood === 'serious' && (
          <>
            <path d="M 34 48 L 46 48" stroke={colors.secondary} strokeWidth="1.5" fill="none" />
            <path d="M 54 48 L 66 48" stroke={colors.secondary} strokeWidth="1.5" fill="none" />
          </>
        )}
        {mood === 'excited' && (
          <>
            <path d="M 34 45 Q 40 42 46 45" stroke={colors.secondary} strokeWidth="2" fill="none" />
            <path d="M 54 45 Q 60 42 66 45" stroke={colors.secondary} strokeWidth="2" fill="none" />
          </>
        )}

        {/* Mouth */}
        <ellipse cx="50" cy="62" rx={mouthWidth} ry={mouthHeight} fill={colors.secondary} opacity="0.8">
          {isTalking && animated && (
            <animate
              attributeName="ry"
              values={`${s * 0.02};${s * 0.08};${s * 0.04};${s * 0.07};${s * 0.02}`}
              dur="0.6s"
              repeatCount="indefinite"
            />
          )}
        </ellipse>

        {/* Decorative dots (like traditional face markings) */}
        <circle cx="33" cy="58" r="1.2" fill={colors.secondary} opacity="0.4" />
        <circle cx="67" cy="58" r="1.2" fill={colors.secondary} opacity="0.4" />
      </svg>
    </div>
  );
}
