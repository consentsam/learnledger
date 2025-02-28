"use client"

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/components/utilities/wallet-provider'
import { useRouter } from 'next/navigation'

interface SubmissionListProps {
  projectId: string
  projectOwner: string
  projectStatus: string
}

/**
 * @description
 * Renders the list of PR submissions for a project, automatically fetching from:
 *    GET /api/projects/:projectId/submissions
 *
 * - The “View Submissions” button is removed. We fetch them immediately on mount.
 * - If you’re the project owner *and* the project is still "open", you can approve them.
 */
export default function SubmissionList({
  projectId,
  projectOwner,
  projectStatus,
}: SubmissionListProps) {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [approveLoading, setApproveLoading] = useState<string | null>(null)

  const { walletAddress } = useWallet()
  const router = useRouter()

  // Check if current user is the project owner
  const isOwner =
    walletAddress && walletAddress.toLowerCase() === projectOwner.toLowerCase()
  const canApprove = isOwner && projectStatus === 'open'

  // 1) Fetch submissions automatically on mount
  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const res = await fetch(`/api/projects/${projectId}/submissions`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          throw new Error('Failed to load submissions')
        }
        const json = await res.json()
        if (json.isSuccess && Array.isArray(json.data)) {
          setSubmissions(json.data)
        }
      } catch (err) {
        console.error('Error loading submissions:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSubmissions()
  }, [projectId])

  // 2) Approve a submission (if allowed)
  async function handleApprove(freelancerAddress: string) {
    try {
      setApproveLoading(freelancerAddress)
      const resp = await fetch('/api/projects/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          freelancerAddress,
          walletAddress, // the owner's wallet
        }),
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.message || 'Failed to approve submission')
      }
      alert('Submission approved.')
      router.refresh() // Re-fetch data or force reload
    } catch (error: any) {
      alert('Error: ' + error.message)
      console.error('Approve error:', error)
    } finally {
      setApproveLoading(null)
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading submissions...</div>
  }

  if (submissions.length === 0) {
    return <div className="text-sm text-gray-500">No submissions yet.</div>
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
              <div className="text-sm text-blue-600">
                {sub.freelancerAddress}
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

            {canApprove && (
              <Button
                onClick={() => handleApprove(sub.freelancerAddress)}
                disabled={approveLoading === sub.freelancerAddress}
              >
                {approveLoading === sub.freelancerAddress
                  ? 'Approving...'
                  : 'Approve'}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}