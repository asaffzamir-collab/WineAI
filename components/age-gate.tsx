'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'wj_age_verified';

export function AgeGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    setVerified(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  const handleConfirm = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVerified(true);
  };

  if (verified === null) return null;
  if (verified) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-charcoal-900/95 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-charcoal-800">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/30">
          <svg className="h-8 w-8 text-bordeaux-600 dark:text-bordeaux-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 22h8" /><path d="M12 11v11" /><path d="M12 2C9.5 2 7.5 4 7.5 6.5S9.5 11 12 11s4.5-2 4.5-4.5S14.5 2 12 2" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold text-charcoal-900 dark:text-ivory-100">
          Age Verification
        </h2>
        <p className="mb-6 text-sm text-stone-600 dark:text-stone-400">
          This app contains wine-related content. You must be of legal drinking age in your country to continue.
        </p>
        <button
          onClick={handleConfirm}
          className="w-full rounded-xl bg-bordeaux-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-bordeaux-700 dark:bg-bordeaux-500 dark:hover:bg-bordeaux-600"
        >
          I am of legal drinking age
        </button>
        <p className="mt-4 text-xs text-stone-400 dark:text-stone-500">
          By continuing, you confirm you are of legal drinking age in your jurisdiction.
        </p>
      </div>
    </div>
  );
}
