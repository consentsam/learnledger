import './globals.css'
import React from 'react'
import type { Metadata } from 'next'

import { WalletProvider } from '@/components/utilities/wallet-provider'
import { NavBar } from '@/components/utilities/nav-bar'

export const metadata: Metadata = {
  title: 'ProjectLedger',
  description: 'MVP for companies & freelancers with off-chain token rewards',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <WalletProvider>
          <NavBar />
          <div className="p-4">{children}</div>
        </WalletProvider>
      </body>
    </html>
  )
}