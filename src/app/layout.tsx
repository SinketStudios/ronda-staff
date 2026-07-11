import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { PWARegister } from "@/components/PWARegister";
import { RouteProgressBar } from "@/components/RouteProgressBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rondaStrong = localFont({
  src: "../../public/fonts/Strong.ttf",
  variable: "--font-ronda-strong",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ronda Staff",
    template: "%s | Ronda Staff",
  },
  description: "Panel interno del equipo de Ronda",
  applicationName: "Ronda Staff",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ronda Staff",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#3a2618',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${rondaStrong.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ronda-bg overscroll-none">
        <RouteProgressBar />
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
