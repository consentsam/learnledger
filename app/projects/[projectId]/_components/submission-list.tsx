"use client"

/**
 * @file submission-list.tsx
 *
 * @description
 * Displays a list of existing submissions for a given project.
 * If the connected user is the project's owner, they see an "Approve" button
 * that calls the existing approveSubmissionAction, awarding the prize.
 *
 * Key features:
 * - Renders each submission's studentAddress and PR link
 * - Only shows "Approve" if walletAddress == projectOwner
 * - Calls "approveSubmissionAction" from projects-actions
 *
 * @dependencies
 * - React for rendering
 * - useWallet for connected address
 * - approveSubmissionAction for awarding the project's prize
 * - next/navigation for refreshing
 *
 * @notes
 * - If the project is already closed, you might want to hide or disable Approve.
 * - For MVP, we keep it straightforward.
 */

import React, { useState } from 'react'

import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { useWallet } from '@/components/utilities/wallet-provider'
import { ProjectSubmission } from '@/db/schema/project-submissions-schema'

interface SubmissionListProps {
  projectId: string
  projectOwner: string
  submissions: ProjectSubmission[]
  projectStatus: string
}

export default function SubmissionList({
  projectId,
  projectOwner,
  submissions,
  projectStatus
}: SubmissionListProps) {
  const { walletAddress } = useWallet()
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  // We'll only show Approve if it's open AND you're the owner
  const canApprove = (walletAddress === projectOwner) && (projectStatus === "open")

  /**
   * @function handleApprove
   * @description
   * Called when the owner clicks "Approve" on a specific student's submission.
   * We invoke "approveSubmissionAction" with the student's address. On success,
   * the project becomes "closed" or the assignedFreelancer is set. Then we refresh.
   */
  const handleApprove = async (studentAddress: string) => {
    try {
      setLoading(studentAddress)
      const response = await fetch('/api/projects/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          studentAddress,
          walletAddress
        })
      })
      
      if (!response.ok) throw new Error('Failed to approve')
      
      router.refresh()
    } catch (error) {
      console.error('Error approving:', error)
    } finally {
      setLoading(null)
    }
  }

  if (!submissions || submissions.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No submissions yet for this project.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Submissions</h3>

      <ul className="space-y-1">
        {submissions.map((sub) => (
          <li
            key={sub.id}
            className="border p-2 rounded flex items-center justify-between"
          >
            <div>
              <div className="text-sm">
                Student: <span className="text-blue-600">{sub.studentAddress}</span>
              </div>
              <div className="text-xs text-gray-500 break-all">
                <a
                  href={sub.prLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-700"
                >
                  {sub.prLink}
                </a>
              </div>
            </div>

            {/* Approve button visible only if user is owner */}
            {canApprove && (
              <Button
                variant="default"
                onClick={() => handleApprove(sub.studentAddress)}
                disabled={loading === sub.studentAddress}
              >
                {loading === sub.studentAddress ? 'Approving...' : 'Approve'}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
