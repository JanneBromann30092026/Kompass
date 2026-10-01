import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { spring } from '@/styles/motion';
import { cn } from './cn';

export interface EmptyStateProps {
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
}

/** Geometric illustration: rounded square, circles and a small compass needle. */
function Illustration() {
  return (
    <svg width="148" height="112" viewBox="0 0 148 112" aria-hidden className="overflow-visible">
      <rect x="30" y="18" width="76" height="76" rx="24" fill="var(--accent-soft)" />
      <circle cx="112" cy="30" r="16" fill="var(--amber-soft)" />
      <circle cx="26" cy="86" r="12" fill="var(--accent-soft)" />
      <circle
        cx="68"
        cy="56"
        r="27"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        opacity="0.35"
      />
      <path d="M88 36 L68 56 L63 51 Z" fill="var(--accent)" />
      <path d="M88 36 L68 56 L73 61 Z" fill="var(--accent)" opacity="0.7" />
      <path d="M48 76 L68 56 L63 51 Z" fill="var(--amber)" />
      <path d="M48 76 L68 56 L73 61 Z" fill="var(--amber)" opacity="0.7" />
      <circle
        cx="68"
        cy="56"
        r="5"
        fill="var(--surface-raised)"
        stroke="var(--accent)"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export function EmptyState({ title, text, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
      className={cn(
        'mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-12 text-center',
        className,
      )}
    >
      <Illustration />
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-fg">{title}</h2>
        {text && <p className="text-base text-fg-secondary">{text}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}
