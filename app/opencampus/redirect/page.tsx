"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOpenCampusAuth } from '@/components/utilities/ocid-provider'

// Debug helper
const DEBUG = true;
function debug(...args: any[]) {
  if (DEBUG && typeof window !== 'undefined') console.log("[RedirectPage]", ...args);
}

export default function RedirectPage() {
  const router = useRouter()
  const { ocAuth, authState, initialized } = useOpenCampusAuth()
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redirectAttempted, setRedirectAttempted] = useState(false)
  
  useEffect(() => {
    // Client-side only code
    if (typeof window === 'undefined') return;
    
    debug("Redirect page loaded", {
      authState: authState ? {
        isAuthenticated: !!authState?.idToken,
        error: authState?.error
      } : "undefined", 
      hasOcAuth: !!ocAuth,
      initialized
    });

    // Handle the authentication redirect only once
    async function handleRedirect() {
      if (redirectAttempted) {
        debug("Redirect already attempted, skipping");
        return;
      }
      
      setRedirectAttempted(true);
      debug("Starting handleRedirect");
      
      try {
        if (!ocAuth) {
          throw new Error("Auth service not available");
        }
        
        debug("Available ocAuth methods:", Object.getOwnPropertyNames(ocAuth));
        debug("Calling handleLoginRedirect");
        
        // We'll set a timeout to avoid an infinite loop
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Redirect handling timed out")), 10000);
        });
        
        // Race the redirect handling with a timeout
        await Promise.race([
          ocAuth.handleLoginRedirect(),
          timeoutPromise
        ]);
        
        debug("Login redirect handled successfully");
        setIsProcessing(false)
        
        // Store successful auth in localStorage to help prevent redirect loops
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('ocid_auth_success', 'true');
        }
        
        // Use window.location for a clean navigation to avoid Next.js router issues
        window.location.href = '/';
      } catch (error: any) {
        console.error('[RedirectPage] OCID handleLoginRedirect error:', error)
        debug("Error details:", error);
        setError(error?.message || 'Unknown error')
        setIsProcessing(false)
        
        // Still redirect to avoid getting stuck
        setTimeout(() => {
          window.location.href = '/?ocid=error';
        }, 2000);
      }
    }

    // Only attempt redirect handling if we're initialized and have auth service
    if (initialized && ocAuth && !redirectAttempted) {
      handleRedirect();
    }
    
    // Add a safety timeout to prevent getting stuck on this page
    const safetyTimeout = setTimeout(() => {
      if (isProcessing) {
        debug("Safety timeout triggered, redirecting to home");
        setIsProcessing(false);
        window.location.href = '/';
      }
    }, 15000);
    
    return () => clearTimeout(safetyTimeout);
  }, [ocAuth, router, authState, initialized, isProcessing, redirectAttempted]);

  // Handle server-side rendering safely
  if (typeof window === 'undefined') {
    return <div className="p-4">Initializing OCID login...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500 mb-4">
          Error logging in with OCID: {error}
        </div>
        <div className="text-sm">Redirecting to home page...</div>
      </div>
    )
  }

  if (authState?.error) {
    debug("Auth error detected:", authState.error);
    return (
      <div className="p-4">
        <div className="text-red-500 mb-4">
          Error logging in with OCID: {authState.error.message}
        </div>
        <div className="text-sm">Redirecting to home page...</div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        {isProcessing ? "Processing OCID login..." : "Redirect successful! Redirecting..."}
      </div>
      <div className="text-sm text-gray-500">
        If you are not redirected automatically, <a href="/" className="text-blue-500 underline">click here</a>.
      </div>
    </div>
  )
}