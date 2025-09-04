export interface AuthConfig {
  token?: string;
  externalId?: string;
  parentAuthEndpoint?: string;
  theme?: ThemeConfig;
}

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  borderRadius?: string;
  fontFamily?: string;
  spacingUnit?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface AuthVerificationResponse {
  valid: boolean;
  userId?: string;
  externalId?: string;
  theme?: ThemeConfig;
  error?: string;
}

export class WidgetAuth {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  /**
   * Extract auth config from URL parameters or iframe context
   */
  static extractAuthFromParams(): AuthConfig {
    const urlParams = new URLSearchParams(window.location.search);
    
    return {
      token: urlParams.get('token') || undefined,
      externalId: urlParams.get('externalId') || undefined,
      parentAuthEndpoint: urlParams.get('authEndpoint') || undefined,
      theme: WidgetAuth.extractThemeFromParams(urlParams)
    };
  }

  /**
   * Extract theme configuration from URL parameters
   */
  private static extractThemeFromParams(urlParams: URLSearchParams): ThemeConfig | undefined {
    const themeParam = urlParams.get('theme');
    if (themeParam) {
      try {
        return JSON.parse(decodeURIComponent(themeParam));
      } catch (error) {
        console.warn('Invalid theme parameter:', error);
      }
    }

    // Extract individual theme properties
    const theme: ThemeConfig = {};
    const primaryColor = urlParams.get('primaryColor');
    const secondaryColor = urlParams.get('secondaryColor');
    const borderRadius = urlParams.get('borderRadius');
    const fontFamily = urlParams.get('fontFamily');
    const spacingUnit = urlParams.get('spacingUnit');
    const backgroundColor = urlParams.get('backgroundColor');
    const textColor = urlParams.get('textColor');

    if (primaryColor) theme.primaryColor = primaryColor;
    if (secondaryColor) theme.secondaryColor = secondaryColor;
    if (borderRadius) theme.borderRadius = borderRadius;
    if (fontFamily) theme.fontFamily = decodeURIComponent(fontFamily);
    if (spacingUnit) theme.spacingUnit = spacingUnit;
    if (backgroundColor) theme.backgroundColor = backgroundColor;
    if (textColor) theme.textColor = textColor;

    return Object.keys(theme).length > 0 ? theme : undefined;
  }

  /**
   * Verify auth token with parent application
   */
  async verifyToken(): Promise<AuthVerificationResponse> {
    if (!this.config.token) {
      // No token provided, assume development mode or standalone usage
      return {
        valid: true,
        externalId: this.config.externalId || 'standalone_user',
        theme: this.config.theme
      };
    }

    if (!this.config.parentAuthEndpoint) {
      console.warn('No parent auth endpoint provided, skipping verification');
      return {
        valid: true,
        externalId: this.config.externalId || 'unverified_user',
        theme: this.config.theme
      };
    }

    try {
      const response = await fetch(this.config.parentAuthEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          externalId: this.config.externalId
        })
      });

      if (!response.ok) {
        return {
          valid: false,
          error: `Auth verification failed: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        valid: data.valid || false,
        userId: data.userId,
        externalId: data.externalId || this.config.externalId,
        theme: data.theme || this.config.theme,
        error: data.error
      };
    } catch (error) {
      console.error('Auth verification failed:', error);
      return {
        valid: false,
        error: `Auth verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Set up postMessage communication with parent window
   */
  setupParentCommunication() {
    // Listen for theme updates from parent
    window.addEventListener('message', (event) => {
      if (event.data.type === 'THEME_UPDATE') {
        this.applyTheme(event.data.theme);
      } else if (event.data.type === 'AUTH_UPDATE') {
        this.config.token = event.data.token;
        this.config.externalId = event.data.externalId;
      }
    });

    // Notify parent that widget is ready
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'WIDGET_READY',
        externalId: this.config.externalId
      }, '*');
    }
  }

  /**
   * Apply theme configuration to the document
   */
  applyTheme(theme: ThemeConfig) {
    const root = document.documentElement;
    
    if (theme.primaryColor) {
      root.style.setProperty('--widget-primary-color', theme.primaryColor);
    }
    if (theme.secondaryColor) {
      root.style.setProperty('--widget-secondary-color', theme.secondaryColor);
    }
    if (theme.borderRadius) {
      root.style.setProperty('--widget-border-radius', theme.borderRadius);
    }
    if (theme.fontFamily) {
      root.style.setProperty('--widget-font-family', theme.fontFamily);
    }
    if (theme.spacingUnit) {
      root.style.setProperty('--widget-spacing-unit', theme.spacingUnit);
    }
    if (theme.backgroundColor) {
      root.style.setProperty('--widget-background-color', theme.backgroundColor);
    }
    if (theme.textColor) {
      root.style.setProperty('--widget-text-color', theme.textColor);
    }

    // Update the config
    this.config.theme = { ...this.config.theme, ...theme };
  }

  /**
   * Get current theme configuration
   */
  getTheme(): ThemeConfig | undefined {
    return this.config.theme;
  }

  /**
   * Get current external ID
   */
  getExternalId(): string | undefined {
    return this.config.externalId;
  }

  /**
   * Send message to parent application
   */
  sendToParent(message: any) {
    if (window.parent !== window) {
      window.parent.postMessage({
        source: 'software-architect-widget',
        ...message
      }, '*');
    }
  }
}

/**
 * Global widget auth instance
 */
export let widgetAuth: WidgetAuth | null = null;

/**
 * Initialize widget authentication
 */
export function initializeWidgetAuth(): Promise<AuthVerificationResponse> {
  const authConfig = WidgetAuth.extractAuthFromParams();
  widgetAuth = new WidgetAuth(authConfig);
  
  // Set up parent communication
  widgetAuth.setupParentCommunication();
  
  // Apply initial theme if provided
  if (authConfig.theme) {
    widgetAuth.applyTheme(authConfig.theme);
  }
  
  // Verify token
  return widgetAuth.verifyToken();
}