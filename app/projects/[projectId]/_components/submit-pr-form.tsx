"use client"

/**
 * @file submit-pr-form.tsx
 *
 * @description
 * A client component rendering a form where a student can submit a GitHub PR link.
 * It uses "useWallet()" to detect the student's address. If the user is the project owner,
 * we hide the form. On submit, it calls the server action "createSubmissionAction."
 *
 * Key features:
 * - Minimizes attempts to submit if the project is not open or user is the owner.
 * - Basic local checks for prLink, and logs error messages.
 *
 * @dependencies
 * - React, useState for local form state
 * - useWallet for the user’s connected address
 * - createSubmissionAction server action to store the record
 * - next/navigation for refreshing
 */

import React, { useState, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/components/utilities/wallet-provider'
import { createSubmissionAction } from '@/actions/db/submissions-actions'
import { useRouter } from 'next/navigation'

interface SubmitPrFormProps {
  projectId: string
  projectOwner: string
  projectStatus: string
}

export default function SubmitPrForm({
  projectId,
  projectOwner,
  projectStatus
}: SubmitPrFormProps) {
  const [prLink, setPrLink] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // We need the connected wallet
  const { walletAddress } = useWallet()
  const router = useRouter()

  /**
   * @function handleSubmit
   * @description
   * When the user submits the form, we call `createSubmissionAction` with
   * the projectId, current user address, and prLink. Then we refresh the page
   * to show the newly inserted submission in the list.
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!walletAddress) {
      alert('Please connect your Metamask wallet before submitting a PR.')
      return
    }
    if (walletAddress === projectOwner) {
      alert('Project owner cannot submit PR to their own project.')
      return
    }

    if (!prLink.trim()) {
      alert('PR link cannot be empty.')
      return
    }

    if (projectStatus !== 'open') {
      alert('Project is not open. Submissions are disabled.')
      return
    }

    try {
      setIsSubmitting(true)
      const result = await createSubmissionAction({
        projectId,
        studentAddress: walletAddress,
        prLink,
      })

      if (!result.isSuccess) {
        alert(`Error creating submission: ${result.message}`)
      } else {
        alert('Submission created successfully.')
        setPrLink('')
        // Refresh the page so we see the new submission
        router.refresh()
      }
    } catch (error) {
      console.error('Error submitting PR:', error)
      alert('An error occurred while creating your submission.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Quick checks: if we detect the user is the owner or the project is closed, we hide the form
  if (walletAddress && walletAddress === projectOwner) {
    return (
      <div className="p-4 text-gray-500 text-sm border border-gray-300 rounded">
        You are the owner of this project. Owners cannot submit PRs.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border p-4 rounded">
      <label className="block font-semibold text-gray-700">
        Submit PR Link
      </label>
      <input
        type="url"
        className="w-full border p-2 rounded"
        placeholder="e.g. https://github.com/org/repo/pull/123"
        value={prLink}
        onChange={(e) => setPrLink(e.target.value)}
      />

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit PR'}
      </Button>
    </form>
  )
}

