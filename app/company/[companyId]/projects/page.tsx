import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { db } from '@/db/db'
import { companyTable } from '@/db/schema/company-schema'
import { projectsTable } from '@/db/schema/projects-schema'


interface CompanyProjectsPageProps {
  params: { companyId: string }
  searchParams: { status?: string }
}

export enum ProjectFilterEnum {
  ALL = 0,
  OPEN = 1,
  CLOSED = 2,
}

export default async function CompanyProjectsPage({
  params,
  searchParams,
}: CompanyProjectsPageProps) {
  const companyId = params.companyId
  const filterString = searchParams.status ?? ''
  const filterValue = parseInt(filterString, 10)

  // 1) Find the company
  const [company] = await db
    .select()
    .from(companyTable)
    .where(eq(companyTable.id, companyId))
    .limit(1)
  if (!company) {
    notFound()
  }

  // 2) Fetch all projects for this company’s wallet
  let allProjects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.projectOwner, company.walletAddress))

  // 3) Filter if needed
  if (filterValue === ProjectFilterEnum.OPEN) {
    allProjects = allProjects.filter((p) => p.projectStatus === 'open')
  } else if (filterValue === ProjectFilterEnum.CLOSED) {
    allProjects = allProjects.filter((p) => p.projectStatus === 'closed')
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">
        All Projects for {company.companyName}
      </h2>

      {/* Filter Links */}
      <div className="my-3 space-x-3">
        <Link href={`/company/${companyId}/projects?status=0`}>All</Link>
        <Link href={`/company/${companyId}/projects?status=1`}>Open</Link>
        <Link href={`/company/${companyId}/projects?status=2`}>Closed</Link>
      </div>

      {allProjects.length === 0 ? (
        <p>No projects found.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {allProjects.map((proj) => (
            <li key={proj.id} className="border p-2 rounded">
              <div className="font-semibold">{proj.projectName}</div>
              <div className="text-sm text-gray-600">
                Status: {proj.projectStatus}
              </div>
              {proj.projectDescription && (
                <div className="text-sm text-gray-700 mt-1">
                  {proj.projectDescription}
                </div>
              )}

              {/* "View Details" link */}
              <div className="mt-2">
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
    </div>
  )
}