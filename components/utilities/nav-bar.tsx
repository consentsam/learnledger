// File: components/utilities/nav-bar.tsx
// @ts-nocheck
"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { jwtDecode } from 'jwt-decode'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useOpenCampusAuth } from './ocid-provider'
import { useWallet } from './wallet-provider'

// Debug helper
const DEBUG = true;
function debug(...args: any[]) {
  if (DEBUG && typeof window !== 'undefined') console.log("[NavBar]", ...args);
}

interface DecodedToken {
  edu_username?: string
  eth_address?: string      // If your OCID token includes an ETH address
  user_id?: number
  [key: string]: any
}

export function NavBar() {
  const { authState, ocAuth, initialized } = useOpenCampusAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  
  // Track if we're in the redirect flow
  const [isInRedirectFlow, setIsInRedirectFlow] = useState(false)
  
  const { walletAddress, connect, disconnect, isConnecting } = useWallet()
  
  useEffect(() => {
    // Client-side only effect
    if (typeof window === 'undefined') return;
    
    debug("NavBar mounted, authState:", 
      authState ? {
        isAuthenticated: !!authState?.idToken,
        error: authState?.error
      } : "undefined");
    
    debug("Initialized:", initialized);
      
    if (ocAuth) {
      debug("ocAuth available methods:", Object.getOwnPropertyNames(ocAuth));
    }
    
    // Check if we're in a redirect flow (to prevent multiple redirects)
    const isRedirectPage = window.location.pathname.includes('/redirect');
    const hasAuthCode = window.location.search.includes('code=');
    
    if (isRedirectPage || hasAuthCode) {
      setIsInRedirectFlow(true);
      debug("Detected we're in a redirect flow");
    }
    
    // Only set loading to false once we have a properly initialized auth state
    if (initialized) {
      setIsLoading(false);
    }
  }, [authState, ocAuth, initialized]);

  const handleConnectOCID = async () => {
    debug("Attempting to connect OCID");
    
    // Prevent redirect if we're already in a redirect flow
    if (isInRedirectFlow) {
      debug("Skipping connect because we're already in a redirect flow");
      return;
    }
    
    try {
      if (!ocAuth) {
        debug("No ocAuth available");
        return;
      }
      
      setIsInRedirectFlow(true); // Mark that we're starting a redirect
      await ocAuth.signInWithRedirect({ state: 'opencampus' })
      debug("signInWithRedirect called successfully");
    } catch (err) {
      console.error('[NavBar] OCID signInWithRedirect error:', err)
      setIsInRedirectFlow(false); // Reset on error
    }
  }

  const handleLogoutOCID = async () => {
    debug("Attempting to logout from OCID");
    try {
      // Set logout flag in localStorage to notify other tabs
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ocid_logout', 'true');
        // Reset the flag after a short delay
        setTimeout(() => {
          localStorage.removeItem('ocid_logout');
        }, 1000);
      }
      
      if (!ocAuth) {
        debug("No ocAuth available");
        window.location.href = '/';
        return;
      }
      
      // Log available methods to help debug
      debug("ocAuth methods:", Object.getOwnPropertyNames(ocAuth));
      
      // Force redirect to homepage after a short delay regardless of logout method
      const forceRedirectTimeout = setTimeout(() => {
        debug("Force redirecting to homepage after logout timeout");
        window.location.href = '/';
      }, 3000);
      
      // If ocAuth has a logout or end session method
      if (typeof ocAuth.logout === 'function') {
        debug("Using ocAuth.logout()");
        await ocAuth.logout();
        clearTimeout(forceRedirectTimeout);
        window.location.href = '/';
      } else if (typeof ocAuth.endSession === 'function') {
        debug("Using ocAuth.endSession()");
        await ocAuth.endSession();
        clearTimeout(forceRedirectTimeout);
        window.location.href = '/';
      } else if (typeof ocAuth.signOut === 'function') {
        debug("Using ocAuth.signOut()");
        await ocAuth.signOut();
        clearTimeout(forceRedirectTimeout);
        window.location.href = '/';
      } else if (authState?.idToken) {
        debug("Using standard OIDC logout redirect");
        // Fallback to standard OpenID Connect logout with redirect
        clearTimeout(forceRedirectTimeout);
        
        // Make sure the post logout redirect URI is properly encoded
        const postLogoutUri = encodeURIComponent(window.location.origin);
        const logoutUrl = `${ocAuth.config?.issuer || ''}/protocol/openid-connect/logout`;
        debug("Redirecting to:", logoutUrl, "with post logout redirect to:", postLogoutUri);
        
        window.location.href = `${logoutUrl}?id_token_hint=${authState.idToken}&post_logout_redirect_uri=${postLogoutUri}&state=post_logout`;
      } else {
        debug("No logout method found, just redirecting");
        // Last resort - just redirect to home and clear local session
        clearTimeout(forceRedirectTimeout);
        window.location.href = '/';
      }
    } catch (err) {
      console.error('[NavBar] OCID signOut error:', err);
      // Even if there's an error, redirect user to home page
      window.location.href = '/';
    }
  }

  const renderOCIDInfo = () => {
    // If we're still initializing, show a loading state
    if (isLoading) {
      debug("Auth state is still loading");
      return <div className="text-sm text-gray-500">Loading...</div>;
    }

    if (!authState) {
      debug("No authState available");
      return <div className="text-sm text-gray-500">Auth not available</div>;
    }

    if (authState?.idToken) {
      debug("User is authenticated with idToken");
      try {
        const decoded = jwtDecode<DecodedToken>(authState.idToken)
        debug('Decoded token =>', decoded);
        const username = decoded.edu_username || '(No edu_username)'
        const walletAddress = decoded.eth_address ? 
          `${decoded.eth_address.substring(0, 6)}...${decoded.eth_address.substring(decoded.eth_address.length - 4)}` : 
          '(No wallet address)';

        return (
          <div className="flex items-center gap-2">
            <span className="text-green-600">
              {username}
            </span>
            {decoded.eth_address && (
              <span className="text-xs text-gray-500">
                {walletAddress}
              </span>
            )}
            <Button 
              variant="default" 
              onClick={handleLogoutOCID}
              disabled={isInRedirectFlow}
            >
              Logout
            </Button>
          </div>
        )
      } catch (error) {
        debug("Error decoding token:", error);
        return <div className="text-sm text-red-500">Error decoding token</div>
      }
    } else {
      debug("User is not authenticated");
      return (
        <Button 
          onClick={handleConnectOCID}
          disabled={isInRedirectFlow}
        >
          Connect OCID
        </Button>
      )
    }
  }

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          ProjectLedger
        </Link>
        
        <div className="flex items-center space-x-4">
          <Link href="/api-docs" className="hover:underline">
            API Docs
          </Link>
          
          {walletAddress ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">
                {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
              </span>
              <button
                onClick={disconnect}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}