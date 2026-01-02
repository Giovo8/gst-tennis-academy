/**
 * Email Template Design System Constants
 * Centralizza tutti i colori e stili utilizzati nelle email HTML
 * Per garantire consistenza visiva e facilità di manutenzione
 */

export const EMAIL_COLORS = {
  // Brand Colors
  primary: '#1e40af',      // Blue-800
  primaryHover: '#2563eb', // Blue-600
  primaryDark: '#1e3a8a',  // Blue-900
  primaryLight: '#3b82f6', // Blue-500
  
  // Background Colors
  background: '#f5f5f5',
  backgroundAlt: '#f9fafb',
  cardBackground: '#ffffff',
  
  // Text Colors
  text: '#333333',
  textDark: '#1e293b',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  textWhite: '#ffffff',
  
  // Border Colors
  border: '#e5e7eb',
  borderLight: '#f1f5f9',
  divider: '#e5e7eb',
  
  // Status Colors
  success: '#10b981',      // Emerald-500
  successDark: '#059669',  // Emerald-600
  successBg: '#d1fae5',    // Emerald-100
  
  warning: '#f59e0b',      // Amber-500
  warningDark: '#d97706',  // Amber-600
  warningBg: '#fef3c7',    // Amber-100
  
  error: '#ef4444',        // Red-500
  errorDark: '#dc2626',    // Red-600
  errorBg: '#fee2e2',      // Red-100
  
  info: '#3b82f6',         // Blue-500
  infoDark: '#2563eb',     // Blue-600
  infoBg: '#dbeafe',       // Blue-100
  
  // Priority Colors (for notifications)
  urgent: '#dc2626',       // Red-600
  high: '#ea580c',         // Orange-600
  medium: '#3b82f6',       // Blue-500
  low: '#64748b',          // Slate-500
} as const;

export const EMAIL_GRADIENTS = {
  primary: `linear-gradient(135deg, ${EMAIL_COLORS.primary} 0%, ${EMAIL_COLORS.primaryLight} 100%)`,
  header: `linear-gradient(135deg, ${EMAIL_COLORS.primary} 0%, ${EMAIL_COLORS.primaryLight} 100%)`,
} as const;

export const EMAIL_SHADOWS = {
  card: '0 2px 8px rgba(0,0,0,0.1)',
  button: '0 1px 3px rgba(0,0,0,0.12)',
} as const;

export const EMAIL_FONTS = {
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fallback: "Arial, sans-serif",
} as const;

export const EMAIL_SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
} as const;

export const EMAIL_BORDER_RADIUS = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

// Utility functions for email styles
export const emailStyles = {
  container: `
    max-width: 600px;
    margin: 0 auto;
    padding: ${EMAIL_SPACING.lg};
    background-color: ${EMAIL_COLORS.background};
  `,
  
  card: `
    background-color: ${EMAIL_COLORS.cardBackground};
    border-radius: ${EMAIL_BORDER_RADIUS.lg};
    padding: ${EMAIL_SPACING.xl};
    box-shadow: ${EMAIL_SHADOWS.card};
  `,
  
  button: (color: keyof typeof EMAIL_COLORS = 'primary') => `
    display: inline-block;
    padding: 12px 24px;
    background-color: ${EMAIL_COLORS[color]};
    color: ${EMAIL_COLORS.textWhite};
    text-decoration: none;
    border-radius: ${EMAIL_BORDER_RADIUS.md};
    font-weight: 600;
  `,
  
  heading: `
    color: ${EMAIL_COLORS.textDark};
    font-weight: 700;
    margin: ${EMAIL_SPACING.md} 0;
  `,
  
  text: `
    color: ${EMAIL_COLORS.text};
    line-height: 1.6;
    margin: ${EMAIL_SPACING.sm} 0;
  `,
} as const;
