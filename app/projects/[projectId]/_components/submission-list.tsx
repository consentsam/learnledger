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
import { useWallet } from '@/components/utilities/wallet-provider'
import { ProjectSubmission } from '@/db/schema/project-submissions-schema'
import { Button } from '@/components/ui/button'
import { approveSubmissionAction } from '@/actions/db/projects-actions'
import { useRouter } from 'next/navigation'

interface SubmissionListProps {
  projectId: string
  projectOwner: string
  submissions: ProjectSubmission[]
}

export default function SubmissionList({
  projectId,
  projectOwner,
  submissions,
}: SubmissionListProps) {
  const { walletAddress } = useWallet()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  /**
   * @function handleApprove
   * @description
   * Called when the owner clicks "Approve" on a specific student's submission.
   * We invoke "approveSubmissionAction" with the student's address. On success,
   * the project becomes "closed" or the assignedFreelancer is set. Then we refresh.
   */
  const handleApprove = async (studentAddress: string) => {
    if (!walletAddress) {
      alert('Please connect your wallet first.')
      return
    }
    if (walletAddress !== projectOwner) {
      alert('You are not the project owner; cannot approve submissions.')
      return
    }

    try {
      setLoading(studentAddress)
      const result = await approveSubmissionAction({
        projectId,
        studentAddress,
        walletAddress,
      })
      if (!result.isSuccess) {
        alert(`Failed to approve submission: ${result.message}`)
      } else {
        alert(`Submission approved. ${result.message}`)
        // Refresh page to reflect the new project status
        router.refresh()
      }
    } catch (error) {
      console.error('Error approving submission:', error)
      alert('An error occurred while approving the submission.')
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
            {walletAddress === projectOwner && (
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
