'use client';

import { useState } from 'react';

export default function ExampleIntegration() {
  const [showWidget, setShowWidget] = useState(false);
  const [sessionType, setSessionType] = useState<'intro' | 'architect'>('intro');
  const [skipIntro, setSkipIntro] = useState(false);

  const theme = {
    primaryColor: '#6366F1',
    secondaryColor: '#8B5CF6',
    borderRadius: '12px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    spacingUnit: '1rem',
    backgroundColor: '#F8FAFC',
    textColor: '#1E293B'
  };

  const generateWidgetUrl = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      token: 'demo_jwt_token_here',
      externalId: 'demo_user_123',
      authEndpoint: 'https://your-parent-app.com/auth/verify',
      sessionType,
      skipIntro: skipIntro.toString(),
      theme: JSON.stringify(theme)
    });
    
    return `${baseUrl}/widget?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Parent App Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Your App Suite</h1>
              <nav className="ml-8 flex space-x-8">
                <a href="#" className="text-gray-500 hover:text-gray-700">Dashboard</a>
                <a href="#" className="text-gray-500 hover:text-gray-700">Projects</a>
                <a href="#" className="text-indigo-600 font-medium">AI Tools</a>
              </nav>
            </div>
            <button 
              onClick={() => setShowWidget(!showWidget)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {showWidget ? 'Close' : 'Open Software Architect'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Widget Integration Example</h2>
          <p className="text-gray-600 mb-6">
            This demonstrates how the Software Project Architect widget can be embedded into your application.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Type
              </label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as 'intro' | 'architect')}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="intro">Intro Flow</option>
                <option value="architect">Direct to Architect</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skip Intro
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={skipIntro}
                  onChange={(e) => setSkipIntro(e.target.checked)}
                  className="mr-2"
                />
                Skip intro questions
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Widget URL
              </label>
              <input
                type="text"
                value={generateWidgetUrl()}
                readOnly
                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Integration Code Example:</h3>
            <pre className="text-sm text-gray-600 overflow-x-auto">
{`<iframe 
  src="${generateWidgetUrl()}"
  width="100%" 
  height="600px"
  frameBorder="0"
  title="Software Project Architect"
/>`}
            </pre>
          </div>
        </div>

        {showWidget && (
          <div className="bg-white rounded-lg shadow-lg border overflow-hidden">
            <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
              <h3 className="font-medium text-gray-900">Software Project Architect Widget</h3>
              <button
                onClick={() => setShowWidget(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="relative">
              <iframe
                src={generateWidgetUrl()}
                width="100%"
                height="600px"
                frameBorder="0"
                title="Software Project Architect"
                className="w-full"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Features</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                JWT token authentication with parent app
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                Theme inheritance via CSS variables
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                PostMessage communication for events
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                Session type differentiation (intro vs architect)
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                Smooth transitions between intro and architect modes
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                External user ID tracking and session management
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Flow Options</h3>
            <div className="space-y-4 text-gray-600">
              <div>
                <h4 className="font-medium text-gray-900">Marketing Flow:</h4>
                <p className="text-sm">Landing page → Intro chat → Registration gate → Architect</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Authenticated Flow:</h4>
                <p className="text-sm">Dashboard → Choice (intro/direct) → Architect with context</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Direct Access:</h4>
                <p className="text-sm">Skip intro → Straight to technical architecture</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}