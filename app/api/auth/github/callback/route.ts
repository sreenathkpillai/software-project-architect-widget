import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return new NextResponse(
        `<html><body><script>window.close();</script></body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
        state: state,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || 'OAuth error');
    }

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userData = await userResponse.json();

    // Store token in session/temporary storage
    // In production, you'd want to encrypt this and store it properly
    const authData = {
      token: tokenData.access_token,
      username: userData.login,
      timestamp: Date.now(),
    };

    // Return success page that closes popup
    return new NextResponse(
      `<html>
        <body>
          <script>
            // Store auth data for parent window to pick up
            localStorage.setItem('github_auth_result', JSON.stringify(${JSON.stringify(authData)}));

            // Also try to notify parent window directly
            if (window.opener) {
              window.opener.postMessage({
                type: 'github-auth-success',
                data: ${JSON.stringify(authData)}
              }, window.location.origin);
            }

            // Close popup after a brief delay
            setTimeout(() => window.close(), 1000);
          </script>
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px;">
            <h2>✅ Authentication Successful</h2>
            <p>You can close this window now.</p>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );

  } catch (error) {
    console.error('GitHub OAuth callback error:', error);

    return new NextResponse(
      `<html>
        <body>
          <script>window.close();</script>
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Authentication Failed</h2>
            <p>Please try again.</p>
          </div>
        </body>
      </html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}