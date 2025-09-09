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
    if (typeof window === 'undefined') {
      console.log('🔍 DEBUG: Server-side rendering, no URL params available');
      return {};
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    
    // 🐛 DEBUG: Log all URL parameters
    console.log('🔍 DEBUG: Full URL:', window.location.href);
    console.log('🔍 DEBUG: URL Search Params:', window.location.search);
    console.log('🔍 DEBUG: URL Hash:', window.location.hash);
    console.log('🔍 DEBUG: All URL Params:');
    const allParams: Record<string, string> = {};
    urlParams.forEach((value, key) => {
      allParams[key] = value;
      console.log(`  ${key}: "${value}"`);
    });
    
    // Also check for hash-based parameters (sometimes used by SPAs)
    if (window.location.hash.includes('=')) {
      console.log('🔍 DEBUG: Found hash-based params, parsing...');
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      hashParams.forEach((value, key) => {
        console.log(`  hash-${key}: "${value}"`);
      });
    }
    
    let externalId = urlParams.get('externalId') || undefined;
    const token = urlParams.get('token') || undefined;
    
    // 🔍 If no externalId in URL but we have a token, try to decode it
    if (!externalId && token) {
      try {
        console.log('🔍 DEBUG: No externalId in URL, attempting to decode JWT token...');
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          // Decode JWT payload (base64url)
          const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
          console.log('🔍 DEBUG: JWT payload decoded:', payload);
          
          // Try common JWT field names for external ID
          const possibleExternalIdFields = ['externalId', 'external_id', 'userId', 'user_id', 'sub', 'uid', 'id'];
          for (const field of possibleExternalIdFields) {
            if (payload[field]) {
              externalId = String(payload[field]);
              console.log(`🔍 DEBUG: Found externalId in JWT.${field}:`, externalId);
              break;
            }
          }
          
          if (!externalId) {
            console.log('🔍 DEBUG: No recognizable externalId field found in JWT payload');
            console.log('🔍 DEBUG: Available JWT fields:', Object.keys(payload));
          }
        }
      } catch (error) {
        console.log('🔍 DEBUG: Failed to decode JWT token:', error);
      }
    }

    const config = {
      token,
      externalId,
      parentAuthEndpoint: urlParams.get('authEndpoint') || undefined,
      theme: WidgetAuth.extractThemeFromParams(urlParams)
    };
    
    console.log('🔍 DEBUG: Extracted Auth Config:', {
      hasToken: !!config.token,
      tokenPreview: config.token ? config.token.substring(0, 10) + '...' : 'none',
      tokenFull: config.token, // Show full token for debugging
      externalId: config.externalId,
      externalIdSource: externalId ? (urlParams.get('externalId') ? 'URL_PARAM' : 'JWT_PAYLOAD') : 'NOT_FOUND',
      externalIdType: typeof config.externalId,
      hasParentAuthEndpoint: !!config.parentAuthEndpoint,
      parentAuthEndpoint: config.parentAuthEndpoint,
      hasTheme: !!config.theme,
      allFoundParams: allParams
    });
    
    return config;
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
    console.log('🔍 DEBUG: Starting token verification with config:', {
      hasToken: !!this.config.token,
      tokenPreview: this.config.token ? this.config.token.substring(0, 10) + '...' : 'none',
      externalId: this.config.externalId,
      hasParentAuthEndpoint: !!this.config.parentAuthEndpoint,
      parentAuthEndpoint: this.config.parentAuthEndpoint
    });
    
    if (!this.config.token) {
      // No token provided, assume development mode or standalone usage
      console.log('🔍 DEBUG: No token provided, returning standalone user');
      const response = {
        valid: true,
        externalId: this.config.externalId || 'standalone_user',
        theme: this.config.theme
      };
      console.log('🔍 DEBUG: Standalone response:', response);
      return response;
    }

    if (!this.config.parentAuthEndpoint) {
      console.warn('🔍 DEBUG: No parent auth endpoint provided, skipping verification');
      console.log('🔍 DEBUG: Available config:', {
        hasToken: !!this.config.token,
        tokenValue: this.config.token,
        externalId: this.config.externalId,
        hasParentAuthEndpoint: !!this.config.parentAuthEndpoint,
        parentAuthEndpoint: this.config.parentAuthEndpoint
      });
      
      // 🚨 CRITICAL: This is where "unverified_user" comes from!
      // If umbrella app sends externalId but no authEndpoint, we should use the externalId
      const finalExternalId = this.config.externalId || 'unverified_user';
      console.warn('🚨 CRITICAL PATH: Using finalExternalId:', {
        configExternalId: this.config.externalId,
        finalExternalId,
        isUnverified: finalExternalId === 'unverified_user'
      });
      
      const response = {
        valid: true,
        externalId: finalExternalId,
        theme: this.config.theme
      };
      console.log('🔍 DEBUG: Unverified response (THIS IS LIKELY THE ISSUE):', response);
      return response;
    }

    try {
      console.log('🔍 DEBUG: Making auth verification request to:', this.config.parentAuthEndpoint);
      console.log('🔍 DEBUG: Request payload:', {
        externalId: this.config.externalId
      });
      
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
      
      console.log('🔍 DEBUG: Auth verification response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorMessage = `Auth verification failed: ${response.status} ${response.statusText}`;
        console.log('🔍 DEBUG: Auth verification failed with non-ok response:', errorMessage);
        return {
          valid: false,
          error: errorMessage
        };
      }

      const data = await response.json();
      console.log('🔍 DEBUG: Auth verification response data:', data);
      
      const verificationResult = {
        valid: data.valid || false,
        userId: data.userId,
        externalId: data.externalId || this.config.externalId,
        theme: data.theme || this.config.theme,
        error: data.error
      };
      
      console.log('🔍 DEBUG: Final verification result:', verificationResult);
      return verificationResult;
    } catch (error) {
      console.error('🔍 DEBUG: Auth verification failed with error:', error);
      const errorResult = {
        valid: false,
        error: `Auth verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      console.log('🔍 DEBUG: Error result:', errorResult);
      return errorResult;
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
   * Update auth configuration
   */
  updateAuthConfig(updates: Partial<AuthConfig>): void {
    this.config = { ...this.config, ...updates };
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
  console.log('🔐 DEBUG: initializeWidgetAuth() called (LEGACY FUNCTION)');
  console.log('🔐 DEBUG: Consider using the new AuthProvider instead');
  
  const authConfig = WidgetAuth.extractAuthFromParams();
  widgetAuth = new WidgetAuth(authConfig);
  
  console.log('🔐 DEBUG: Created legacy WidgetAuth with config:', {
    hasToken: !!authConfig.token,
    externalId: authConfig.externalId,
    hasParentAuthEndpoint: !!authConfig.parentAuthEndpoint
  });
  
  // Set up parent communication
  widgetAuth.setupParentCommunication();
  
  // Apply initial theme if provided
  if (authConfig.theme) {
    widgetAuth.applyTheme(authConfig.theme);
  }
  
  // Verify token
  console.log('🔐 DEBUG: Starting token verification...');
  return widgetAuth.verifyToken();
}