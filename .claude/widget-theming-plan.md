# Widget Theming Implementation Plan

## Overview
Implement comprehensive theming system for the Software Project Architect widget to match parent application design systems, with a default theme matching Chain Catalyst's purple/violet design.

## 1. Theme System Architecture

### Theme Configuration Interface
```typescript
interface WidgetTheme {
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
```

### Default Chain Catalyst Theme
```typescript
const chainCatalystTheme: WidgetTheme = {
  primary: '#7c3aed',        // Purple-600
  secondary: '#a855f7',      // Purple-500
  accent: '#3b82f6',         // Blue-500
  background: '#f8fafc',     // Gray-50
  surface: '#ffffff',        // White
  text: {
    primary: '#1e293b',      // Slate-800
    secondary: '#475569',    // Slate-600
    muted: '#94a3b8'         // Slate-400
  },
  interactive: {
    hover: '#6d28d9',        // Purple-700
    active: '#5b21b6',       // Purple-800
    disabled: '#e2e8f0'      // Slate-200
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
    color: '#e2e8f0'         // Slate-200
  },
  effects: {
    shadow: {
      small: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      medium: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      large: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
    }
  }
};
```

## 2. Implementation Strategy

### Phase 1: Theme Provider Setup
1. **Create theme context provider** (`lib/theme.ts`)
2. **Update widget auth system** to receive theme from parent
3. **Add CSS custom property application** 
4. **Create theme utilities** for component usage

### Phase 2: Component Theme Integration
1. **Update Chat component** with theme-aware styling
2. **Update IntroChat component** with theme integration
3. **Update progress components** with themed styling
4. **Update form elements** with consistent theming

### Phase 3: Default Theme Application
1. **Implement Chain Catalyst theme** as default
2. **Test theme override** from parent applications
3. **Add theme validation** and fallbacks
4. **Document theming API** for parent apps

## 3. Technical Implementation

### Theme Provider Component
```typescript
// lib/theme.tsx
'use client';
import { createContext, useContext, useEffect, ReactNode } from 'react';

const ThemeContext = createContext<WidgetTheme | null>(null);

export function ThemeProvider({ 
  children, 
  theme 
}: { 
  children: ReactNode; 
  theme?: WidgetTheme;
}) {
  const activeTheme = theme || chainCatalystTheme;
  
  useEffect(() => {
    // Apply CSS custom properties
    const root = document.documentElement;
    
    // Colors
    root.style.setProperty('--widget-primary', activeTheme.primary);
    root.style.setProperty('--widget-secondary', activeTheme.secondary);
    root.style.setProperty('--widget-accent', activeTheme.accent);
    root.style.setProperty('--widget-background', activeTheme.background);
    root.style.setProperty('--widget-surface', activeTheme.surface);
    
    // Text colors
    root.style.setProperty('--widget-text-primary', activeTheme.text.primary);
    root.style.setProperty('--widget-text-secondary', activeTheme.text.secondary);
    root.style.setProperty('--widget-text-muted', activeTheme.text.muted);
    
    // Interactive states
    root.style.setProperty('--widget-hover', activeTheme.interactive.hover);
    root.style.setProperty('--widget-active', activeTheme.interactive.active);
    
    // Typography
    root.style.setProperty('--widget-font-family', activeTheme.typography.fontFamily);
    root.style.setProperty('--widget-font-size-base', activeTheme.typography.fontSize.base);
    
    // Layout
    root.style.setProperty('--widget-spacing-unit', activeTheme.spacing.unit);
    root.style.setProperty('--widget-border-radius', activeTheme.border.radius.medium);
    root.style.setProperty('--widget-border-color', activeTheme.border.color);
    
    // Effects
    root.style.setProperty('--widget-shadow-medium', activeTheme.effects.shadow.medium);
  }, [activeTheme]);
  
  return (
    <ThemeContext.Provider value={activeTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const theme = useContext(ThemeContext);
  return theme || chainCatalystTheme;
};
```

### Component Style Updates
```css
/* Global widget styles using CSS custom properties */
.widget-container {
  background: var(--widget-background);
  color: var(--widget-text-primary);
  font-family: var(--widget-font-family);
}

.widget-button {
  background: var(--widget-primary);
  color: white;
  border-radius: var(--widget-border-radius);
  padding: var(--widget-spacing-unit);
  box-shadow: var(--widget-shadow-medium);
}

.widget-button:hover {
  background: var(--widget-hover);
}

.widget-card {
  background: var(--widget-surface);
  border: 1px solid var(--widget-border-color);
  border-radius: var(--widget-border-radius);
  box-shadow: var(--widget-shadow-medium);
}

.widget-progress-bar {
  background: var(--widget-primary);
}
```

## 4. Parent App Integration

### Theme Passing via URL Parameters
```typescript
// Parent app passes theme
const themeConfig = {
  primary: '#7c3aed',     // Chain Catalyst purple
  secondary: '#a855f7',   // Lighter purple
  accent: '#3b82f6',      // Blue accent
  // ... rest of theme
};

const widgetUrl = `${WIDGET_URL}?token=${token}&theme=${encodeURIComponent(JSON.stringify(themeConfig))}`;
```

### Theme Parsing in Widget
```typescript
// pages/widget.tsx
export default function WidgetPage() {
  const searchParams = useSearchParams();
  const themeParam = searchParams.get('theme');
  
  let theme: WidgetTheme | undefined;
  if (themeParam) {
    try {
      theme = JSON.parse(decodeURIComponent(themeParam));
    } catch (error) {
      console.warn('Invalid theme parameter, using default');
      theme = chainCatalystTheme;
    }
  } else {
    theme = chainCatalystTheme;
  }
  
  return (
    <ThemeProvider theme={theme}>
      <WidgetApp />
    </ThemeProvider>
  );
}
```

## 5. Implementation Benefits

### For Chain Catalyst Integration
- **Seamless visual integration**: Widget appears as native part of parent app
- **Consistent user experience**: Same colors, fonts, spacing throughout
- **Brand consistency**: Maintains Chain Catalyst's purple/violet identity
- **Professional appearance**: No jarring visual transitions

### For Other Parent Apps
- **Flexible theming**: Easy customization for any brand
- **CSS custom properties**: Efficient theme switching
- **Fallback defaults**: Always works even without custom theme
- **Documentation**: Clear theming API for developers

## 6. Testing Plan

### Visual Testing
1. **Default theme**: Verify Chain Catalyst theme matches screenshots
2. **Custom themes**: Test with different color schemes
3. **Theme inheritance**: Confirm parent app theme application
4. **Responsive design**: Ensure theming works across screen sizes

### Integration Testing  
1. **URL parameter parsing**: Theme data passed correctly
2. **CSS property application**: Custom properties applied to DOM
3. **Component styling**: All components use theme variables
4. **Fallback behavior**: Works when no theme provided

## 7. Success Criteria

### Visual Integration
- ✅ Widget matches Chain Catalyst purple/violet design exactly
- ✅ Smooth visual transition between parent app and widget
- ✅ Consistent typography and spacing throughout
- ✅ Professional, integrated appearance

### Technical Integration
- ✅ Theme passed via URL parameters
- ✅ CSS custom properties applied correctly
- ✅ Components use theme variables consistently
- ✅ Graceful fallback to default theme

### Developer Experience
- ✅ Simple theme configuration for parent apps
- ✅ Clear documentation and examples
- ✅ TypeScript support for theme objects
- ✅ Easy customization and testing

This implementation will make the widget feel like a native part of Chain Catalyst rather than an embedded external tool.