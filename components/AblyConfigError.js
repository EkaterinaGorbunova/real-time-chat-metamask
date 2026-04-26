import React from 'react';

const AblyConfigError = () => {
  return (
    <div className="container mx-auto pt-24 md:pt-28">
      <div className="max-w-2xl mx-auto px-6 pb-12 text-center">
        <div className="relative bg-(--surface)/80 backdrop-blur-xl rounded-2xl p-8 border border-(--border)">
          <div className="absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-rose-500/40 to-transparent" />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-14 w-14 mx-auto text-rose-500 mb-4"
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
          <h2 className="text-2xl font-semibold tracking-tight text-(--text) mb-3">
            Chat service is unavailable
          </h2>
          <p className="text-(--text-muted) mb-2 text-sm">
            The chat cannot be started because the Ably API key is not configured.
          </p>
          <p className="text-(--text-subtle) text-sm">
            Please set the{' '}
            <code className="px-1.5 py-0.5 bg-(--surface-muted) border border-(--border) rounded text-rose-400">
              ABLY_API_KEY
            </code>{' '}
            environment variable and restart the app.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AblyConfigError;
