"use client"

import { useEffect, useState } from 'react'

export function WebSocketLogger() {
  const [wsAttempts, setWsAttempts] = useState<string[]>([])
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Store original WebSocket constructor
    const OriginalWebSocket = window.WebSocket;
    
    // Create a logging proxy
    function LoggingWebSocket(this: any, url: string | URL, protocols?: string | string[]) {
      const urlString = url.toString();
      console.log("[WebSocketLogger] Connection attempt to:", urlString);
      
      // Add to our list
      setWsAttempts(prev => [...prev, urlString]);
      
      // Call original constructor
      return new OriginalWebSocket(url, protocols);
    }
    
    // Copy static properties
    LoggingWebSocket.prototype = OriginalWebSocket.prototype;
    LoggingWebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    LoggingWebSocket.OPEN = OriginalWebSocket.OPEN;
    LoggingWebSocket.CLOSING = OriginalWebSocket.CLOSING;
    LoggingWebSocket.CLOSED = OriginalWebSocket.CLOSED;
    
    // Replace the WebSocket constructor
    window.WebSocket = LoggingWebSocket as any;
    
    return () => {
      // Restore original WebSocket when component unmounts
      window.WebSocket = OriginalWebSocket;
    };
  }, []);
  
  if (wsAttempts.length === 0) return null;
  
  // Only visible in development
  return process.env.NODE_ENV !== 'production' ? (
    <div 
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        zIndex: 9999,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        maxHeight: '200px',
        overflow: 'auto',
        fontSize: '12px',
        maxWidth: '400px'
      }}
    >
      <h4>WebSocket Attempts:</h4>
      <ul>
        {wsAttempts.map((url, i) => (
          <li key={i}>{url}</li>
        ))}
      </ul>
      <button 
        onClick={() => setWsAttempts([])}
        style={{
          background: '#ff5252',
          border: 'none',
          borderRadius: '3px',
          padding: '5px 10px',
          marginTop: '5px',
          cursor: 'pointer'
        }}
      >
        Clear
      </button>
    </div>
  ) : null;
} 