// use-metamask.ts
"use client"

import { useState, useEffect, useCallback } from 'react'

export function useMetamask() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const isMetamaskInstalled = typeof window !== 'undefined' && !!window.ethereum

  // On mount, read localStorage if we have something
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('connectedWallet')
      if (saved) {
        setWalletAddress(saved) // re-hydrate
      }
    }
  }, [])

  const connectMetamask = useCallback(async () => {
    if (!isMetamaskInstalled) {
      alert('Metamask is not installed.')
      return
    }
    try {
      const accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' })
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0].toLowerCase())
        localStorage.setItem('connectedWallet', accounts[0].toLowerCase())
      }
    } catch (err) {
      console.error('Failed to connect:', err)
    }
  }, [isMetamaskInstalled])

  const disconnectMetamask = useCallback(() => {
    setWalletAddress(null)
    localStorage.removeItem('connectedWallet')
  }, [])

  return {
    walletAddress,
    isMetamaskInstalled,
    connectMetamask,
    disconnectMetamask,
  }
}