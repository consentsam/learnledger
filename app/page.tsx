import React from 'react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800">Hello ProjectLedger!</h1>
      <p className="text-gray-600">
        Shadcn UI and Tailwind are now integrated. Check out this button:
      </p>

      <Button>Shadcn Button</Button>

      <Button variant="destructive">Destructive Button</Button>
    </main>
  )
}
