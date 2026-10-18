import { cn } from '@/lib/utils';

interface MenuCloseIconProps {
  isOpen: boolean;
  size?: number;
  color?: string;
  className?: string;
}

// Hamburger che si trasforma in X. Animato solo con transizioni CSS: prima usava
// framer-motion, che finiva così nel bundle condiviso di tutte le pagine dashboard.
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const lineBase = {
  transformBox: 'view-box',
  transformOrigin: '20px 20px',
} as const;

export function MenuCloseIcon({
  isOpen,
  size = 40,
  color = 'currentColor',
  className,
}: MenuCloseIconProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={cn('', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <line
        x1="10"
        y1="12"
        x2="30"
        y2="12"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        style={{
          ...lineBase,
          transform: isOpen ? 'rotate(45deg) translateY(8px)' : 'none',
          transition: `transform 0.35s ${EASE}`,
        }}
      />
      <line
        x1="10"
        y1="20"
        x2="30"
        y2="20"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        style={{
          ...lineBase,
          opacity: isOpen ? 0 : 1,
          transform: isOpen ? 'scaleX(0)' : 'none',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
      />
      <line
        x1="10"
        y1="28"
        x2="30"
        y2="28"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        style={{
          ...lineBase,
          transform: isOpen ? 'rotate(-45deg) translateY(-8px)' : 'none',
          transition: `transform 0.35s ${EASE}`,
        }}
      />
    </svg>
  );
}
