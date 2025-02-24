/**
 * @file nav-bar.tsx
 *
 * @description
 * This file contains a simple navigation bar that shows the current
 * wallet address if connected, or a "Connect Wallet" button if not.
 * It uses the `useWallet()` hook from our global WalletContext.
 *
 * Key features:
 * - Minimal nav display
 * - Button to trigger wallet connection
 *
 * @dependencies
 * - React for the component
 * - useWallet from WalletProvider
 * - Shadcn <Button> for a consistent look
 *
 * @notes
 * - You can expand this to add more nav links as needed.
 */

"use client"

import React from 'react'
import { useWallet } from '@/components/utilities/wallet-provider'
import { Button } from '@/components/ui/button'

/**
 * @function NavBar
 * @description
 * A client-side component that displays the user’s wallet address (if connected)
 * or a button to connect if not. Part of the global layout for the entire app.
 *
 * @returns {JSX.Element} Nav markup
 */
export function NavBar() {
  const { walletAddress, connectWallet, isMetamaskInstalled } = useWallet()

  const handleConnect = async () => {
    await connectWallet()
  }

  const renderWalletInfo = () => {
    if (!isMetamaskInstalled) {
      return (
        <div className="text-red-500">
          Metamask is not installed. Please install it to continue.
        </div>
      )
    }

    if (walletAddress) {
      // Truncate address for nice display
      const truncated = `${walletAddress.slice(0, 6)}...${walletAddress.slice(
        -4
      )}`
      return <div className="text-blue-600">Connected: {truncated}</div>
    } else {
      return (
        <Button variant="default" onClick={handleConnect}>
          Connect Wallet
        </Button>
      )
    }
  }

  return (
    <nav className="flex items-center justify-between px-4 py-2 bg-white shadow">
      <div className="font-bold text-lg">ProjectLedger</div>
      <div>{renderWalletInfo()}</div>
    </nav>
  )
}

