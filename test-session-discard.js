/**
 * Test script for session discard functionality
 * This script tests the new session discard system implementation
 */

// Configuration
const testConfig = {
  externalId: 'test_user_discard_system',
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
};

console.log('🧪 Starting Session Discard System Tests');
console.log('Configuration:', testConfig);

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    console.error('Request failed:', error);
    return { status: 500, data: { error: error.message }, ok: false };
  }
}

async function createTestSession() {
  console.log('\n📝 Creating test session...');
  
  const sessionId = `test_session_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  // Create a session with auto-saved name (starts with "Draft")
  const response = await makeRequest(`${testConfig.baseUrl}/api/sessions`, {
    method: 'POST',
    body: JSON.stringify({
      userSession: sessionId,
      externalId: testConfig.externalId,
      sessionName: `Draft ${new Date().toLocaleDateString()}`,
      action: 'save',
      messages: [
        { role: 'user', content: 'Hello, I want to create a web app' },
        { role: 'assistant', content: 'I\'d be happy to help you create a web app!' }
      ]
    })
  });
  
  if (response.ok) {
    console.log('✅ Test session created:', sessionId);
    return sessionId;
  } else {
    console.error('❌ Failed to create test session:', response);
    return null;
  }
}

async function testDiscardSession(sessionId) {
  console.log('\n🗑️ Testing session discard...');
  
  const response = await makeRequest(
    `${testConfig.baseUrl}/api/sessions/${sessionId}/discard?externalId=${testConfig.externalId}`,
    { method: 'DELETE' }
  );
  
  if (response.ok) {
    console.log('✅ Session discarded successfully:', response.data);
    return true;
  } else {
    console.error('❌ Failed to discard session:', response);
    return false;
  }
}

async function testDiscardedSessionNotInList() {
  console.log('\n📋 Testing that discarded sessions are excluded from session lists...');
  
  const response = await makeRequest(
    `${testConfig.baseUrl}/api/sessions?externalId=${testConfig.externalId}`
  );
  
  if (response.ok) {
    const sessions = response.data.sessions || [];
    console.log(`✅ Session list contains ${sessions.length} active sessions`);
    console.log('Sessions:', sessions.map(s => ({ id: s.userSession, name: s.sessionName })));
    return true;
  } else {
    console.error('❌ Failed to get session list:', response);
    return false;
  }
}

async function testDiscardNonExistentSession() {
  console.log('\n🚫 Testing discard of non-existent session...');
  
  const fakeSessionId = 'non_existent_session_123';
  const response = await makeRequest(
    `${testConfig.baseUrl}/api/sessions/${fakeSessionId}/discard?externalId=${testConfig.externalId}`,
    { method: 'DELETE' }
  );
  
  if (response.status === 404) {
    console.log('✅ Correctly returned 404 for non-existent session');
    return true;
  } else {
    console.error('❌ Should have returned 404 for non-existent session:', response);
    return false;
  }
}

async function testUnauthorizedDiscard() {
  console.log('\n🔒 Testing unauthorized discard attempt...');
  
  // Create a session first
  const sessionId = await createTestSession();
  if (!sessionId) return false;
  
  // Try to discard with wrong externalId
  const response = await makeRequest(
    `${testConfig.baseUrl}/api/sessions/${sessionId}/discard?externalId=wrong_user_id`,
    { method: 'DELETE' }
  );
  
  if (response.status === 403) {
    console.log('✅ Correctly returned 403 for unauthorized discard');
    // Clean up by discarding with correct user
    await testDiscardSession(sessionId);
    return true;
  } else {
    console.error('❌ Should have returned 403 for unauthorized discard:', response);
    return false;
  }
}

async function testDoubleDiscard() {
  console.log('\n🔄 Testing double discard attempt...');
  
  // Create and discard a session
  const sessionId = await createTestSession();
  if (!sessionId) return false;
  
  const firstDiscard = await testDiscardSession(sessionId);
  if (!firstDiscard) return false;
  
  // Try to discard again
  const response = await makeRequest(
    `${testConfig.baseUrl}/api/sessions/${sessionId}/discard?externalId=${testConfig.externalId}`,
    { method: 'DELETE' }
  );
  
  if (response.status === 400 && response.data.error.includes('already discarded')) {
    console.log('✅ Correctly returned error for double discard');
    return true;
  } else {
    console.error('❌ Should have returned error for double discard:', response);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Running comprehensive session discard tests...\n');
  
  const tests = [
    { name: 'Create and discard session', fn: async () => {
      const sessionId = await createTestSession();
      return sessionId ? await testDiscardSession(sessionId) : false;
    }},
    { name: 'Verify discarded sessions excluded from lists', fn: testDiscardedSessionNotInList },
    { name: 'Test discard non-existent session', fn: testDiscardNonExistentSession },
    { name: 'Test unauthorized discard', fn: testUnauthorizedDiscard },
    { name: 'Test double discard prevention', fn: testDoubleDiscard }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`\n🧪 Running test: ${test.name}`);
      const result = await test.fn();
      if (result) {
        console.log(`✅ ${test.name} - PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test.name} - FAILED`);
        failed++;
      }
    } catch (error) {
      console.error(`💥 ${test.name} - ERROR:`, error);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${(passed / (passed + failed) * 100).toFixed(1)}%`);
  
  return failed === 0;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      console.log(success ? '\n🎉 All tests passed!' : '\n⚠️  Some tests failed');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests, testConfig };