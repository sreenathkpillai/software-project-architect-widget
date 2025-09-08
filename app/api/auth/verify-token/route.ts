import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Auth Token Verification API for Parent App Integration
 * 
 * This endpoint verifies JWT tokens from parent applications to enable
 * secure widget integration via iframe embedding.
 * 
 * Expected flow:
 * 1. Parent app embeds widget: <iframe src="https://architect.yourapp.com?token=jwt_token&externalId=user_123" />
 * 2. Widget calls this endpoint to verify token authenticity
 * 3. Returns user info and theme configuration if valid
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, parentAppUrl } = body;
    
    // 🐛 DEBUG: Log verification request
    console.log('🔐 API DEBUG: Auth verification request:', {
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
      parentAppUrl,
      fullBody: body
    });

    if (!token) {
      console.log('🔐 API DEBUG: No token provided');
      return NextResponse.json({ 
        valid: false, 
        error: 'Token required' 
      }, { status: 400 });
    }

    // For standalone widget operation, we'll implement multiple verification strategies
    const verificationStrategy = process.env.AUTH_VERIFICATION_STRATEGY || 'bypass_dev';
    
    console.log('🔐 API DEBUG: Using verification strategy:', verificationStrategy);

    switch (verificationStrategy) {
      case 'parent_app_endpoint':
        return await verifyViaParentApp(token, parentAppUrl);
      
      case 'jwt_secret':
        return await verifyViaSharedSecret(token);
      
      case 'bypass_dev':
        // Development mode bypass - only use in dev environment
        console.log('🔐 API DEBUG: Using bypass_dev strategy, NODE_ENV:', process.env.NODE_ENV);
        if (process.env.NODE_ENV === 'development') {
          return await bypassForDevelopment(token);
        }
        return NextResponse.json({ 
          valid: false, 
          error: 'Invalid verification strategy for production' 
        }, { status: 400 });
      
      default:
        return NextResponse.json({ 
          valid: false, 
          error: 'Unknown verification strategy' 
        }, { status: 500 });
    }

  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'Token verification failed' 
    }, { status: 500 });
  }
}

/**
 * Verify token by calling parent app's verification endpoint
 */
async function verifyViaParentApp(token: string, parentAppUrl?: string) {
  if (!parentAppUrl || !process.env.PARENT_APP_VERIFICATION_ENDPOINT) {
    return NextResponse.json({ 
      valid: false, 
      error: 'Parent app URL or verification endpoint not configured' 
    }, { status: 400 });
  }

  try {
    const verificationUrl = `${parentAppUrl}${process.env.PARENT_APP_VERIFICATION_ENDPOINT}`;
    
    const response = await fetch(verificationUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Parent app rejected token' 
      }, { status: 401 });
    }

    const data = await response.json();
    
    return NextResponse.json({
      valid: true,
      userId: data.userId,
      externalId: data.externalId || data.userId,
      theme: data.theme || getDefaultTheme(),
      userInfo: {
        name: data.name,
        email: data.email,
        plan: data.plan || 'free'
      }
    });

  } catch (error) {
    console.error('Parent app verification failed:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'Failed to verify with parent app' 
    }, { status: 500 });
  }
}

/**
 * Verify token using shared JWT secret
 */
async function verifyViaSharedSecret(token: string) {
  try {
    // Import JWT library dynamically to avoid build issues if not installed
    const jwt = await import('jsonwebtoken').catch(() => null);
    
    if (!jwt) {
      throw new Error('JWT library not available - install jsonwebtoken package');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable not configured');
    }

    const decoded = jwt.verify(token, secret) as any;
    
    return NextResponse.json({
      valid: true,
      userId: decoded.userId || decoded.sub,
      externalId: decoded.externalId || decoded.userId || decoded.sub,
      theme: decoded.theme || getDefaultTheme(),
      userInfo: {
        name: decoded.name,
        email: decoded.email,
        plan: decoded.plan || 'free'
      }
    });

  } catch (error: any) {
    console.error('JWT verification failed:', error.message);
    return NextResponse.json({ 
      valid: false, 
      error: 'Invalid or expired token' 
    }, { status: 401 });
  }
}

/**
 * Development bypass for testing without real auth
 */
async function bypassForDevelopment(token: string) {
  // Extract mock data from token for development
  console.log('🔐 API DEBUG: bypassForDevelopment called with token:', token.substring(0, 50) + '...');
  
  try {
    const mockData = JSON.parse(Buffer.from(token, 'base64').toString());
    console.log('🔐 API DEBUG: Decoded mock data:', mockData);
    
    const response = {
      valid: true,
      userId: mockData.userId || 'dev_user_123',
      externalId: mockData.externalId || 'dev_external_123', 
      theme: mockData.theme || getDefaultTheme(),
      userInfo: {
        name: mockData.name || 'Development User',
        email: mockData.email || 'dev@example.com',
        plan: mockData.plan || 'free'
      }
    };
    
    console.log('🔐 API DEBUG: Returning verification response:', response);
    return NextResponse.json(response);
  } catch (error) {
    // If token isn't valid base64 JSON, return default dev user
    console.log('🔐 API DEBUG: Failed to decode token, using default dev user:', error);
    
    const defaultResponse = {
      valid: true,
      userId: 'dev_user_123',
      externalId: 'dev_external_123',
      theme: getDefaultTheme(),
      userInfo: {
        name: 'Development User',
        email: 'dev@example.com',
        plan: 'free'
      }
    };
    
    console.log('🔐 API DEBUG: Returning default response:', defaultResponse);
    return NextResponse.json(defaultResponse);
  }
}

/**
 * Default theme configuration for widget styling
 */
function getDefaultTheme() {
  return {
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    borderRadius: '8px',
    fontFamily: 'Inter, system-ui, sans-serif',
    spacingUnit: '1rem',
    colors: {
      background: '#ffffff',
      foreground: '#0f172a',
      card: '#ffffff',
      cardForeground: '#0f172a',
      border: '#e2e8f0',
      input: '#ffffff',
      primary: '#3b82f6',
      primaryForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
      muted: '#f8fafc',
      mutedForeground: '#64748b',
      accent: '#f1f5f9',
      accentForeground: '#0f172a',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff'
    }
  };
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return NextResponse.json({
    service: 'auth-verification',
    status: 'healthy',
    strategy: process.env.AUTH_VERIFICATION_STRATEGY || 'jwt_secret',
    environment: process.env.NODE_ENV || 'development'
  });
}