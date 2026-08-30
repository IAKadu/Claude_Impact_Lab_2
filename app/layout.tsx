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
  metadataBase: new URL('http://localhost:3000'),
  title: 'Fila Viva | Da inscrição à matrícula',
  description:
    'Integre localização, preferências, validação e coordenação de vagas sem alterar a ordem oficial da fila.',
  applicationName: 'Fila Viva',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Fila Viva',
    description: 'Da inscrição à coordenação auditável de vagas',
    type: 'website',
    locale: 'pt_BR',
    images: [
      {
        url: '/fila-viva-social-card.svg',
        width: 1200,
        height: 630,
        alt: 'Fila Viva — Da inscrição à coordenação auditável de vagas',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fila Viva',
    description: 'Da inscrição à coordenação auditável de vagas',
    images: ['/fila-viva-social-card.svg'],
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
