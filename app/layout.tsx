import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/context'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Ztake - Payment Gateway Solutions",
  description:
    "Your trusted partner for comprehensive payment gateway solutions, financial services, and cutting-edge technology solutions.",
  keywords: ["payment gateway", "financial services", "technology solutions", "payment processing", "fintech"],
  authors: [{ name: "Ztake" }],
  creator: "Ztake",
  publisher: "Ztake",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ztake.in",
    title: "Ztake - Payment Gateway Solutions",
    description:
      "Your trusted partner for comprehensive payment gateway solutions, financial services, and cutting-edge technology solutions.",
    siteName: "Ztake",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ztake - Payment Gateway Solutions",
    description:
      "Your trusted partner for comprehensive payment gateway solutions, financial services, and cutting-edge technology solutions.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
