import React from 'react';

const AblyConfigError = () => {
  return (
    <div className="container mx-auto pt-20">
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-red-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto text-red-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Chat service is unavailable
          </h2>
          <p className="text-gray-600 mb-2">
            The chat cannot be started because the Ably API key is not configured.
          </p>
          <p className="text-gray-500 text-sm">
            Please set the <code className="px-1 py-0.5 bg-gray-100 rounded text-red-600">ABLY_API_KEY</code>{' '}
            environment variable and restart the app.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AblyConfigError;
