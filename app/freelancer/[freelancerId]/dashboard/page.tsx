/* app/freelancer/[freelancerId]/dashboard/page.tsx */
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { db } from '@/db/db'
import { freelancerTable } from '@/db/schema/freelancer-schema'

interface FreelancerDashboardProps {
  params: { freelancerId: string }
}

export default async function FreelancerDashboardPage({ params }: FreelancerDashboardProps) {
  const { freelancerId } = params

  // fetch the freelancer row
  const [freelancer] = await db
    .select()
    .from(freelancerTable)
    .where(eq(freelancerTable.id, freelancerId))
    .limit(1)
  if (!freelancer) {
    notFound()
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        Welcome, {freelancer.freelancerName}
      </h1>
      <p className="text-gray-700">
        Your Wallet: {freelancer.walletAddress}
      </p>

      <div className="mt-6 space-x-4">
        <Link
          href={`/freelancer/${freelancerId}/projects`}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Browse All Projects
        </Link>

        <Link
          href={`/freelancer/${freelancerId}/submissions`}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          View My Submissions
        </Link>
      </div>
    </div>
  )
}