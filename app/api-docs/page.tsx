"use client"

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import apiSchema from '@/lib/openapi'

// Import SwaggerUI dynamically to prevent SSR issues
const SwaggerUI = dynamic(
  () => import('swagger-ui-react').then(mod => mod.default),
  { ssr: false }
)

export default function ApiDocsPage() {
  // Make sure we're rendering on the client side
  useEffect(() => {
    // Optional: Add any client-side-only initialization here
  }, [])

  return (
    <div className="swagger-container">
      <SwaggerUI spec={apiSchema} />
      <style jsx global>{`
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-container {
          margin: 0;
          padding: 0;
          height: 100vh;
          width: 100vw;
        }
        .swagger-ui {
          margin-top: 0;
        }
      `}</style>
    </div>
  )
} 