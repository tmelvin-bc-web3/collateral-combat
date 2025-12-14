import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/components/WalletProvider';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { Header } from '@/components/Header';
import { ProfileSetupWrapper } from '@/components/ProfileSetupWrapper';
import { OnboardingTourWrapper } from '@/components/OnboardingTourWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Collateral Combat - PvP Perp Trading Arena',
  description: 'Compete head-to-head in leveraged trading battles on Solana. Best P&L wins.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <ProfileProvider>
            <Header />
            <main className="pt-24 pb-12 px-4 min-h-screen">
              <div className="max-w-7xl mx-auto">{children}</div>
            </main>
            <ProfileSetupWrapper />
            <OnboardingTourWrapper />
          </ProfileProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
