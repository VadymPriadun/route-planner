import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'AI Travel & City Explorer',
  description: 'Інтелектуальний планувальник маршрутів містом',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="uk" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Nav />
        {children}
      </body>
    </html>
  );
}
