"use client"

import React, { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/components/utilities/wallet-provider'

// REMOVED: import { createSubmissionAction } from '@/actions/db/submissions-actions'
// We'll do fetch('/api/projects/...') instead

interface SubmitPrFormProps {
  projectId: string
  projectOwner: string
  projectStatus: string
}

export default function SubmitPrForm({
  projectId,
  projectOwner,
  projectStatus,
}: SubmitPrFormProps) {
  const [prLink, setPrLink] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { walletAddress } = useWallet()
  const router = useRouter()

  // Only show if user != owner + project is open
  const isOwner =
    walletAddress && walletAddress.toLowerCase() === projectOwner.toLowerCase()
  const isOpen = projectStatus === 'open'

  if (!isOpen) {
    return (
      <p className="text-sm text-gray-500">
        Submissions closed. (Project status is {projectStatus})
      </p>
    )
  }

  if (isOwner) {
    return null // Owner cannot submit
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!walletAddress) {
      alert('Please connect your wallet first.')
      return
    }

    if (!prLink.trim()) {
      alert('Please enter a valid PR link.')
      return
    }

    setIsSubmitting(true)
    try {
      // Instead of server action, do an API call:
      const resp = await fetch(`/api/projects/${projectId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          freelancerAddress: walletAddress, // from your wallet
          prLink
        }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to create submission')
      }

      const result = await resp.json()
      if (!result.isSuccess) {
        alert(`Submission failed: ${result.message}`)
      } else {
        alert('PR submitted successfully!')
        setPrLink('')
        router.refresh() // Re-fetch page data
      }
    } catch (err) {
      console.error('Error submitting PR:', err)
      alert('Error submitting PR.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border p-4 rounded space-y-2">
      <label className="block font-semibold">Submit a Pull Request Link</label>
      <input
        type="url"
        className="border w-full p-2 rounded"
        placeholder="https://github.com/owner/repo/pull/123"
        value={prLink}
        onChange={(e) => setPrLink(e.target.value)}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit PR'}
      </Button>
    </form>
  )
}