'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  title: string;
  href: string;
  icon?: string;
}

const NAV_ITEMS: NavItem[] = [
  { title: 'Overview', href: '/docs', icon: '📖' },
  { title: 'Getting Started', href: '/docs/getting-started', icon: '🚀' },
  { title: 'Oracle', href: '/docs/oracle', icon: '🔮' },
  { title: 'Last Degen Standing', href: '/docs/lds', icon: '💀' },
  { title: 'Token Wars', href: '/docs/token-wars', icon: '🏆' },
  { title: 'Battle Mode', href: '/docs/battle', icon: '⚔️' },
  { title: 'Draft', href: '/docs/draft', icon: '🎯' },
  { title: 'Spectate', href: '/docs/spectate', icon: '👁️' },
  { title: 'Session Wagering', href: '/docs/session-betting', icon: '⚡' },
  { title: 'Progression', href: '/docs/progression', icon: '📈' },
  { title: 'Security', href: '/docs/security', icon: '🔒' },
  { title: 'FAQ', href: '/docs/faq', icon: '❓' },
];

interface DocsSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function DocsSidebar({ isOpen = true, onClose }: DocsSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 lg:top-24 left-0 h-screen lg:h-auto lg:max-h-[calc(100vh-8rem)]
          w-64 flex-shrink-0 bg-bg-secondary lg:bg-transparent
          border-r border-border-primary lg:border-0
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          z-50 lg:z-auto
          overflow-y-auto
          pt-20 lg:pt-0
        `}
      >
        <nav className="p-4 lg:p-0 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                  transition-all duration-150
                  ${isActive
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  }
                `}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
