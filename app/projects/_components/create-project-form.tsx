/**
 * @file create-project-form.tsx
 *
 * @description
 * A client component responsible for rendering a "Create Project" button and a form to gather
 * project information. When the user submits, it sends a POST request to the `/api/projects/create`
 * endpoint, which calls the `createProjectAction` server action to insert a new project.
 *
 * Improvements:
 * - Added a simple check to ensure the user does not enter a negative `prizeAmount`.
 *
 * Key features:
 * - Toggle button to show/hide the creation form
 * - Input fields for project details: name, description, prizeAmount, requiredSkills
 * - Submits the user's wallet address from `useWallet()`
 * - On successful project creation, uses `router.refresh()` to update the Projects list
 */

'use client'

import React, { useState, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/components/utilities/wallet-provider'
import { useRouter } from 'next/navigation'

export function ProjectCreationToggle(): React.ReactElement {
  // Manages whether the form is visible
  const [showForm, setShowForm] = useState(false)

  // Local states for each form field
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [prizeAmount, setPrizeAmount] = useState('')
  const [requiredSkills, setRequiredSkills] = useState('')

  // Metamask wallet address from our global context
  const { walletAddress } = useWallet()

  // Next.js router for refreshing the /projects page after successful creation
  const router = useRouter()

  /**
   * Toggles the form open/closed
   */
  const handleToggleForm = () => {
    setShowForm(!showForm)
  }

  /**
   * @function handleSubmit
   * @description
   * Gathers the form data, along with the user's wallet address, and posts it
   * to our new `/api/projects/create` endpoint. If successful, the page is refreshed
   * to display the newly created project.
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // We expect the user to have a wallet connected
    if (!walletAddress) {
      alert('Please connect your Metamask wallet before creating a project.')
      return
    }

    // Quick client-side check for negative amounts
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

      // If successful, we can refresh the /projects page to see the new project
      router.refresh()

      // Clear form & hide
      setShowForm(false)
      setProjectName('')
      setProjectDescription('')
      setPrizeAmount('')
      setRequiredSkills('')
      alert('Project created successfully.')
    } catch (error) {
      console.error('Error submitting project form:', error)
      alert('An error occurred while creating the project.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toggle Button */}
      <div className="flex items-center gap-3">
        <Button variant="default" onClick={handleToggleForm}>
          {showForm ? 'Cancel' : 'Create Project'}
        </Button>
      </div>

      {/* Conditionally render the creation form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md p-4 border border-gray-300 rounded shadow-sm space-y-4"
        >
          <h3 className="text-lg font-semibold">Create a new project</h3>

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
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

          {/* Submit Button */}
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
