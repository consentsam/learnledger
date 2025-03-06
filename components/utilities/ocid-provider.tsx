"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { OCConnect, useOCAuth } from '@opencampus/ocid-connect-js'

// Debug helper
const DEBUG = true;
function debug(...args: any[]) {
  if (DEBUG && typeof window !== 'undefined') console.log("[OCID-Provider]", ...args);
}

// WebSocket URLs that are causing issues - we'll block these
const BLOCKED_WS_URLS = [
  'wss://relay', // Relay WebSockets
  'wss://bridge', // Bridge WebSockets
  'ws://localhost', // Local WebSockets
];

export function OCIDProvider({ children }: { children: React.ReactNode }) {
  debug("OCIDProvider rendering");
  
  // Create options object safely for SSR
  const [opts, setOpts] = useState({
    redirectUri: 'http://localhost:3000/opencampus/redirect',
    postLogoutRedirectUri: 'http://localhost:3000',
    referralCode: 'PARTNER6',
    sandboxMode: true,
    // Default safe values for SSR
    trustedOrigins: ['localhost', '127.0.0.1'],
    disableWebSockets: true,
    // Add additional options to disable networking services
    relayUrl: null, // Disable relay
    bridgeUrl: null, // Disable bridge
    networkingEnabled: false, // Disable networking if this option exists
  });
  
  // Update options with window values once mounted on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get the current origin
      const origin = window.location.origin;
      
      setOpts({
        redirectUri: `${origin}/opencampus/redirect`,
        postLogoutRedirectUri: origin,
        referralCode: 'PARTNER6',
        sandboxMode: true,
        trustedOrigins: ['localhost', '127.0.0.1', window.location.hostname],
        disableWebSockets: true,
        relayUrl: null,
        bridgeUrl: null,
        networkingEnabled: false,
      });
      debug("Updated options with client-side values, origin:", origin);
    }
    
    // Check if we're in a post-logout redirect
    if (typeof window !== 'undefined' && 
        window.location.search.includes('state=post_logout')) {
      debug("Detected post-logout redirect, redirecting to home");
      window.location.href = '/';
    }
  }, []);
  
  // Create a safer WebSocket blocking approach that doesn't throw errors
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const OriginalWebSocket = window.WebSocket;
    
    // Create a mock WebSocket class that appears to work but actually does nothing
    class MockWebSocket {
      // Properties
      readyState = OriginalWebSocket.CLOSED;
      bufferedAmount = 0;
      binaryType = 'blob';
      protocol = '';
      extensions = '';
      
      // Event handlers
      onopen: ((this: WebSocket, ev: Event) => any) | null = null;
      onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
      onerror: ((this: WebSocket, ev: Event) => any) | null = null;
      onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
      
      // Methods
      close(): void {}
      send(): void {}
      addEventListener(): void {}
      removeEventListener(): void {}
      dispatchEvent(): boolean { return false; }
    }
    
    // Create a WebSocket factory function that wraps the original WebSocket
    function WebSocketFactory(url: string | URL, protocols?: string | string[]) {
      const urlString = url.toString();
      
      // Check if URL should be blocked
      const shouldBlock = BLOCKED_WS_URLS.some(blockedUrl => 
        urlString.includes(blockedUrl)
      );
      
      if (shouldBlock) {
        debug("🚫 Silently blocking WebSocket connection to:", urlString);
        console.warn("[OCID-Provider] Blocked WebSocket connection to:", urlString);
        
        // Return a mock WebSocket instance that appears to work but does nothing
        return new MockWebSocket() as unknown as WebSocket;
      }
      
      // For allowed URLs, proceed normally
      debug("✅ Allowing WebSocket connection to:", urlString);
      return new OriginalWebSocket(url, protocols);
    }
    
    // Copy all the static properties from the original WebSocket
    Object.defineProperties(WebSocketFactory, {
      CONNECTING: { value: OriginalWebSocket.CONNECTING },
      OPEN: { value: OriginalWebSocket.OPEN },
      CLOSING: { value: OriginalWebSocket.CLOSING },
      CLOSED: { value: OriginalWebSocket.CLOSED },
      prototype: { value: OriginalWebSocket.prototype }
    });
    
    // Replace the WebSocket constructor
    window.WebSocket = WebSocketFactory as any;
    
    return () => {
      // Restore original WebSocket when component unmounts
      window.WebSocket = OriginalWebSocket;
    };
  }, []);
  
  return (
    <OCConnect opts={opts} sandboxMode={opts.sandboxMode}>
      <OCIDContextWrapper>{children}</OCIDContextWrapper>
    </OCConnect>    
  )
}

const OCIDContext = createContext<any>(null)

export function useOpenCampusAuth() {
  debug("useOpenCampusAuth hook called");
  return useContext(OCIDContext)
}

function OCIDContextWrapper({ children }: { children: React.ReactNode }) {
  const { authState, ocAuth } = useOCAuth()
  const [initialized, setInitialized] = useState(false);
  
  // Listen for logout events
  useEffect(() => {
    if (typeof window === 'undefined' || !ocAuth) return;
    
    // Add an event listener for storage changes to detect logout
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'ocid_logout' && event.newValue === 'true') {
        debug("Detected logout event from another tab");
        window.location.href = '/';
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [ocAuth]);
  
  // Handle initialization once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    debug("OCIDContextWrapper mounted, authState:", 
      authState ? {
        isAuthenticated: !!authState.idToken,
        error: authState.error,
        expiresAt: authState.expiresAt
      } : "undefined");
      
    if (ocAuth) {
      debug("Available ocAuth methods:", Object.getOwnPropertyNames(ocAuth));
      debug("ocAuth config:", ocAuth.config);
      
      // Mark as initialized
      setInitialized(true);
    }
  }, [authState, ocAuth]);
  
  const value = { authState, ocAuth, initialized }
  return (
    <OCIDContext.Provider value={value}>
      {children}
    </OCIDContext.Provider>
  )
}