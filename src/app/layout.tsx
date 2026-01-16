import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navigation } from '@/components/Navigation'
import { Providers } from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Voice Analytics - TapHealth',
  description: 'Voice call analytics dashboard for TapHealth AI coaching',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white min-h-screen antialiased text-slate-900`}>
        <Providers>
          <Navigation />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-gray-200 mt-12 py-6 text-center text-sm text-gray-500">
            <p>Voice Analytics v0.1.0 | TapHealth AI Coaching</p>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
