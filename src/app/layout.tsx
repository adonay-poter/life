import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Fraunces, Public_Sans, Space_Grotesk } from 'next/font/google';
import './globals.css';
import ClientWrapper from '@/components/ClientWrapper';

const zemach = localFont({
  src: '../../Zemach_Regular_eafc59f80a.otf',
  variable: '--font-zemach',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hulu - ሁሉ - Life Dashboard',
  description: 'Architectural minimalism meets journalistic gravitas. A fully-featured life operating system.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Hulu - ሁሉ',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#F7F5F2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
 };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${zemach.variable} ${fraunces.variable} ${publicSans.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored === 'dark' || (!stored && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
        {process.env.NODE_ENV !== 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then((registrations) => {
                    for (let r of registrations) {
                      r.unregister().then(() => {
                        console.log('Unregistered active service worker in development mode.');
                      });
                    }
                  });
                }
              `,
            }}
          />
        )}
      </head>
      <body className="min-h-full bg-neutral-bg flex flex-col font-sans">
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
