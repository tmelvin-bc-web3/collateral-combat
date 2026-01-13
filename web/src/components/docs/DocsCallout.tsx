interface DocsCalloutProps {
  type: 'info' | 'warning' | 'tip' | 'danger';
  title?: string;
  children: React.ReactNode;
}

const CALLOUT_STYLES = {
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'ℹ️',
    title: 'text-blue-400',
  },
  warning: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: '⚠️',
    title: 'text-yellow-400',
  },
  tip: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: '💡',
    title: 'text-green-400',
  },
  danger: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: '🚨',
    title: 'text-red-400',
  },
};

export default function DocsCallout({ type, title, children }: DocsCalloutProps) {
  const styles = CALLOUT_STYLES[type];
  const defaultTitles = {
    info: 'Note',
    warning: 'Warning',
    tip: 'Tip',
    danger: 'Important',
  };

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-4 my-4`}>
      <div className="flex gap-3">
        <span className="text-lg flex-shrink-0">{styles.icon}</span>
        <div className="flex-1">
          <div className={`font-medium text-sm mb-1 ${styles.title}`}>
            {title || defaultTitles[type]}
          </div>
          <div className="text-text-secondary text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Stats card component for "by the numbers" sections
interface StatsCardProps {
  value: string;
  label: string;
  icon?: string;
}

export function StatsCard({ value, label, icon }: StatsCardProps) {
  return (
    <div className="card text-center p-4">
      {icon && <div className="text-2xl mb-2">{icon}</div>}
      <div className="text-2xl font-bold text-accent mb-1">{value}</div>
      <div className="text-text-secondary text-sm">{label}</div>
    </div>
  );
}

// Feature card for linking to sections
interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
}

export function FeatureCard({ title, description, href, icon }: FeatureCardProps) {
  return (
    <a
      href={href}
      className="card p-4 hover:border-accent/50 transition-all duration-200 block group"
    >
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="font-medium mb-1 group-hover:text-accent transition-colors">{title}</h3>
      <p className="text-text-secondary text-sm">{description}</p>
    </a>
  );
}
