'use client';

import { useState } from 'react';

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    setStatus('loading');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message);
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setMessage('Failed to join waitlist. Please try again.');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fire/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rust/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Logo/Title */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded bg-rust/20 border border-rust/40 text-fire text-xs font-bold uppercase tracking-[3px] mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fire opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-fire"></span>
            </span>
            Coming Soon
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-wider mb-4" style={{ fontFamily: 'Impact, sans-serif', letterSpacing: '4px' }}>
            DEGEN
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fire via-danger to-blood">
              DOME
            </span>
          </h1>

          <p className="text-lg md:text-xl text-text-secondary max-w-xl mx-auto">
            The wasteland&apos;s premier trading arena is under construction.
            Predict. Battle. Draft. Survive.
          </p>
        </div>

        {/* Email signup */}
        <div className="card border border-rust/30 p-8 relative overflow-hidden">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-rust/50" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-rust/50" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-rust/50" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-rust/50" />

          <h2 className="text-xl font-black uppercase tracking-wider mb-2 text-sand">
            Join the Waitlist
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            Be the first to enter the dome when we launch.
          </p>

          {status === 'success' ? (
            <div className="py-4">
              <div className="inline-flex items-center gap-2 px-4 py-3 rounded bg-success/20 border border-success/40 text-success">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">{message}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded bg-bg-tertiary border border-rust/30 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-fire transition-colors"
                disabled={status === 'loading'}
              />
              <button
                type="submit"
                disabled={status === 'loading' || !email}
                className="px-6 py-3 rounded bg-fire hover:bg-fire/80 disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wider transition-colors"
              >
                {status === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Joining...
                  </span>
                ) : (
                  'Join Waitlist'
                )}
              </button>
            </form>
          )}

          {status === 'error' && (
            <p className="mt-3 text-sm text-danger">{message}</p>
          )}
        </div>

        {/* Features preview */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div className="p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded bg-rust/20 border border-rust/30 flex items-center justify-center text-fire">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-sand">Predict</h3>
            <p className="text-xs text-text-tertiary mt-1">30s price predictions</p>
          </div>
          <div className="p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded bg-rust/20 border border-rust/30 flex items-center justify-center text-fire">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-sand">Battle</h3>
            <p className="text-xs text-text-tertiary mt-1">1v1 trading duels</p>
          </div>
          <div className="p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded bg-rust/20 border border-rust/30 flex items-center justify-center text-fire">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-sand">Draft</h3>
            <p className="text-xs text-text-tertiary mt-1">Fantasy memecoin leagues</p>
          </div>
        </div>

        {/* Social links placeholder */}
        <div className="mt-12 flex justify-center gap-4">
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded bg-rust/20 border border-rust/30 text-text-secondary hover:text-fire hover:border-fire/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="https://discord.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded bg-rust/20 border border-rust/30 text-text-secondary hover:text-fire hover:border-fire/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
