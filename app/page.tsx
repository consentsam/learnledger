import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">ProjectLedger API</h1>
        
        <p className="text-lg mb-8">
          Welcome to the ProjectLedger API documentation and testing site. This platform provides
          all the tools you need to integrate with our blockchain-based project management system.
        </p>
        
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">API Documentation</h2>
            <p className="mb-4">
              Explore our comprehensive API documentation to understand all available endpoints,
              request and response formats, and authentication requirements.
            </p>
            <Link 
              href="/api-docs"
              className="inline-block bg-blue-600 text-white font-medium px-4 py-2 rounded hover:bg-blue-700"
            >
              View API Docs
            </Link>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Try the API</h2>
            <p className="mb-4">
              Our interactive documentation allows you to test API endpoints directly from your browser.
              Connect your Metamask wallet to authenticate and test the full functionality.
            </p>
            <Link 
              href="/api-docs"
              className="inline-block bg-green-600 text-white font-medium px-4 py-2 rounded hover:bg-green-700"
            >
              Test Endpoints
            </Link>
          </div>
        </div>
        
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h2 className="text-xl font-bold mb-2">For Developers</h2>
          <p className="mb-4">
            To integrate with our API:
          </p>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>Browse the API documentation to understand the available endpoints</li>
            <li>Use the "Try it out" feature to test endpoints and see example requests/responses</li>
            <li>Implement the API calls in your application using your preferred HTTP client</li>
            <li>Use Metamask wallet addresses for authentication</li>
          </ol>
          <p>
            The API specification is also available as a downloadable OpenAPI 3.0 JSON file at{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">/api/api-spec</code>
          </p>
        </div>
      </div>
    </div>
  )
}
