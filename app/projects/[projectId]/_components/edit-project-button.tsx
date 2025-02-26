"use client"

import React from 'react'

import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { useWallet } from '@/components/utilities/wallet-provider'

interface EditProjectButtonProps {
  projectId: string
  projectOwner: string
  projectStatus: string
}

/**
 * Renders an "Edit Project" button if:
 * - The current user is the projectOwner
 * - The user's role is "company"
 */
export function EditProjectButton({ projectId, projectOwner, projectStatus }: EditProjectButtonProps) {
  const router = useRouter()
  const { walletAddress, userRole } = useWallet()

  const isOwner = walletAddress?.toLowerCase() === projectOwner.toLowerCase()
  const canEdit = isOwner && userRole === 'company' && projectStatus === 'open'
  if (!canEdit) return null

  function handleClick() {
    router.push(`/company/edit/${projectId}`)
  }

  return (
    <Button onClick={handleClick}>
      Edit Project
    </Button>
  )
}