"use client"

import React, { createContext, useContext, ReactNode } from 'react'

// Create a minimal context structure
const OCIDContext = createContext<{
  authState: null,
  ocAuth: null,
  initialized: boolean
}>({
  authState: null,
  ocAuth: null,
  initialized: true
})

export function useOpenCampusAuth() {
  return useContext(OCIDContext)
}

// Create a minimal mock provider
export function OCIDProvider({ children }: { children: ReactNode }) {
  return (
    <OCIDContext.Provider value={{ authState: null, ocAuth: null, initialized: true }}>
      {children}
    </OCIDContext.Provider>
  )
}

// Mock component to stand in for the OCConnect component
export function OCConnect({ children }: { children: ReactNode, opts: any, sandboxMode: boolean }) {
  return <>{children}</>
}