'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect from /admin/waitlist to /admin?tab=waitlist
 * This maintains backwards compatibility with any existing links.
 */
export default function WaitlistRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin?tab=waitlist');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
      <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center max-w-md">
        <div className="w-8 h-8 border-2 border-warning border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60">Redirecting to admin dashboard...</p>
      </div>
    </div>
  );
}
