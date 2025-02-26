import { eq, inArray, and } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import { db } from '@/db/db'
import { companyTable } from '@/db/schema/company-schema'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'
import { projectsTable } from '@/db/schema/projects-schema'

interface CompanySubmissionsPageProps {
  params: { companyId: string }
  searchParams: { merged?: string }   // We'll read ?merged=1 or ?merged=0
}

/**
 * Server Component that shows all PR submissions across all projects
 * owned by the specified company. The user can optionally filter
 * by merged=1 (only show merged) or merged=0 (only show not merged).
 * The button color is red if isMerged=true, green if isMerged=false.
 */
export default async function CompanySubmissionsPage({
  params,
  searchParams
}: CompanySubmissionsPageProps) {
  const { companyId } = params
  const mergedFilter = searchParams.merged

  // 1) Look up the company
  const [company] = await db
    .select()
    .from(companyTable)
    .where(eq(companyTable.id, companyId))
    .limit(1)

  if (!company) {
    notFound()
  }

  // 2) Fetch all projects that belong to this company’s walletAddress
  const userProjects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.projectOwner, company.walletAddress))

  if (userProjects.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold">Submissions</h1>
        <p className="mt-2">No projects found for this company.</p>
      </div>
    )
  }

  const projectIds = userProjects.map((p) => p.id)

  // 3) Build where conditions
  //    We'll always require projectSubmissionsTable.projectId in projectIds
  //    If merged=1 => isMerged= true
  //    If merged=0 => isMerged= false
  let conditions = [
    inArray(projectSubmissionsTable.projectId, projectIds),
  ]

  if (mergedFilter === '1') {
    conditions.push(eq(projectSubmissionsTable.isMerged, true))
  } else if (mergedFilter === '0') {
    conditions.push(eq(projectSubmissionsTable.isMerged, false))
  }

  // 4) Query submissions joined with projects
  const submissions = await db
    .select({
      submissionId: projectSubmissionsTable.id,
      studentAddress: projectSubmissionsTable.studentAddress,
      prLink: projectSubmissionsTable.prLink,
      isMerged: projectSubmissionsTable.isMerged,
      projectId: projectSubmissionsTable.projectId,
      projectName: projectsTable.projectName,
      projectStatus: projectsTable.projectStatus,
      prizeAmount: projectsTable.prizeAmount,
    })
    .from(projectSubmissionsTable)
    .leftJoin(
      projectsTable,
      eq(projectSubmissionsTable.projectId, projectsTable.id)
    )
    .where(and(...conditions))

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Submissions</h1>
      <p className="text-sm text-gray-500 mb-4">
        Viewing all PR submissions made across your projects. Filter below:
      </p>

      {/* Merged filter links */}
      <div className="space-x-4 mb-4">
        <Link
          href={`/company/${companyId}/submissions`}
          className="px-3 py-1 bg-gray-200 text-sm rounded"
        >
          All
        </Link>
        <Link
          href={`/company/${companyId}/submissions?merged=1`}
          className="px-3 py-1 bg-red-300 text-sm rounded"
        >
          Only Merged
        </Link>
        <Link
          href={`/company/${companyId}/submissions?merged=0`}
          className="px-3 py-1 bg-green-300 text-sm rounded"
        >
          Only Not Merged
        </Link>
      </div>

      {submissions.length === 0 ? (
        <p className="mt-4">No submissions found with this filter.</p>
      ) : (
        <div className="mt-6 overflow-x-auto border rounded">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="py-2 px-3 text-left">Project Name</th>
                <th className="py-2 px-3 text-left">Status</th>
                <th className="py-2 px-3 text-left">Reward</th>
                <th className="py-2 px-3 text-left">Learner ID</th>
                <th className="py-2 px-3 text-left">PR Link</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((row) => {
                // If isMerged => button is red, else green
                const buttonColor = row.isMerged
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'

                return (
                  <tr
                    key={row.submissionId}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="py-2 px-3">
                      {row.projectName ?? 'Untitled Project'}
                    </td>
                    <td className="py-2 px-3">
                      {row.projectStatus}
                    </td>
                    <td className="py-2 px-3">
                      {row.prizeAmount?.toString() || '0'} EDU
                    </td>
                    <td className="py-2 px-3">
                      {row.studentAddress.slice(0, 6)}...
                      {row.studentAddress.slice(-4)}
                    </td>
                    <td className="py-2 px-3">
                      {/* "PR Review" link => color-coded by merge state */}
                      <a
                        href={row.prLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={
                          `inline-block px-3 py-1 text-white rounded ` + buttonColor
                        }
                      >
                        {row.isMerged ? 'Merged PR' : 'Open PR'}
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}