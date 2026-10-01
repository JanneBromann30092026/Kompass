import { useId } from 'react';
import { motion, type Variants } from 'motion/react';
import { cn } from '@/components/ui';

export type CompassState = 'idle' | 'working' | 'success' | 'error';

const needleVariants: Variants = {
  idle: { rotate: -100, transition: { type: 'spring', stiffness: 170, damping: 26 } },
  // Searching while the key is derived.
  working: {
    rotate: [-100, -40, -150, -70],
    transition: { duration: 1.8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
  },
  // Swings in to north-east (as in the app icon) and settles.
  success: { rotate: 0, transition: { type: 'spring', stiffness: 140, damping: 11 } },
  error: {
    rotate: [-100, -80, -120, -90, -100],
    transition: { duration: 0.45, ease: 'easeInOut' },
  },
};

const glowVariants: Variants = {
  idle: { opacity: 0.35, scale: 0.9 },
  working: {
    opacity: [0.35, 0.6, 0.35],
    scale: 1,
    transition: { duration: 1.8, repeat: Infinity },
  },
  success: { opacity: [0.9, 0.55], scale: [0.9, 1.25], transition: { duration: 0.9 } },
  error: { opacity: 0.35, scale: 0.9 },
};

/**
 * The app icon as a living mark: the needle searches while the password is checked and
 * swings into place when the app unlocks (key moment with a soft glow).
 */
export function CompassMark({ state, size = 112 }: { state: CompassState; size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <div className="relative" style={{ width: size, height: size }} data-state={state}>
      <motion.div
        aria-hidden
        className="lock-glow pointer-events-none absolute -inset-1/2 rounded-full"
        variants={glowVariants}
        initial="idle"
        animate={state}
      />
      <svg
        viewBox="0 0 512 512"
        width={size}
        height={size}
        aria-hidden
        className={cn('relative drop-shadow-[0_18px_40px_var(--shadow-color)]')}
      >
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#13525C" />
            <stop offset="0.55" stopColor="#0A3139" />
            <stop offset="1" stopColor="#05181D" />
          </linearGradient>
          <radialGradient id={`${uid}-glow`} cx="50%" cy="46%" r="52%">
            <stop offset="0" stopColor="#3CC4CF" stopOpacity="0.34" />
            <stop offset="1" stopColor="#3CC4CF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="512" height="512" rx="112" fill={`url(#${uid}-bg)`} />
        <rect width="512" height="512" rx="112" fill={`url(#${uid}-glow)`} />
        <circle
          cx="256"
          cy="256"
          r="174"
          fill="none"
          stroke="#E6F6F7"
          strokeOpacity="0.2"
          strokeWidth="5"
        />
        <g fill="#E6F6F7" fillOpacity="0.5">
          <circle cx="379" cy="133" r="7" />
          <circle cx="379" cy="379" r="7" />
          <circle cx="133" cy="379" r="7" />
          <circle cx="133" cy="133" r="7" />
        </g>
        <g fill="#E6F6F7">
          <path d="M256 60 L256 256 L230 230 Z" fillOpacity="0.92" />
          <path d="M256 60 L256 256 L282 230 Z" fillOpacity="0.55" />
          <path d="M452 256 L256 256 L282 230 Z" fillOpacity="0.92" />
          <path d="M452 256 L256 256 L282 282 Z" fillOpacity="0.55" />
          <path d="M256 452 L256 256 L282 282 Z" fillOpacity="0.92" />
          <path d="M256 452 L256 256 L230 282 Z" fillOpacity="0.55" />
          <path d="M60 256 L256 256 L230 282 Z" fillOpacity="0.92" />
          <path d="M60 256 L256 256 L230 230 Z" fillOpacity="0.55" />
        </g>
        <motion.g variants={needleVariants} initial="idle" animate={state}>
          <path d="M364 148 L256 256 L231 231 Z" fill="#7EEBE5" />
          <path d="M364 148 L256 256 L281 281 Z" fill="#22B4BC" />
          <path d="M148 364 L256 256 L231 231 Z" fill="#FFD36B" />
          <path d="M148 364 L256 256 L281 281 Z" fill="#E9970E" />
        </motion.g>
        <circle cx="256" cy="256" r="19" fill="#0A3139" stroke="#F2FBFB" strokeWidth="7" />
      </svg>
    </div>
  );
}
