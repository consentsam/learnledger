// app/company/[companyId]/dashboard/page.tsx
import { eq } from 'drizzle-orm'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { db } from '@/db/db'
import { companyTable } from '@/db/schema/company-schema'
import { projectsTable } from '@/db/schema/projects-schema'

interface CompanyDashboardProps {
  params: { companyId: string }
}

export default async function CompanyDashboardPage({ params }: CompanyDashboardProps) {
  const companyId = params.companyId

  // 1) Find the company row
  const [company] = await db
    .select()
    .from(companyTable)
    .where(eq(companyTable.id, companyId))
    .limit(1)

  if (!company) {
    notFound()
  }

  // 2) We can also fetch that company's open projects
  const allProjects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.projectOwner, company.walletAddress))
  const activeProjects = allProjects.filter((p) => p.projectStatus === 'open')
  const numActive = activeProjects.length

  // 3) "pull requests to review" can be an approximate or real count
  //    We'll just keep it as 7 placeholder for demo
  const numPullRequests = 7

  return (
    <div className="p-4 space-y-4">
      {/* Example layout */}
      <h2 className="text-2xl font-bold">Hello {company.companyName}</h2>
      <div>
        <p className="text-sm text-gray-500">
          Company ID: {companyId} (Wallet: {company.walletAddress})
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-8 border p-4 rounded">
        <div>
          <div className="text-2xl font-bold">{numActive}</div>
          <div>Active Projects</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{numPullRequests}</div>
          <div>Pull Requests to Review</div>
        </div>

        {/* "View All Projects" button => link to /company/[companyId]/projects */}
        <Link
          href={`/company/${companyId}/projects?status=0`}
          className="border px-3 py-1 rounded ml-4"
        >
          View All Projects
        </Link>

        {/* ===== NEW: Button to see all submissions ===== */}
        <Link
          href={`/company/${companyId}/submissions`}
          className="border px-3 py-1 rounded ml-4"
        >
          View All Submissions
        </Link>
      </div>

      {/* "Create Project" button => link to some new form route if you want */}
      <Link
        href={`/company/${companyId}/projects/new`}
        className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        + Create a New Project
      </Link>

      {/* Possibly a chart placeholder, etc. */}
      <div className="border p-4 mt-4 rounded">
        <h3 className="font-semibold">Project Activity Chart</h3>
        <Image
          src="https://docs.github.com/assets/cb-35216/mw-1440/images/help/profile/contributions-graph.webp"
          alt="Project Activity Chart"
          width={600}
          height={300}
          className="w-full"
        />
      </div>
    </div>
  )
}