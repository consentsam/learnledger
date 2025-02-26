/**
 * @file page.tsx
 *
 * @description
 * This is the main listing page for the `/projects` route. It is a Next.js Server Component
 * that fetches a list of projects from the database and displays them. Now each project
 * is wrapped in a clickable link that navigates to `/projects/[projectId]`.
 *
 * Key features:
 * - Server-side data fetching from Drizzle ORM
 * - Rendering a list of projects
 * - "Create Project" toggle for adding new projects
 * - Each project name links to the detail page
 *
 * @dependencies
 * - db (Drizzle ORM connection)
 * - projectsTable (schema for "projects" table)
 * - Link from "next/link" for navigation
 * - ProjectCreationToggle for the "create project" form
 *
 * @notes
 * - The detail page (app/projects/[projectId]/page.tsx) must exist
 *   so clicking a project navigates properly.
 */
import Link from 'next/link'

import { db } from '@/db/db'
import { projectsTable } from '@/db/schema/projects-schema'

import { ProjectCreationToggle } from './_components/create-project-form'

// Next.js app router server component
export default async function ProjectsPage() {
  // 1) Fetch projects from DB
  const projects = await db.select().from(projectsTable)

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Projects</h2>

        {/* The "Create Project" toggle button and form */}
        <ProjectCreationToggle />
      </div>

      {/* Projects listing */}
      <section className="mt-4">
        {projects.length === 0 ? (
          <p className="text-gray-600">
            No projects found. Click &quot;Create Project&quot; to add one.
          </p>
        ) : (
          <ul className="space-y-2">
            {projects.map((proj) => (
              <li
                key={proj.id}
                className="border p-3 rounded shadow-sm flex flex-col gap-2"
              >
                <div>
                  <div className="font-semibold text-gray-800">
                    {proj.projectName}
                  </div>
                  <div className="text-sm text-gray-500">
                    Status: {proj.projectStatus}
                  </div>
                  {proj.projectDescription && (
                    <div className="text-sm text-gray-700 mt-1">
                      {proj.projectDescription}
                    </div>
                  )}
                </div>

                {/* "View Details" button */}
                <div>
                  <Link
                    href={`/projects/${proj.id}`}
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    View Details
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}