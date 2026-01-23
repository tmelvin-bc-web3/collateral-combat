import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ wallet: string }> }): Promise<Metadata> {
  const { wallet } = await params;
  const displayName = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;

  return {
    title: `${displayName} | Fighter Profile | DegenDome`,
    description: `Check out this fighter's stats on DegenDome - the ultimate PvP trading arena on Solana`,
    openGraph: {
      title: `${displayName} | Fighter Profile | DegenDome`,
      description: `Check out this fighter's stats on DegenDome`,
      images: [`/profile/${wallet}/opengraph-image`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName} | Fighter Profile | DegenDome`,
      description: `Check out this fighter's stats on DegenDome`,
      images: [`/profile/${wallet}/opengraph-image`],
    },
  };
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
