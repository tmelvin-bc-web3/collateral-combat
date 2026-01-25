import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/components/WalletProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { FirstBetProvider } from '@/contexts/FirstBetContext';
import { ProgressionProvider } from '@/contexts/ProgressionContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BalanceBar } from '@/components/BalanceBar';
import { ProfileSetupWrapper } from '@/components/ProfileSetupWrapper';
import { OnboardingTourWrapper } from '@/components/OnboardingTourWrapper';
import { WhitelistLayoutWrapper } from '@/components/WhitelistLayoutWrapper';
import { BottomNavBar } from '@/components/navigation';
import { COMING_SOON_MODE } from '@/config/siteConfig';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DegenDome - Two Enter. One Profits.',
  description: 'The wasteland\'s premier PvP trading arena on Solana. Predict. Battle. Draft. Survive. Only the strongest degens claim the loot.',
};

// Floating ember particles component
function DomeEmbers() {
  return (
    <div className="dome-embers" aria-hidden="true">
      {[...Array(15)].map((_, i) => (
        <div key={i} className="ember" />
      ))}
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Add dome-bg class to body for enhanced background. Remove to revert. */}
      <body className={`${inter.className} dome-bg`}>
        {/* Animated background elements */}
        <DomeEmbers />
        <div className="dome-heat" aria-hidden="true" />

        {COMING_SOON_MODE ? (
          // Coming Soon Mode - whitelisted wallets get full layout
          <WalletProvider>
            <AuthProvider>
              <WhitelistLayoutWrapper>
                {children}
              </WhitelistLayoutWrapper>
            </AuthProvider>
          </WalletProvider>
        ) : (
          // Live Mode - full layout with navigation
          <WalletProvider>
            <AuthProvider>
              <ProfileProvider>
                <FirstBetProvider>
                  <ProgressionProvider>
                    <Header />
                    <main className="pt-24 pb-32 md:pb-24 px-4 min-h-screen relative z-10">
                      <div className="max-w-7xl mx-auto">{children}</div>
                    </main>
                    <Footer />
                    <BottomNavBar />
                    <BalanceBar />
                    <ProfileSetupWrapper />
                    <OnboardingTourWrapper />
                  </ProgressionProvider>
                </FirstBetProvider>
              </ProfileProvider>
            </AuthProvider>
          </WalletProvider>
        )}
      </body>
    </html>
  );
}
