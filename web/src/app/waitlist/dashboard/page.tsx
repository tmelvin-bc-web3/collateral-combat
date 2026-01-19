'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /waitlist/dashboard to /coming-soon
 * Dashboard functionality has been merged into the main waitlist page.
 */
export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/coming-soon');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
      <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center max-w-md">
        <div className="w-8 h-8 border-2 border-warning border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60">Redirecting...</p>
      </div>
    </div>
  );
}
