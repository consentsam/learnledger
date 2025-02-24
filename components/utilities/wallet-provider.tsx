/**
 * @file wallet-provider.tsx
 *
 * @description
 * A client-side context provider that uses the `useMetamask` hook
 * to manage a global wallet address. Any component within this provider
 * tree can access the wallet address and connect to Metamask if needed.
 *
 * Key features:
 * - React context for storing walletAddress
 * - A function to initiate the Metamask connection
 * - Minimal checks for Metamask installation
 *
 * @dependencies
 * - React (createContext, useContext, useMemo)
 * - useMetamask (our custom hook)
 *
 * @notes
 * - We intentionally keep logic minimal. A real app might also store
 *   userBalance, chainId, or add an event listener for account changes.
 */

"use client"

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
} from 'react'
import { useMetamask } from '@/lib/hooks/use-metamask'

/**
 * @interface WalletContextProps
 * Describes the shape of data and methods stored in WalletContext.
 */
interface WalletContextProps {
  walletAddress: string | null
  connectWallet: () => Promise<void>
  isMetamaskInstalled: boolean
}

/**
 * @constant WalletContext
 * The actual React context object. It's initially set to an empty object.
 * We will provide it via the WalletProvider.
 */
const WalletContext = createContext<WalletContextProps>({
  walletAddress: null,
  connectWallet: async () => {},
  isMetamaskInstalled: false,
})

/**
 * @function useWallet
 * @description
 * A convenience hook that returns the wallet context object.
 *
 * @returns {WalletContextProps}
 */
export function useWallet(): WalletContextProps {
  return useContext(WalletContext)
}

/**
 * @interface WalletProviderProps
 * The props for the WalletProvider.
 * @property children - The child nodes to wrap within the provider.
 */
interface WalletProviderProps {
  children: ReactNode
}

/**
 * @function WalletProvider
 * @description
 * Wraps the children in a WalletContext.Provider so that any child
 * component can access the connected wallet address or attempt to connect.
 *
 * @param {WalletProviderProps} props - The props object
 * @returns {JSX.Element} The provider element
 *
 * @example
 * <WalletProvider>
 *   <App /> // Now App can call useWallet() to get wallet info
 * </WalletProvider>
 */
export function WalletProvider({ children }: WalletProviderProps) {
  const { walletAddress, connectMetamask, isMetamaskInstalled } = useMetamask()

  /**
   * Because connectMetamask is returned from the custom hook,
   * we wrap it in useCallback just to pass it through context.
   */
  const connectWallet = useCallback(async () => {
    await connectMetamask()
  }, [connectMetamask])

  /**
   * We memoize the context value for performance optimization.
   */
  const value = useMemo(
    () => ({
      walletAddress,
      connectWallet,
      isMetamaskInstalled,
    }),
    [walletAddress, connectWallet, isMetamaskInstalled]
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

