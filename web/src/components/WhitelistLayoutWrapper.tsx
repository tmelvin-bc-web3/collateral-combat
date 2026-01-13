'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { isWhitelisted } from '@/config/whitelist';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { ProgressionProvider } from '@/contexts/ProgressionContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProfileSetupWrapper } from '@/components/ProfileSetupWrapper';
import { OnboardingTourWrapper } from '@/components/OnboardingTourWrapper';

interface WhitelistLayoutWrapperProps {
  children: React.ReactNode;
}

export function WhitelistLayoutWrapper({ children }: WhitelistLayoutWrapperProps) {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58();
  const hasAccess = isWhitelisted(walletAddress);

  // Whitelisted users get the full layout with Header
  if (hasAccess) {
    return (
      <ProfileProvider>
        <ProgressionProvider>
          <Header />
          <main className="pt-24 pb-12 px-4 min-h-screen relative z-10">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
          <Footer />
          <ProfileSetupWrapper />
          <OnboardingTourWrapper />
        </ProgressionProvider>
      </ProfileProvider>
    );
  }

  // Non-whitelisted users get minimal layout (coming soon page)
  return (
    <main className="min-h-screen relative z-10">
      {children}
    </main>
  );
}
