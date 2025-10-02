'use client';

import React from 'react';
import parentComm from '../../lib/utils/parentCommunication';

export default function CreditTestPanel() {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleTestCommunication = () => {
    parentComm.testCommunication();
  };

  const handleTestCreditDeduction = (workType: string, amount: number) => {
    console.log(`💳 Testing credit deduction: ${workType} (${amount} credits)`);
    parentComm.signalWorkComplete(workType, amount);
  };

  const handleTestError = () => {
    parentComm.signalError(new Error('Test error from widget'));
  };

  const handleRequestBalance = () => {
    parentComm.requestCreditBalance();
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 border border-purple-500/20 rounded-lg p-4 text-white text-xs z-50">
      <h3 className="font-bold mb-2 text-purple-300">🧪 Credit Test Panel</h3>
      <div className="space-y-2">
        <button
          onClick={handleTestCommunication}
          className="block w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
        >
          Test Communication
        </button>

        <button
          onClick={() => handleTestCreditDeduction('codebase-analysis', 1)}
          className="block w-full px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
        >
          Test Analysis (1 credit)
        </button>

        <button
          onClick={() => handleTestCreditDeduction('story-creation', 1)}
          className="block w-full px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs"
        >
          Test Story (1 credit)
        </button>

        <button
          onClick={() => handleTestCreditDeduction('prompt-pack-generation', 1)}
          className="block w-full px-2 py-1 bg-orange-600 hover:bg-orange-700 rounded text-xs"
        >
          Test Pack (1 credit)
        </button>

        <button
          onClick={() => handleTestCreditDeduction('architect-completion', 2)}
          className="block w-full px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs"
        >
          Test Architect (2 credits)
        </button>

        <button
          onClick={handleRequestBalance}
          className="block w-full px-2 py-1 bg-cyan-600 hover:bg-cyan-700 rounded text-xs"
        >
          Request Balance
        </button>

        <button
          onClick={handleTestError}
          className="block w-full px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
        >
          Test Error
        </button>

        <div className="text-xs text-gray-400 mt-2">
          Connected: {parentComm.isConnectedToParent() ? '✅' : '❌'}
        </div>
      </div>
    </div>
  );
}