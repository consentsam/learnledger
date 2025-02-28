/**
 * Jest setup file
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

// Set up global Jest matchers
import '@testing-library/jest-dom';

// Mock fetch for API tests
import fetchMock from 'jest-fetch-mock';

// Enable fetch mocks
fetchMock.enableMocks();

// Configure fetch to return a successful response by default
// This ensures tests won't fail due to undefined responses
fetchMock.mockResponse(JSON.stringify({ isSuccess: true, data: [] }));

// Set a longer timeout for tests
jest.setTimeout(30000);

// Suppress React error messages during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  // Filter out React-specific warnings
  const shouldIgnore = args.some(arg => 
    typeof arg === 'string' && (
      arg.includes('React does not recognize the') ||
      arg.includes('Warning: validateDOMNesting') ||
      arg.includes('Warning: useLayoutEffect does nothing on the server') ||
      arg.includes('Warning: Failed prop type') ||
      arg.includes('fetch is not implemented') ||
      arg.includes('invalid json response') ||
      arg.includes('FetchError')
    )
  );
  
  if (!shouldIgnore) {
    originalConsoleError(...args);
  }
};

// Global test hooks
beforeAll(() => {
  console.log('🧪 Starting API tests...');
});

afterAll(() => {
  console.log('✅ API tests completed');
}); 