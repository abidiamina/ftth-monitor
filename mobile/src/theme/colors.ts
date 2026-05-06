import { useColorScheme } from 'react-native';

export const palette = {
  indigo: '#6366f1',
  indigoGlow: 'rgba(99, 102, 241, 0.2)',
  sky: '#0ea5e9',
  teal: '#0d9488',
  tealSoft: '#d9f6f2',
  slate900: '#0f172a',
  slate800: '#1e293b',
  slate700: '#334155',
  slate400: '#94a3b8',
  slate50: '#f8fafc',
  white: '#ffffff',
  danger: '#ef4444',
  success: '#10b981',
};

const light = {
  bg: '#f1f5f9',
  surface: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  primary: palette.teal,
  primarySoft: palette.tealSoft,
  live: palette.indigo,
  border: '#e2e8f0',
  danger: palette.danger,
  success: palette.success,
  info: '#3b82f6',
  shadow: '#000000',
};

const dark = {
  bg: '#020617',
  surface: '#0f172a',
  text: '#f8fafc',
  muted: '#94a3b8',
  primary: '#2dd4bf', // Brighter teal for dark mode
  primarySoft: 'rgba(45, 212, 191, 0.1)',
  live: palette.indigo,
  border: '#1e293b',
  danger: '#f87171',
  success: '#34d399',
  info: '#60a5fa',
  shadow: '#000000',
};

export const colors = light; // Fallback

export function useThemeColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}
