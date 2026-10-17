import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live | GST Tennis Academy',
  description: 'Risultati in tempo reale dei tornei ATP e WTA.',
};

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
