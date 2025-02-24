// app/projects/_components/create-project-form.tsx

"use client"

import React, { useState, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/components/utilities/wallet-provider'
import { useRouter } from 'next/navigation'

export function ProjectCreationToggle() {
  const [showForm, setShowForm] = useState(false)

  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [prizeAmount, setPrizeAmount] = useState('')
  const [requiredSkills, setRequiredSkills] = useState('')
  // New field: projectRepo
  const [projectRepo, setProjectRepo] = useState('')

  const { walletAddress } = useWallet()
  const router = useRouter()

  const handleToggleForm = () => {
    setShowForm(!showForm)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!walletAddress) {
      alert('Please connect your Metamask wallet before creating a project.')
      return
    }

    const numericalPrize = parseFloat(prizeAmount || '0')
    if (numericalPrize < 0) {
      alert('Prize amount cannot be negative.')
      return
    }

    // Compose the request payload
    const payload = {
      walletAddress,
      projectName,
      projectDescription,
      prizeAmount: numericalPrize,
      requiredSkills,
      projectRepo, // here is the new field
    }

    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const err = await response.json()
        alert(`Error creating project: ${err.message}`)
        return
      }

      router.refresh()
      setShowForm(false)
      setProjectName('')
      setProjectDescription('')
      setPrizeAmount('')
      setRequiredSkills('')
      setProjectRepo('')

      alert('Project created successfully.')
    } catch (error) {
      console.error('Error submitting project form:', error)
      alert('An error occurred while creating the project.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="default" onClick={handleToggleForm}>
          {showForm ? 'Cancel' : 'Create Project'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border p-4 rounded space-y-3">
          <h3 className="text-lg font-semibold">Create a new project</h3>

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Project Name
            </label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          {/* Project Description */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Project Description
            </label>
            <textarea
              className="w-full border p-2 rounded"
              rows={3}
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
            ></textarea>
          </div>

          {/* Prize Amount */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Prize Amount
            </label>
            <input
              type="number"
              step="0.01"
              className="w-full border p-2 rounded"
              value={prizeAmount}
              onChange={(e) => setPrizeAmount(e.target.value)}
              placeholder="e.g., 100"
            />
          </div>

          {/* Required Skills */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Required Skills (comma separated)
            </label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
              placeholder="e.g., solidity,react"
            />
          </div>

          {/* New field: Project Repo */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Project Repo (e.g. "github.com/consentsam/demo")
            </label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={projectRepo}
              onChange={(e) => setProjectRepo(e.target.value)}
              placeholder="github.com/owner/repo"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" variant="default">
              Submit
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
