/**
 * @file page.tsx
 *
 * @description
 * This is the main listing page for the `/projects` route. It is a Next.js Server Component
 * that fetches a list of projects from the database and displays them. It also includes
 * a button for creating a new project, which shows a placeholder form (to be implemented
 * in detail in the next step).
 *
 * Key features:
 * - Server-side data fetching from Drizzle ORM
 * - Rendering a list of projects
 * - "Create Project" button that toggles a client component form
 *
 * @dependencies
 * - db (Drizzle ORM connection)
 * - projectsTable (schema for the "projects" table)
 * - ProjectCreationToggle (client component that renders the "create-project-form")
 *
 * @notes
 * - The actual submission logic for project creation will be handled in Step 11.
 * - For now, we only display a placeholder form when the user clicks the button.
 */

import { db } from '@/db/db'
import { projectsTable } from '@/db/schema/projects-schema'
import { ProjectCreationToggle } from './_components/create-project-form'

export default async function ProjectsPage() {
  /**
   * 1. Fetch projects from DB. 
   *    If no projects exist, we'll display a simple message.
   */
  const projects = await db.select().from(projectsTable)

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Projects</h2>

        {/**
         * The "Create Project" button and placeholder form is in a client component.
         * This toggles showing a simple placeholder form. The real form logic
         * will be implemented in Step 11.
         */}
        <ProjectCreationToggle />
      </div>

      <section className="mt-4">
        {projects.length === 0 ? (
          <p className="text-gray-600">
            No projects found. Click &quot;Create Project&quot; to add one.
          </p>
        ) : (
          <ul className="space-y-2">
            {projects.map((proj) => (
              <li key={proj.id} className="border p-3 rounded shadow-sm">
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
