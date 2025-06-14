
import React from 'react';

const ApiKeyWarning: React.FC = () => (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
    <div className="bg-red-800 p-8 rounded-lg shadow-2xl text-white max-w-md text-center">
      <h2 className="text-2xl font-bold mb-4">API Key Missing</h2>
      <p className="mb-3">The Gemini API key (process.env.API_KEY) is not configured.</p>
      <p className="mb-6">This application requires a valid API key to function. Please ensure it is set in your environment variables.</p>
      <p className="text-sm text-red-300">The application will not work correctly without it.</p>
    </div>
  </div>
);

export default ApiKeyWarning;
