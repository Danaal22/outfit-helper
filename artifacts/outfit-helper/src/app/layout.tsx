import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Providers from './providers';
import '../index.css';

export const metadata: Metadata = {
  title: { default: 'Outfit Helper — Your personal stylist', template: '%s | Outfit Helper' },
  description: 'Upload your outfit, discover fresh styling ideas, and find the finishing pieces for your look.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
