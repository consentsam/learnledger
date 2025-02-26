"use client"

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
  useState,
  useEffect
} from 'react'

import { useRouter } from 'next/navigation'

import RoleSelectionModal from '@/components/utilities/role-selection-modal'
import { useMetamask } from '@/lib/hooks/use-metamask'

interface WalletContextProps {
  walletAddress: string | null
  connectWallet: () => Promise<void>
  isMetamaskInstalled: boolean
  disconnectWallet: () => void

  /**
   * If desired, store the chosen role in context so we know if user is "company" or "freelancer."
   */
  userRole: 'company' | 'freelancer' | null

  /**
   * Force showing the role selection modal. For example, if the user clicks "Post Job" or "Mint Money"
   * directly from the nav or a button, we can skip waiting for an address.
   */
  showRolePrompt: () => void
}

const WalletContext = createContext<WalletContextProps>({
  walletAddress: null,
  connectWallet: async () => {},
  isMetamaskInstalled: false,
  userRole: null,
  showRolePrompt: () => {},
  disconnectWallet: () => {},
})

export function useWallet(): WalletContextProps {
  return useContext(WalletContext)
}

interface WalletProviderProps {
  children: ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const router = useRouter()
  const { walletAddress, connectMetamask, isMetamaskInstalled, disconnectMetamask } = useMetamask()

  // ephemeral state
  const [userRole, setUserRole] = useState<'company' | 'freelancer' | null>(null)

  // controls the "Which role do you want?" modal
  const [showRoleModal, setShowRoleModal] = useState(false)

  // expose this so we can manually show the role modal if user clicks "Post Job" or "Mint Money"
  const showRolePrompt = useCallback(() => {
    setShowRoleModal(true)
  }, [])

  const connectWallet = useCallback(async () => {
    await connectMetamask()
  }, [connectMetamask])

  const disconnectWallet = useCallback(() => {
    disconnectMetamask()
    setUserRole(null)
  }, [disconnectMetamask])

  // If the user has a wallet but not role, we can show the modal automatically.
  // For your flow, you might want this. Or you can require them to click a button.
  useEffect(() => {
    if (walletAddress && !userRole) {
      setShowRoleModal(true)
    }
  }, [walletAddress, userRole])

  /**
   * If the user picks "Company" or "Freelancer", we store role in memory and push them to register.
   * Then the register page sees ?role=company and does the checkUserProfile call to see if
   * they need the form or can skip.
   */
  async function handleSelectRole(selected: 'company' | 'freelancer') {
    setUserRole(selected)
    setShowRoleModal(false)

    // If no wallet, force them to connect first
    if (!walletAddress) {
      alert('Please connect your wallet first.')
      return
    }
    // Go to /register?role=company or /register?role=freelancer
    router.push(`/register?role=${selected}`)
  }

  const value = useMemo(
    () => ({
      walletAddress,
      connectWallet,
      isMetamaskInstalled,
      userRole,
      showRolePrompt,
      disconnectWallet,
    }),
    [walletAddress, connectWallet, isMetamaskInstalled, userRole, showRolePrompt, disconnectWallet]
  )

  return (
    <WalletContext.Provider value={value}>
      {children}

      {showRoleModal && walletAddress && (
        <RoleSelectionModal
          onSelect={handleSelectRole}
          onClose={() => setShowRoleModal(false)}
        />
      )}
    </WalletContext.Provider>
  )
}