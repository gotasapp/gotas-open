import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import Footer from "@/components/footer";
import { CookieConsent } from "@/components/cookie-consent";
import { Toaster } from "sonner";
import MetaPixel from "@/components/MetaPixel";
import SeedtagPixel from "@/components/SeedtagPixel";
import PixTrackingPixel from "@/components/PixTrackingPixel";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import SlisePixel from "@/components/SlisePixel";
import TwitterPixel from "@/components/TwitterPixel";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cards.gotas.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Colecione CARDS DO FUTEBOL digitais exclusivos',
    template: '%s | CARDS DO FUTEBOL',
  },
  description: 'Colecione CARDS DO FUTEBOL digitais exclusivos. Descubra, resgate e exiba sua coleção com experiências únicas.',
  openGraph: {
    type: 'website',
    siteName: 'CARDS DO FUTEBOL',
    url: '/',
    title: 'Colecione CARDS DO FUTEBOL digitais exclusivos',
    description: 'Colecione CARDS DO FUTEBOL digitais exclusivos. Descubra, resgate e exiba sua coleção com experiências únicas.',
    images: [{ url: '/logo.svg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Colecione CARDS DO FUTEBOL digitais exclusivos',
    description: 'Colecione CARDS DO FUTEBOL digitais exclusivos. Descubra, resgate e exiba sua coleção com experiências únicas.',
    images: ['/logo.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/logo.svg", sizes: "any" }
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.svg",
    other: {
      rel: "mask-icon",
      url: "/favicon.svg",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <GoogleAnalytics />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <script src="/sw-cleanup.js" async></script>
        <script src="/wallet-interceptor.js" async></script>
        <script src="/cleanup-malformed-comments.js" async></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Desregistrar service workers que podem estar causando erros de cache
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister().catch(function(error) {
                      // Service worker removido silenciosamente
                    });
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MetaPixel />
        <SeedtagPixel />
        <PixTrackingPixel />
        <SlisePixel />
        <TwitterPixel />
        <Providers>
          {children}
        </Providers>
        <Footer />
        <CookieConsent />
        <Toaster
          position="top-right"
          theme="light"
          richColors={false}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: 'flex items-center gap-3 p-4 bg-white border-2 border-gray-900 rounded-lg shadow-lg font-sans text-gray-900',
              title: 'text-gray-900 font-medium text-sm',
              description: 'text-gray-700 text-sm',
              success: 'flex items-center gap-3 p-4 bg-white border-2 border-gray-900 rounded-lg shadow-lg font-sans text-gray-900',
              error: 'flex items-center gap-3 p-4 bg-white border-2 border-gray-900 rounded-lg shadow-lg font-sans text-gray-900',
              info: 'flex items-center gap-3 p-4 bg-white border-2 border-gray-900 rounded-lg shadow-lg font-sans text-gray-900',
              warning: 'flex items-center gap-3 p-4 bg-white border-2 border-gray-900 rounded-lg shadow-lg font-sans text-gray-900',
              loading: 'flex items-center gap-3 p-4 bg-white border-2 border-gray-900 rounded-lg shadow-lg font-sans text-gray-900',
              actionButton: 'bg-gray-900 text-white px-3 py-1.5 rounded text-sm font-medium',
              cancelButton: 'bg-gray-200 text-gray-900 px-3 py-1.5 rounded text-sm font-medium',
              closeButton: 'text-gray-900',
            },
          }}
          style={{
            zIndex: 9999999,
          }}
        />
      </body>
    </html>
  );
}
