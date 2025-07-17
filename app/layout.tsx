import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { Providers } from '@/components/ui/providers/Providers'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1c1c1c',
}

export const metadata: Metadata = {
  title: 'Habit Tracker - Rastreador de Hábitos',
  description: 'Una aplicación para rastrear y mejorar tus hábitos diarios. Disponible como app móvil.',
  keywords: ['hábitos', 'productividad', 'tracking', 'app móvil', 'rutinas'],
  authors: [{ name: 'Habit Tracker Team' }],
  creator: 'Habit Tracker',
  publisher: 'Habit Tracker',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Habit Tracker',
  },
  openGraph: {
    type: 'website',
    siteName: 'Habit Tracker',
    title: 'Habit Tracker - Rastreador de Hábitos',
    description: 'Una aplicación para rastrear y mejorar tus hábitos diarios',
  },
  twitter: {
    card: 'summary',
    title: 'Habit Tracker',
    description: 'Una aplicación para rastrear y mejorar tus hábitos diarios',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Habit Tracker" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Habit Tracker" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#1c1c1c" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Cache Control */}
        <meta httpEquiv="Cache-Control" content="max-age=31536000, immutable" />
        
        {/* Favicon Links */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        <Script id="prevent-reload">
          {`
            document.addEventListener('visibilitychange', function() {
              if (document.visibilityState === 'visible') {
                console.log('Tab is now visible - preventing reload');
              }
            });
            
            // PWA Install Prompt
            let deferredPrompt;
            window.addEventListener('beforeinstallprompt', (e) => {
              e.preventDefault();
              deferredPrompt = e;
              console.log('PWA install prompt available');
            });
            
            window.addEventListener('appinstalled', () => {
              console.log('PWA was installed');
            });
          `}
        </Script>
      </body>
    </html>
  )
}