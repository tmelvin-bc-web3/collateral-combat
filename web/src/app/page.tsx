'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#080705] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#ff5500] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080705] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,85,0,0.3) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,85,0,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#ff5500]/[0.08] rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#8b0000]/[0.08] rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#8b4513]/[0.05] rounded-full blur-[150px]" />

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#ff5500]/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Scanlines overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
        }}
      />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <div className="mb-8 relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-[#ff5500]/20 via-[#8b0000]/20 to-[#ff5500]/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-[#8b4513]/50 shadow-2xl shadow-[#ff5500]/20">
            <Image
              src="/logo.png"
              alt="DegenDome"
              fill
              className="object-cover scale-110"
              priority
            />
          </div>
        </div>

        {/* Badge */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#8b4513]/30 to-[#5c2e0d]/30 border border-[#8b4513]/40 backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5500] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff5500]"></span>
            </span>
            <span className="text-[#e63900] text-xs font-bold uppercase tracking-[4px]">Coming Soon</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-center mb-4">
          <span
            className="block text-6xl md:text-8xl lg:text-9xl font-black tracking-tight"
            style={{
              fontFamily: 'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif',
              letterSpacing: '-2px'
            }}
          >
            <span className="text-[#e8dfd4]">DEGEN</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff5500] via-[#e63900] to-[#8b0000]">DOME</span>
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-[#8b4513] text-sm md:text-base font-bold uppercase tracking-[6px] mb-8">
          Two Enter · One Profits
        </p>

        {/* Description */}
        <p className="text-[#8a7f72] text-lg md:text-xl text-center max-w-lg mb-12 leading-relaxed">
          The wasteland&apos;s premier trading arena.
          <span className="text-[#e8dfd4]"> Predict. Battle. Draft. </span>
          Survive.
        </p>

        {/* Email signup card */}
        <div className="w-full max-w-md relative">
          {/* Card glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#8b4513]/50 via-[#ff5500]/30 to-[#8b4513]/50 rounded-2xl blur-lg opacity-50" />

          <div className="relative bg-[#0d0b09]/90 backdrop-blur-xl rounded-2xl border border-[#8b4513]/30 p-8 shadow-2xl">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#ff5500]/50 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#ff5500]/50 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#ff5500]/50 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#ff5500]/50 rounded-br-2xl" />

            <h2 className="text-xl font-bold text-[#e8dfd4] mb-2 text-center">
              Join the Waitlist
            </h2>
            <p className="text-sm text-[#5c5348] text-center mb-6">
              Be first to enter when the dome opens
            </p>

            {status === 'success' ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-[#7fba00]/10 border border-[#7fba00]/30">
                  <svg className="w-6 h-6 text-[#7fba00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold text-[#7fba00]">{message}</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-5 py-4 rounded-xl bg-[#151210] border border-[#2a2218] text-[#e8dfd4] placeholder:text-[#5c5348] focus:outline-none focus:border-[#ff5500]/50 focus:ring-1 focus:ring-[#ff5500]/30 transition-all text-base"
                    disabled={status === 'loading'}
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === 'loading' || !email}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#ff5500] to-[#e63900] hover:from-[#ff6622] hover:to-[#ff5500] disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wider transition-all text-[#e8dfd4] shadow-lg shadow-[#ff5500]/20 hover:shadow-[#ff5500]/40"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Joining...
                    </span>
                  ) : (
                    'Enter the Waitlist'
                  )}
                </button>
              </form>
            )}

            {status === 'error' && (
              <p className="mt-4 text-sm text-[#cc2200] text-center">{message}</p>
            )}
          </div>
        </div>

        {/* Game modes preview */}
        <div className="mt-16 grid grid-cols-3 gap-6 md:gap-12 max-w-lg">
          {[
            { icon: 'chart', label: 'Predict', desc: '30s Rounds' },
            { icon: 'bolt', label: 'Battle', desc: '1v1 Duels' },
            { icon: 'grid', label: 'Draft', desc: 'Fantasy Leagues' },
          ].map((mode) => (
            <div key={mode.label} className="text-center group">
              <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#151210] to-[#0d0b09] border border-[#2a2218] flex items-center justify-center text-[#8b4513] group-hover:text-[#ff5500] group-hover:border-[#8b4513]/50 transition-all duration-300 shadow-lg">
                {mode.icon === 'chart' && (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                )}
                {mode.icon === 'bolt' && (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                {mode.icon === 'grid' && (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                )}
              </div>
              <h3 className="font-bold text-sm text-[#c4a574] uppercase tracking-wider">{mode.label}</h3>
              <p className="text-xs text-[#5c5348] mt-1">{mode.desc}</p>
            </div>
          ))}
        </div>

        {/* Social links */}
        <div className="mt-16 flex items-center gap-4">
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl bg-[#151210] border border-[#2a2218] text-[#5c5348] hover:text-[#e8dfd4] hover:border-[#8b4513]/50 hover:bg-[#1f1a16] transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="https://discord.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl bg-[#151210] border border-[#2a2218] text-[#5c5348] hover:text-[#e8dfd4] hover:border-[#8b4513]/50 hover:bg-[#1f1a16] transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
            </svg>
          </a>
        </div>

        {/* Footer text */}
        <p className="mt-12 text-xs text-[#3d3228] uppercase tracking-widest">
          Built on Solana
        </p>
      </div>

      {/* Custom styles for floating animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.6;
          }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
