"use client"

import React, { useEffect, useState } from 'react'

import { useRouter, useParams } from 'next/navigation'

/**
 * @file page.tsx (Edit an existing project)
 */
export default function EditProjectPage() {
  const router = useRouter()
  const { projectId } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [prizeAmount, setPrizeAmount] = useState('')
  const [requiredSkills, setRequiredSkills] = useState('')
  const [completionSkills, setCompletionSkills] = useState('')

  // 1) Fetch existing project data
  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${projectId}`)
        if (!res.ok) {
          throw new Error('Failed to load project')
        }
        const data = await res.json()
        const p = data.data
        setProjectName(p.projectName || '')
        setProjectDescription(p.projectDescription || '')
        setPrizeAmount(p.prizeAmount || '0')
        setRequiredSkills(p.requiredSkills || '')
        setCompletionSkills(p.completionSkills || '')
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProject()
  }, [projectId])

  // 2) Handle update
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()

    try {
      const body = {
        projectName,
        projectDescription,
        prizeAmount,
        requiredSkills,
        completionSkills,
      }

      // PUT /api/projects/:id
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to update project')
      }

      alert('Project updated successfully')
      router.push('/company')
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return <div className="p-4">Loading...</div>
  }
  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Edit Project</h2>
      <form onSubmit={handleUpdate} className="space-y-3 max-w-md mt-4">
        <div>
          <label className="block font-semibold">Project Name</label>
          <input
            type="text"
            className="border w-full p-2 rounded"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block font-semibold">Description</label>
          <textarea
            className="border w-full p-2 rounded"
            rows={3}
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-semibold">Prize Amount</label>
          <input
            type="number"
            className="border w-full p-2 rounded"
            value={prizeAmount}
            onChange={(e) => setPrizeAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-semibold">Required Skills</label>
          <input
            type="text"
            className="border w-full p-2 rounded"
            value={requiredSkills}
            onChange={(e) => setRequiredSkills(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-semibold">Completion Skills</label>
          <input
            type="text"
            className="border w-full p-2 rounded"
            value={completionSkills}
            onChange={(e) => setCompletionSkills(e.target.value)}
          />
        </div>

        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
          Update
        </button>
      </form>
    </div>
  )
}