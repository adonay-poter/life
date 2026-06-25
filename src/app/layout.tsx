import type { Metadata, Viewport } from 'next';
import { Fraunces, Public_Sans, Space_Grotesk } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import ClientWrapper from '@/components/ClientWrapper';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const zemach = localFont({
  src: '../../Zemach_Regular_eafc59f80a.otf',
  variable: '--font-zemach',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ሁሉ - Life Dashboard',
  description: 'Architectural minimalism meets journalistic gravitas. A fully-featured life operating system.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ሁሉ',
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
      className={`${fraunces.variable} ${publicSans.variable} ${spaceGrotesk.variable} ${zemach.variable} h-full antialiased`}
    >
      <head>
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
      <body className="min-h-full bg-[#F7F5F2] flex flex-col font-sans">
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
