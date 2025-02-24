/**
 * @file layout.tsx
 *
 * @description
 * The root layout for the entire Next.js app. It wraps all pages with
 * the <WalletProvider> to enable global Metamask connectivity, and
 * includes a top-level <NavBar /> that shows the current connection status.
 *
 * Key features:
 * - Ensures every page has access to the wallet context
 * - Renders a NavBar at the top with "Connect Wallet" or the user’s address
 *
 * @dependencies
 * - React (server component)
 * - type { Metadata } from 'next' for Next.js metadata
 * - WalletProvider (client)
 * - NavBar (client)
 *
 * @notes
 * - This is a Next.js server component by default,
 *   but we can import client components inside it (wrapped in the server markup).
 */

import './globals.css'
import React from 'react'
import type { Metadata } from 'next'
import { WalletProvider } from '@/components/utilities/wallet-provider'
import { NavBar } from '@/components/utilities/nav-bar'

export const metadata: Metadata = {
  title: 'ProjectLedger',
  description:
    'MVP platform connecting companies and students with off-chain token rewards.',
}

/**
 * @function RootLayout
 * @description
 * The top-level layout that wraps all other pages/routes in the Next.js app.
 * It includes a global WalletProvider so that any child can access the connected wallet,
 * and a NavBar that displays connection status or a "Connect Wallet" button.
 *
 * @param {React.PropsWithChildren} props - The children to be rendered
 * @returns {JSX.Element} The overall page layout
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {/* Wrap entire app in the WalletProvider */}
        <WalletProvider>
          {/* Render the NavBar at the top */}
          <NavBar />
          {/* Main content area */}
          <div className="p-4">{children}</div>
        </WalletProvider>
      </body>
    </html>
  )
}

