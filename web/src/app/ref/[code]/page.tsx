'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function ReferralRedirect() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!code) {
      router.push('/waitlist');
      return;
    }

    // Validate the referral code
    fetch(`${BACKEND_URL}/api/waitlist/validate/${code}`)
      .then((res) => res.json())
      .then((data) => {
        setIsValid(data.valid);
        setIsValidating(false);

        // Redirect after a short delay to show validation
        setTimeout(() => {
          router.push(`/waitlist?ref=${code}`);
        }, 1500);
      })
      .catch(() => {
        setIsValid(false);
        setIsValidating(false);
        // Still redirect, the waitlist page will handle invalid codes
        setTimeout(() => {
          router.push(`/waitlist?ref=${code}`);
        }, 1500);
      });
  }, [code, router]);

  return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-warning/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-warning/10 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 text-center">
        {/* Logo */}
        <Link href="/" className="inline-block mb-8">
          <span className="text-4xl font-black tracking-tight">
            <span className="text-warning">DEGEN</span>
            <span className="text-white">DOME</span>
          </span>
        </Link>

        {/* Loading state */}
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-sm mx-auto">
          {isValidating ? (
            <>
              <div className="w-12 h-12 mx-auto mb-4 border-2 border-warning border-t-transparent rounded-full animate-spin" />
              <p className="text-white/60">Validating referral link...</p>
            </>
          ) : isValid ? (
            <>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-success/20 border-2 border-success flex items-center justify-center">
                <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white mb-2">Valid referral code!</p>
              <p className="text-white/60 text-sm">Redirecting you to join...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-warning/20 border-2 border-warning flex items-center justify-center">
                <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-white mb-2">Referral code not found</p>
              <p className="text-white/60 text-sm">Redirecting to waitlist...</p>
            </>
          )}

          <p className="text-white/40 text-xs mt-4 font-mono">{code}</p>
        </div>
      </div>
    </div>
  );
}
