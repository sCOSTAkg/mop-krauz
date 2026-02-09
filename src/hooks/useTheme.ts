import { useEffect, useCallback, useMemo } from 'react';
import { AppTheme } from '../types';
import { telegram } from '../services/telegramService';

/** Resolve which effective theme to apply */
function resolveTheme(preference: AppTheme): 'LIGHT' | 'DARK' {
  if (preference === 'LIGHT' || preference === 'DARK') return preference;

  if (preference === 'AUTO') {
    // Time-of-day: dark from 20:00 to 07:00
    const hour = new Date().getHours();
    return hour >= 20 || hour < 7 ? 'DARK' : 'LIGHT';
  }

  // SYSTEM — follow OS preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'DARK' : 'LIGHT';
  }
  return 'LIGHT';
}

function applyTheme(effective: 'LIGHT' | 'DARK') {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');

  if (effective === 'DARK') {
    root.classList.add('dark');
    meta?.setAttribute('content', '#000000');
    if (telegram.isAvailable) {
      telegram.setBackgroundColor('#000000');
      telegram.setHeaderColor('#000000');
    }
  } else {
    root.classList.remove('dark');
    meta?.setAttribute('content', '#F2F2F7');
    if (telegram.isAvailable) {
      telegram.setBackgroundColor('#F2F2F7');
      telegram.setHeaderColor('#F2F2F7');
    }
  }
}

export function useTheme(preference: AppTheme) {
  const effective = useMemo(() => resolveTheme(preference), [preference]);

  // Apply on change
  useEffect(() => {
    applyTheme(effective);
  }, [effective]);

  // Listen to OS changes when SYSTEM mode
  useEffect(() => {
    if (preference !== 'SYSTEM') return;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? 'DARK' : 'LIGHT');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  // Re-check every minute for AUTO mode (time-of-day transitions)
  useEffect(() => {
    if (preference !== 'AUTO') return;
    const interval = setInterval(() => {
      const fresh = resolveTheme('AUTO');
      applyTheme(fresh);
    }, 60_000);
    return () => clearInterval(interval);
  }, [preference]);

  return effective;
}
