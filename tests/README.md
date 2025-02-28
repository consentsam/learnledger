# ProjectLedger API Testing Suite

This directory contains tests for the ProjectLedger API endpoints. The tests are designed to verify that the API endpoints work correctly with EIP-712 signature verification.

## Setup

Before running the tests, you need to generate test wallets:

```bash
npm run generate-wallets
```

This will create test wallet addresses and private keys in your `.env.local` file. These wallets will be used for testing the API endpoints.

## Running Tests

To run all tests:

```bash
npm test
```

To run only API tests:

```bash
npm run test:api
```

To run tests in watch mode (useful during development):

```bash
npm run test:watch
```

## Test Structure

The tests are organized by API endpoint:

- `tests/api/register.test.ts` - Tests for the `/api/register` endpoint
- `tests/api/projects.test.ts` - Tests for the `/api/projects` endpoints
- `tests/api/submissions.test.ts` - Tests for the `/api/projects/[projectId]/submissions` endpoints
- `tests/api/userProfile.test.ts` - Tests for the `/api/userProfile` endpoints

## Utilities

- `tests/utils/wallet-generator.ts` - Utility for generating test wallets
- `tests/utils/test-utils.ts` - Utilities for API testing, including functions for generating EIP-712 typed data and signing messages

## Test Wallets

The test wallets are generated with the following roles:

- `COMPANY1`, `COMPANY2` - Company wallets
- `FREELANCER1`, `FREELANCER2`, `FREELANCER3` - Freelancer wallets

These wallets are used throughout the tests to simulate different users interacting with the API.

## EIP-712 Signature Verification

The tests verify that the API endpoints correctly implement EIP-712 signature verification. This includes:

1. Generating typed data for various actions (registration, project creation, etc.)
2. Signing the typed data with the appropriate wallet
3. Sending the signature along with the request
4. Verifying that the API correctly validates the signature

The tests also include negative cases, such as:

- Using an invalid signature
- Using a signature from a different wallet
- Missing required fields

## Adding New Tests

When adding new tests, follow these guidelines:

1. Create a new test file in the appropriate directory
2. Import the necessary utilities from `tests/utils/test-utils.ts`
3. Use the existing test wallets for consistency
4. Follow the pattern of existing tests for similar endpoints
5. Include both positive and negative test cases 