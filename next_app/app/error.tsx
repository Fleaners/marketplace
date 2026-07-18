'use client';

import React from 'react';

export default function RootErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Root rendering error caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center justify-center max-w-md w-full p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-6">
          <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-800 dark:text-white">Application boot failure</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              We hit an unexpected error initializing the marketplace shell. Please refresh or try again.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => reset()}
              className="w-full py-3 bg-[#FAB12F] text-slate-950 rounded-2xl font-black text-xs shadow hover:bg-[#e09e1b] transition-all"
            >
              🔄 Retry Application Launch
            </button>
            <a
              href="/"
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-center"
            >
              🏠 Go to Homepage
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
