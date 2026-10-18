'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Ritardo in secondi, per far comparire gli elementi uno dopo l'altro */
  delay?: number;
}

// Fa comparire il contenuto (dissolvenza + leggera salita) quando entra nello schermo.
// IntersectionObserver + transizione CSS (classi .reveal in globals.css): stesso
// effetto di prima senza caricare framer-motion nella landing.
export default function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const style = delay ? ({ '--reveal-delay': `${delay}s` } as CSSProperties) : undefined;

  return (
    <div
      ref={ref}
      className={`reveal${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}
      style={style}
    >
      {children}
    </div>
  );
}
