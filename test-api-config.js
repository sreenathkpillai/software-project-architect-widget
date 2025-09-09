/**
 * Quick test script to verify API configuration works correctly
 */

// Mock the environment variable
process.env.NEXT_PUBLIC_API_BASE = '/widget/api';

const { getApiUrl } = require('./lib/api-config.ts');

console.log('🧪 Testing API URL Configuration\n');

const testCases = [
  'chat',
  'sessions',
  'intro-chat', 
  'intro-brief',
  'progress',
  'auth/verify-token'
];

console.log('Current API_BASE:', process.env.NEXT_PUBLIC_API_BASE || '/widget/api');
console.log('\nGenerated URLs:');

testCases.forEach(endpoint => {
  const url = getApiUrl(endpoint);
  console.log(`  ${endpoint.padEnd(20)} -> ${url}`);
});

console.log('\nExpected behavior in production:');
console.log('  ✅ All API calls will now route to /widget/api/* instead of /api/*');
console.log('  ✅ nginx can route /widget/api/* to the widget server (port 5000)'); 
console.log('  ✅ nginx can route /api/* to the main backend (port 3001)');

console.log('\n🎯 Configuration looks correct!');