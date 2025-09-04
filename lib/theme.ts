'use client';

export interface WidgetTheme {
  // Colors
  primary: string;           // Main brand color
  secondary: string;         // Secondary brand color  
  accent: string;           // Accent/highlight color
  background: string;       // Page background
  surface: string;          // Card/surface background
  text: {
    primary: string;        // Main text color
    secondary: string;      // Secondary text color
    muted: string;         // Muted/disabled text
  };
  
  // Interactive States
  interactive: {
    hover: string;          // Hover state color
    active: string;         // Active/pressed state
    disabled: string;       // Disabled state
  };
  
  // Status Colors
  status: {
    success: string;        // Success/completed
    warning: string;        // Warning states
    error: string;         // Error states
    info: string;          // Info/neutral
  };
  
  // Layout
  spacing: {
    unit: string;          // Base spacing unit (1rem)
    small: string;         // Small spacing
    medium: string;        // Medium spacing
    large: string;         // Large spacing
  };
  
  // Typography
  typography: {
    fontFamily: string;    // Primary font stack
    fontSize: {
      small: string;       // Small text
      base: string;        // Base text size
      large: string;       // Large text
      xlarge: string;      // Extra large text
    };
    fontWeight: {
      normal: string;      // Normal weight
      medium: string;      // Medium weight
      bold: string;        // Bold weight
    };
  };
  
  // Border & Radius
  border: {
    radius: {
      small: string;       // Small radius (4px)
      medium: string;      // Medium radius (8px) 
      large: string;       // Large radius (12px)
    };
    width: string;         // Border width
    color: string;         // Border color
  };
  
  // Effects
  effects: {
    shadow: {
      small: string;       // Small shadow
      medium: string;      // Medium shadow
      large: string;       // Large shadow
    };
  };
}

// Chain Catalyst Default Theme - Dark purple gradient with white text
export const chainCatalystTheme: WidgetTheme = {
  primary: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', // Green to blue gradient for accent buttons
  secondary: '#253d63',      // Blue accent for secondary elements  
  accent: '#f97316',         // Orange for Send button
  background: 'linear-gradient(135deg, #271c48 0%, #431c6d 50%, #581889 100%)', // Darker purple gradient
  surface: 'rgba(255, 255, 255, 0.1)', // Semi-transparent white
  text: {
    primary: '#ffffff',      // White text
    secondary: '#e2e8f0',    // Light gray on purple
    muted: '#cbd5e1'         // Muted white
  },
  interactive: {
    hover: '#1d3456',        // Darker blue for hover
    active: '#253d63',       // Blue for active state
    disabled: 'rgba(255, 255, 255, 0.2)' // Semi-transparent white
  },
  status: {
    success: '#10b981',      // Emerald-500
    warning: '#f59e0b',      // Amber-500
    error: '#ef4444',        // Red-500
    info: '#06b6d4'          // Cyan-500
  },
  spacing: {
    unit: '1rem',
    small: '0.5rem',
    medium: '1rem', 
    large: '2rem'
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      small: '0.875rem',     // 14px
      base: '1rem',          // 16px
      large: '1.125rem',     // 18px
      xlarge: '1.25rem'      // 20px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      bold: '600'
    }
  },
  border: {
    radius: {
      small: '4px',
      medium: '8px',
      large: '12px'
    },
    width: '1px',
    color: 'rgba(255, 255, 255, 0.3)' // Semi-transparent white for purple background
  },
  effects: {
    shadow: {
      small: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      medium: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      large: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
    }
  }
};

export function applyTheme(theme: WidgetTheme | null | undefined) {
  // Safety check - always fall back to Chain Catalyst theme
  if (!theme) {
    console.warn('No theme provided to applyTheme, using Chain Catalyst default');
    theme = chainCatalystTheme;
  }
  
  // Additional safety check for theme structure
  if (!theme.primary || !theme.text || !theme.interactive || !theme.status) {
    console.error('Invalid theme structure, using Chain Catalyst default:', theme);
    theme = chainCatalystTheme;
  }
  
  const root = document.documentElement;
  
  console.log('🎨 Applying theme:', { primary: theme.primary, background: theme.background });
  
  // Colors
  root.style.setProperty('--widget-primary', theme.primary);
  root.style.setProperty('--widget-secondary', theme.secondary);
  root.style.setProperty('--widget-accent', theme.accent);
  root.style.setProperty('--widget-background', theme.background);
  root.style.setProperty('--widget-surface', theme.surface);
  
  // Text colors
  root.style.setProperty('--widget-text-primary', theme.text.primary);
  root.style.setProperty('--widget-text-secondary', theme.text.secondary);
  root.style.setProperty('--widget-text-muted', theme.text.muted);
  
  // Interactive states
  root.style.setProperty('--widget-hover', theme.interactive.hover);
  root.style.setProperty('--widget-active', theme.interactive.active);
  root.style.setProperty('--widget-disabled', theme.interactive.disabled);
  
  // Status colors
  root.style.setProperty('--widget-success', theme.status.success);
  root.style.setProperty('--widget-warning', theme.status.warning);
  root.style.setProperty('--widget-error', theme.status.error);
  root.style.setProperty('--widget-info', theme.status.info);
  
  // Typography
  root.style.setProperty('--widget-font-family', theme.typography.fontFamily);
  root.style.setProperty('--widget-font-size-small', theme.typography.fontSize.small);
  root.style.setProperty('--widget-font-size-base', theme.typography.fontSize.base);
  root.style.setProperty('--widget-font-size-large', theme.typography.fontSize.large);
  root.style.setProperty('--widget-font-size-xlarge', theme.typography.fontSize.xlarge);
  root.style.setProperty('--widget-font-weight-normal', theme.typography.fontWeight.normal);
  root.style.setProperty('--widget-font-weight-medium', theme.typography.fontWeight.medium);
  root.style.setProperty('--widget-font-weight-bold', theme.typography.fontWeight.bold);
  
  // Layout
  root.style.setProperty('--widget-spacing-small', theme.spacing.small);
  root.style.setProperty('--widget-spacing-medium', theme.spacing.medium);
  root.style.setProperty('--widget-spacing-large', theme.spacing.large);
  root.style.setProperty('--widget-border-radius-small', theme.border.radius.small);
  root.style.setProperty('--widget-border-radius-medium', theme.border.radius.medium);
  root.style.setProperty('--widget-border-radius-large', theme.border.radius.large);
  root.style.setProperty('--widget-border-color', theme.border.color);
  
  // Effects
  root.style.setProperty('--widget-shadow-small', theme.effects.shadow.small);
  root.style.setProperty('--widget-shadow-medium', theme.effects.shadow.medium);
  root.style.setProperty('--widget-shadow-large', theme.effects.shadow.large);
}

export function parseThemeFromUrl(): WidgetTheme | null {
  if (typeof window === 'undefined') {
    console.log('🎨 Server-side rendering, no URL theme parsing');
    return null;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const themeParam = urlParams.get('theme');
  
  console.log('🎨 Theme URL parameter:', themeParam ? 'Found' : 'Not found');
  
  if (!themeParam) return null;
  
  try {
    const parsed = JSON.parse(decodeURIComponent(themeParam)) as WidgetTheme;
    console.log('🎨 Parsed URL theme successfully:', { primary: parsed.primary });
    return parsed;
  } catch (error) {
    console.warn('🎨 Invalid theme parameter, using Chain Catalyst default:', error);
    return null;
  }
}