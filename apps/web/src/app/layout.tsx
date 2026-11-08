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
        <div className="bg" aria-hidden="true">
            <div className="blob blob-coral" />
            <div className="blob blob-cream" />
            <div className="blob blob-navy" />
            <div className="blob blob-coral2" />
        </div>
        <Nav />
        {children}
        </body>
        </html>
    );
}