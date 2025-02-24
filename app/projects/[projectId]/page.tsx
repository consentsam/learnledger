/**
 * @file page.tsx
 *
 * @description
 * A Next.js Server Component for the route /projects/[projectId].
 * It loads the project by ID and any associated submissions, then renders them.
 *
 * Key features:
 * - Server-side data fetching for the project and submissions
 * - Renders simple HTML for the project details
 * - Uses child client components to handle "Submit PR" or "Approve" logic
 *
 * Improvements:
 * - We hide <SubmitPrForm /> entirely if the project is not open
 *
 * @dependencies
 * - db, projectsTable for querying the project
 * - getSubmissionsByProjectAction to fetch submissions
 * - SubmitPrForm, SubmissionList are client components for user interaction
 *
 * @notes
 * - The client side still checks wallet ownership to show/hide the Approve button or submission form.
 */

import React from 'react'
import { db } from '@/db/db'
import { projectsTable } from '@/db/schema/projects-schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import {
  getSubmissionsByProjectAction
} from '@/actions/db/submissions-actions'
import SubmissionList from './_components/submission-list'
import SubmitPrForm from './_components/submit-pr-form'

interface ProjectPageProps {
  params: { projectId: string }
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { projectId } = params

  // 1) Fetch the project
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1)

  // If not found, show a 404-like result
  if (!project) {
    notFound()
  }

  // 2) Fetch submissions for this project
  const submissions = await getSubmissionsByProjectAction(projectId)

  // 3) Render the data (SSR).
  return (
    <main className="p-4 space-y-8">
      <section className="border p-4 rounded shadow">
        <h1 className="text-2xl font-bold mb-2">{project.projectName}</h1>
        <p className="text-sm text-gray-600">Status: {project.projectStatus}</p>

        {project.projectDescription && (
          <p className="mt-3 text-gray-800">{project.projectDescription}</p>
        )}

        {/* Show the prize if it is non-zero */}
        {project.prizeAmount && Number(project.prizeAmount) > 0 && (
          <p className="mt-2 text-blue-800 font-semibold">
            Reward: {project.prizeAmount?.toString()} tokens
          </p>
        )}

        {/* Required skills, if any */}
        {project.requiredSkills && (
          <p className="text-xs text-gray-500 mt-1">
            Required Skills: {project.requiredSkills}
          </p>
        )}
      </section>

      {/**
       * 4) We only render the <SubmitPrForm /> if the project is still open.
       *    If the project is closed, there's no reason to show a submission form.
       */}
      {project.projectStatus === "open" && (
        <SubmitPrForm
          projectId={projectId}
          projectOwner={project.projectOwner}
          projectStatus={project.projectStatus}
        />
      )}

      {/**
       * 5) The submissions list is shown to everyone, but
       *    only the owner sees "Approve" buttons, per the client logic.
       */}
      <SubmissionList
        projectId={projectId}
        projectOwner={project.projectOwner}
        submissions={submissions}
      />
    </main>
  )
}

