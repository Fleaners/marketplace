'use client';

import React from 'react';

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Dashboard rendering error caught:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[350px] p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-[#f3d9a7]/40 dark:border-slate-800 shadow-sm space-y-4">
      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-[#FAB12F] rounded-2xl">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-[#1f2937] dark:text-white">Failed to load this dashboard section</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
          We encountered a temporary interface rendering issue. The remaining screens of your Seller Hub are fully operational.
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="px-5 py-2.5 bg-[#FAB12F] text-slate-950 rounded-xl font-bold text-xs shadow-sm hover:bg-[#e09e1b] transition-all"
      >
        🔄 Refresh Section
      </button>
    </div>
  );
}
