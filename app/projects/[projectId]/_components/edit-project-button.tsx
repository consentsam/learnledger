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

export function EditProjectButton({
  projectId,
  projectOwner,
  projectStatus,
}: EditProjectButtonProps) {
  const router = useRouter()
  const { walletAddress, userRole } = useWallet() // userRole might be 'company' or 'freelancer'

  // Are we the owner of this project?
  const isOwner =
    walletAddress && walletAddress.toLowerCase() === projectOwner.toLowerCase()
  // Typically, only a 'company' can edit their project. And if it’s open, we can edit
  const canEdit = isOwner && userRole === 'company' && projectStatus === 'open'

  if (!canEdit) {
    return null
  }

  function handleClick() {
    router.push(`/company/edit/${projectId}`)
  }

  return (
    <Button onClick={handleClick} variant="default">
      Edit Project
    </Button>
  )
}