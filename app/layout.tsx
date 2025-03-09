import './globals.css'
import React from 'react'
import type { Metadata } from 'next'

import { NavBar } from '@/components/utilities/nav-bar'
import { OCIDProvider } from '@/components/utilities/ocid-provider' // <-- import your provider
import { WalletProvider } from '@/components/utilities/wallet-provider'
import { WebSocketLogger } from '@/components/utilities/web-socket-logger'

export const metadata: Metadata = {
  title: 'ProjectLedger',
  description: 'MVP with OpenCampus ID + Metamask',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Wrap everything in the OCIDProvider and WalletProvider */}
        <OCIDProvider>
          <WalletProvider>
            <NavBar />
            <main>{children}</main>
            {process.env.NODE_ENV !== 'production' && <WebSocketLogger />}
          </WalletProvider>
        </OCIDProvider>
      </body>
    </html>
  )
}