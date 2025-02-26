"use client"

import React from 'react'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { useWallet } from '@/components/utilities/wallet-provider'

/**
 * @function NavBar
 * A top navigation bar that shows the project name, a link to /projects,
 * and a connect wallet button or truncated address if connected.
 */
export function NavBar() {
  const { walletAddress, connectWallet, isMetamaskInstalled, disconnectWallet } = useWallet()

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
      const truncated = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      return (
        <div className="flex flex-col items-end gap-1">
          <div className="text-blue-600">Connected: {truncated}</div>
          <button
            className="text-sm text-gray-700 underline"
            onClick={disconnectWallet}
          >
            Disconnect
          </button>
        </div>
      )
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
      <Link href="/" className="font-bold text-lg">ProjectLedger</Link>

      <div className="flex items-center gap-4">
        <Link href="/projects" className="text-sm">
          Projects
        </Link>

        {/* If you want to keep the "Register" link, uncomment:
        <Link href="/register" className="text-sm">
          Register
        </Link>
        */}

        <div>{renderWalletInfo()}</div>
      </div>
    </nav>
  )
}