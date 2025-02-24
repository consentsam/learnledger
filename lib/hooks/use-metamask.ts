/**
 * @file use-metamask.ts
 *
 * @description
 * A custom React hook that encapsulates the logic for connecting
 * to the user's Metamask wallet. This is used primarily in the
 * WalletProvider to handle the "Connect Wallet" flow.
 *
 * Key features:
 * - Checks if Metamask (window.ethereum) is present
 * - Requests wallet connection
 * - Retrieves wallet addresses from Metamask
 *
 * @dependencies
 * - React (useState, useCallback) for storing and updating local state
 *
 * @notes
 * - If the user denies access or Metamask is not installed, we handle that gracefully.
 * - For more robust error handling, you might want to check for specific error codes.
 */

"use client" // It's a client-side hook

import { useState, useCallback } from 'react'

export interface UseMetamaskResult {
  walletAddress: string | null
  connectMetamask: () => Promise<void>
  isMetamaskInstalled: boolean
}

/**
 * @function useMetamask
 * @description
 * This hook manages Metamask connectivity. It provides a function to
 * request user accounts from Metamask and stores the wallet address
 * locally.
 *
 * @returns {UseMetamaskResult} - An object containing:
 *   - walletAddress: the currently connected address or null
 *   - connectMetamask: a function to initiate Metamask connection
 *   - isMetamaskInstalled: boolean indicating if Metamask is available
 *
 * @example
 * const { walletAddress, connectMetamask, isMetamaskInstalled } = useMetamask()
 *
 * if (!isMetamaskInstalled) {
 *   return <p>Please install Metamask!</p>
 * }
 *
 * <button onClick={connectMetamask}>Connect Wallet</button>
 * {walletAddress && <p>Connected: {walletAddress}</p>}
 *
 * @notes
 * - "ethereum" is injected globally by Metamask if installed.
 * - This is a minimal approach without signature-based verification.
 */
export function useMetamask(): UseMetamaskResult {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  const isMetamaskInstalled = typeof window !== 'undefined' && !!window.ethereum

  /**
   * @function connectMetamask
   * @description
   * Attempts to request account access from Metamask. If successful,
   * updates the local state with the first returned address.
   */
  const connectMetamask = useCallback(async () => {
    if (!isMetamaskInstalled) {
      alert('Metamask is not installed. Please install it to continue.')
      return
    }

    try {
      if (!window.ethereum) throw new Error('Metamask not found');
      
      const accounts: string[] = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0])
      } else {
        alert('No Metamask accounts found.')
      }
    } catch (error: any) {
      console.error('Failed to connect with Metamask:', error)
      alert(`Failed to connect: ${error?.message || 'Unknown error'}`)
    }
  }, [isMetamaskInstalled])

  return {
    walletAddress,
    connectMetamask,
    isMetamaskInstalled,
  }
}

