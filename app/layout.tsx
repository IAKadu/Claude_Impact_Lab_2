import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://fila-viva-creche.kadubruns.chatgpt.site'),
  title: 'Fila Viva | Orquestração auditável de vagas',
  description:
    'Coordene vagas de creche, preferências e convocações sem alterar a ordem oficial da fila.',
  applicationName: 'Fila Viva',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Fila Viva',
    description: 'Orquestração auditável de vagas',
    type: 'website',
    locale: 'pt_BR',
    images: [
      {
        url: '/fila-viva-social-card.png',
        width: 1672,
        height: 941,
        alt: 'Fila Viva — Orquestração auditável de vagas',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fila Viva',
    description: 'Orquestração auditável de vagas',
    images: ['/fila-viva-social-card.png'],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
