/**
 * Quick test to verify the auth API works
 */

async function quickTest() {
  const BASE_URL = 'https://localhost:5000';
  
  console.log('Testing auth verification API...');
  
  try {
    // Test health check
    const healthResponse = await fetch(`${BASE_URL}/api/auth/verify-token`);
    const healthData = await healthResponse.json();
    console.log('Health check:', healthData);
    
    // Test token verification
    const testToken = Buffer.from(JSON.stringify({
      userId: 'test123',
      externalId: 'external123',
      name: 'Test User'
    })).toString('base64');
    
    const authResponse = await fetch(`${BASE_URL}/api/auth/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: testToken })
    });
    
    const authData = await authResponse.json();
    console.log('Auth verification:', authData);
    
    console.log('✅ Quick test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

if (require.main === module) {
  quickTest();
}