import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ProjectLedger API Documentation',
  description: 'API documentation for the ProjectLedger platform',
};

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white min-h-screen">
      {children}
    </section>
  );
} 