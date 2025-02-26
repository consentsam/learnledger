/* app/freelancer/[freelancerId]/projects/page.tsx */
import { eq, and, gte, lte, sql, like } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { db } from '@/db/db'
import { freelancerTable } from '@/db/schema/freelancer-schema'
import { projectsTable } from '@/db/schema/projects-schema'


interface FreelancerProjectsProps {
  params: { freelancerId: string }
  searchParams: {
    minPrize?: string
    maxPrize?: string
    skill?: string
  }
}

export default async function FreelancerProjectsPage({
  params,
  searchParams,
}: FreelancerProjectsProps) {
  const { freelancerId } = params

  // 1) Look up the freelancer to confirm existence & get wallet if needed
  const [freelancer] = await db
    .select()
    .from(freelancerTable)
    .where(eq(freelancerTable.id, freelancerId))
    .limit(1)

  if (!freelancer) {
    notFound()
  }

  // 2) Build query conditions
  const conditions = [eq(projectsTable.projectStatus, 'open')];
  
  // Add filter conditions
  if (searchParams.minPrize) {
    const minVal = parseFloat(searchParams.minPrize);
    if (!isNaN(minVal)) {
      conditions.push(gte(projectsTable.prizeAmount, minVal.toString()));
    }
  }
  
  if (searchParams.maxPrize) {
    const maxVal = parseFloat(searchParams.maxPrize);
    if (!isNaN(maxVal)) {
      conditions.push(lte(projectsTable.prizeAmount, maxVal.toString()));
    }
  }
  
  if (searchParams.skill) {
    const skillToSearch = `%${searchParams.skill.trim().toLowerCase()}%`;
    conditions.push(sql`LOWER(${projectsTable.requiredSkills}) LIKE ${skillToSearch}`);
  }
  
  // Run query with all conditions
  const projects = await db
    .select()
    .from(projectsTable)
    .where(and(...conditions));

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">
        Browse Projects (Freelancer: {freelancer.freelancerName})
      </h1>

      {/* A basic filter form (optional) */}
      <form action="" className="flex gap-2 mt-4">
        <input
          type="number"
          name="minPrize"
          placeholder="Min Prize"
          className="border p-1 rounded"
          defaultValue={searchParams.minPrize || ''}
        />
        <input
          type="number"
          name="maxPrize"
          placeholder="Max Prize"
          className="border p-1 rounded"
          defaultValue={searchParams.maxPrize || ''}
        />
        <input
          type="text"
          name="skill"
          placeholder="Skill (e.g. React)"
          className="border p-1 rounded"
          defaultValue={searchParams.skill || ''}
        />
        <button type="submit" className="bg-blue-500 text-white px-3 rounded">
          Filter
        </button>
      </form>

      {/* Display the resulting projects */}
      <div className="mt-4 space-y-3">
        {projects.length === 0 ? (
          <p>No projects found with the given filter.</p>
        ) : (
          projects.map((proj) => (
            <div key={proj.id} className="border p-3 rounded">
              <div className="font-semibold">{proj.projectName}</div>
              <div className="text-sm text-gray-500">
                Prize: {proj.prizeAmount?.toString()} tokens
              </div>
              {proj.projectDescription && (
                <p className="text-sm text-gray-700 mt-1">
                  {proj.projectDescription}
                </p>
              )}

              {/* Link to project detail page (same as /projects/[id]) */}
              <Link
                href={`/projects/${proj.id}`}
                className="text-blue-600 underline mt-2 inline-block"
              >
                View Details
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  )
}