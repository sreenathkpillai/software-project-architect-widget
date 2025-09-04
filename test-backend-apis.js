/**
 * Backend API Testing Script
 * Tests all the new widget integration APIs
 * 
 * Run with: node test-backend-apis.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';

async function testAPI(endpoint, options = {}) {
  try {
    console.log(`\n🧪 Testing ${options.method || 'GET'} ${endpoint}`);
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.error(`❌ Error testing ${endpoint}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Backend API Tests for Widget Integration\n');
  
  const testExternalId = 'test_user_' + Date.now();
  const testUserSession = 'test_session_' + Date.now();
  
  // Test 1: Auth Token Verification
  console.log('\n=== AUTH TOKEN VERIFICATION ===');
  
  // Test health check
  await testAPI('/api/auth/verify-token');
  
  // Test development bypass
  const devToken = Buffer.from(JSON.stringify({
    userId: 'test_123',
    externalId: testExternalId,
    name: 'Test User'
  })).toString('base64');
  
  await testAPI('/api/auth/verify-token', {
    method: 'POST',
    body: {
      token: devToken
    }
  });
  
  // Test 2: Intro Chat Flow
  console.log('\n=== INTRO CHAT FLOW ===');
  
  // Check initial state
  await testAPI(`/api/intro-chat?userSession=${testUserSession}`);
  
  // Start intro chat (question 0)
  await testAPI('/api/intro-chat', {
    method: 'POST',
    body: {
      message: 'I want to build a mobile app for fitness tracking',
      userSession: testUserSession,
      externalId: testExternalId
    }
  });
  
  // Answer question 1
  await testAPI('/api/intro-chat', {
    method: 'POST',
    body: {
      message: 'Mobile app for iOS and Android',
      userSession: testUserSession,
      externalId: testExternalId
    }
  });
  
  // Answer question 2
  await testAPI('/api/intro-chat', {
    method: 'POST',
    body: {
      message: 'Fitness enthusiasts and gym-goers',
      userSession: testUserSession,
      externalId: testExternalId
    }
  });
  
  // Answer question 3
  await testAPI('/api/intro-chat', {
    method: 'POST',
    body: {
      message: 'Helps people track workouts and stay motivated',
      userSession: testUserSession,
      externalId: testExternalId
    }
  });
  
  // Answer question 4
  await testAPI('/api/intro-chat', {
    method: 'POST',
    body: {
      message: 'Within 3 months',
      userSession: testUserSession,
      externalId: testExternalId
    }
  });
  
  // Answer question 5 (final question)
  await testAPI('/api/intro-chat', {
    method: 'POST',
    body: {
      message: 'Small team of 2-3 developers',
      userSession: testUserSession,
      externalId: testExternalId
    }
  });
  
  // Test 3: Intro to Architect Handoff
  console.log('\n=== INTRO TO ARCHITECT HANDOFF ===');
  
  // Check handoff readiness
  await testAPI(`/api/intro-to-architect?userSession=${testUserSession}`);
  
  // Perform handoff
  const handoffResult = await testAPI('/api/intro-to-architect', {
    method: 'POST',
    body: {
      introUserSession: testUserSession,
      externalId: testExternalId,
      createNewArchitectSession: true
    }
  });
  
  let architectSession = null;
  if (handoffResult.success && handoffResult.data.architectUserSession) {
    architectSession = handoffResult.data.architectUserSession;
  }
  
  // Test 4: Architect Chat with Intro Context
  if (architectSession) {
    console.log('\n=== ARCHITECT CHAT WITH INTRO CONTEXT ===');
    
    await testAPI('/api/chat', {
      method: 'POST',
      body: {
        messages: [
          { role: 'user', content: 'Let\'s start architecting my fitness app' }
        ],
        userSession: architectSession,
        externalId: testExternalId,
        techDecisions: false,
        fastMode: true
      }
    });
  }
  
  // Test 5: Sessions API with Session Types
  console.log('\n=== SESSIONS API WITH TYPES ===');
  
  // Save intro session
  await testAPI('/api/sessions', {
    method: 'POST',
    body: {
      userSession: testUserSession,
      externalId: testExternalId,
      sessionName: 'Fitness App Intro',
      sessionType: 'intro',
      action: 'save'
    }
  });
  
  if (architectSession) {
    // Save architect session
    await testAPI('/api/sessions', {
      method: 'POST',
      body: {
        userSession: architectSession,
        externalId: testExternalId,
        sessionName: 'Fitness App Architecture',
        sessionType: 'architect',
        action: 'save'
      }
    });
  }
  
  // Get sessions list
  await testAPI(`/api/sessions?externalId=${testExternalId}`);
  
  // Test 6: Usage Tracking
  console.log('\n=== USAGE TRACKING ===');
  
  await testAPI(`/api/usage?externalId=${testExternalId}`);
  
  console.log('\n🎉 All tests completed!');
  console.log('\nNext steps:');
  console.log('- Check your database to see the stored intro briefs and sessions');
  console.log('- Verify that tool usage tracking is working');
  console.log('- Test the widget integration from a parent application');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testAPI, runTests };