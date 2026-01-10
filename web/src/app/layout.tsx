import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/components/WalletProvider';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { ProgressionProvider } from '@/contexts/ProgressionContext';
import { Header } from '@/components/Header';
import { ProfileSetupWrapper } from '@/components/ProfileSetupWrapper';
import { OnboardingTourWrapper } from '@/components/OnboardingTourWrapper';
import { COMING_SOON_MODE } from '@/config/siteConfig';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DegenDome - Two Enter. One Profits.',
  description: 'The wasteland\'s premier PvP trading arena on Solana. Predict. Battle. Draft. Survive. Only the strongest degens claim the loot.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {COMING_SOON_MODE ? (
          // Coming Soon Mode - minimal layout
          <main className="min-h-screen">
            {children}
          </main>
        ) : (
          // Live Mode - full layout with navigation
          <WalletProvider>
            <ProfileProvider>
              <ProgressionProvider>
                <Header />
                <main className="pt-24 pb-12 px-4 min-h-screen">
                  <div className="max-w-7xl mx-auto">{children}</div>
                </main>
                <ProfileSetupWrapper />
                <OnboardingTourWrapper />
              </ProgressionProvider>
            </ProfileProvider>
          </WalletProvider>
        )}
      </body>
    </html>
  );
}
