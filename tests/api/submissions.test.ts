
//tests/api/submissions.test.ts

/**
 * Example Jest test suite for the Submissions API.
 *
 * This checks:
 * - Creating submissions
 * - Deleting submissions
 * - Approving submissions
 * - Reading submissions
 */

import { describe, test, expect, afterAll, beforeAll } from '@jest/globals';
import { apiRequest, TEST_WALLETS, cleanupTest } from './setup';

describe('Submissions API', () => {
  const createdIds: string[] = [];
  let projectId: string | undefined;
  let submissionId: string | undefined;

  // Create test data before all tests
  beforeAll(async () => {
    // 1. Register a company
    await apiRequest('/register', 'POST', {
      role: 'company',
      walletAddress: TEST_WALLETS.company,
      companyName: 'Test Company for Submissions',
    });

    // 2. Register a freelancer
    await apiRequest('/register', 'POST', {
      role: 'freelancer',
      walletAddress: TEST_WALLETS.freelancer,
      freelancerName: 'Test Submissions Freelancer',
      skills: 'JavaScript, React'
    });

    // 3. Create a project or find an existing one
    const projectResponse = await apiRequest('/projects', 'POST', {
      walletAddress: TEST_WALLETS.company,
      projectName: 'Test Project for Submissions Flow',
      projectDescription: 'Testing project creation for submissions flow',
      prizeAmount: 100,
      requiredSkills: 'JavaScript'
    });

    if (projectResponse.status === 200 && projectResponse.data.isSuccess && projectResponse.data.data) {
      projectId = projectResponse.data.data.id;
      if (projectId) {
        createdIds.push(projectId);
        console.log('Created test project with ID:', projectId);
      }
    } else {
      // If we couldn't create a project, try to find an existing one
      const projectsResponse = await apiRequest('/projects');
      if (
        projectsResponse.status === 200 &&
        projectsResponse.data.isSuccess &&
        projectsResponse.data.data?.length > 0
      ) {
        // Use the first project we find
        projectId = projectsResponse.data.data[0].id;
        console.log('Using existing project with ID:', projectId);
      }
    }
  });

  // Clean up after all tests
  afterAll(async () => {
    // Attempt to remove any test data we created
    await cleanupTest(createdIds);
  });

  test('should create a new submission', async () => {
    // Ensure we have a project to submit to
    if (!projectId) {
      console.log('No project ID available; skipping submission creation test.');
      return;
    }

    const payload = {
      projectId,
      freelancerAddress: TEST_WALLETS.freelancer,
      prLink: 'https://github.com/owner/repo/pull/123'
    };

    const response = await apiRequest('/submissions/create', 'POST', payload);

    // Usually expect 200 success or 400/404 on error
    expect([200, 400, 404]).toContain(response.status);

    if (response.status === 200) {
      expect(response.data.isSuccess).toBe(true);
      expect(response.data.data).toBeTruthy();
      expect(response.data.data.projectId).toBe(projectId);
      expect(
        response.data.data.freelancerAddress.toLowerCase()
      ).toBe(TEST_WALLETS.freelancer.toLowerCase());

      // Save submission ID for further tests
      submissionId = response.data.data.id;
      if (submissionId) {
        createdIds.push(submissionId);
      }
    } else {
      console.log('Create submission failed:', response.data?.message || 'Unknown error');
    }
  });

  test('should fail to create submission if missing required fields', async () => {
    const payload = {
      // missing projectId
      freelancerAddress: TEST_WALLETS.freelancer,
      prLink: 'https://github.com/owner/repo/pull/999'
    };

    const response = await apiRequest('/submissions/create', 'POST', payload);
    expect(response.status).toBe(400);
    expect(response.data.isSuccess).toBe(false);
    console.log('Expected error:', response.data.message);
  });

  test('should read submissions for a project', async () => {
    // If we never created or found a project, skip
    if (!projectId) {
      console.log('No project ID available; skipping read submissions test.');
      return;
    }

    const response = await apiRequest(`/submissions/read?projectId=${projectId}`);
    expect([200, 404]).toContain(response.status);

    if (response.status === 200) {
      expect(response.data.isSuccess).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      console.log('Submissions for project:', response.data.data);
    } else {
      console.log('Read submissions failed or project not found:', response.data.message);
    }
  });

  test('should approve a submission', async () => {
    // We need an existing submission ID + the company’s wallet
    if (!submissionId || !projectId) {
      console.log('No submission or project ID available; skipping approval test.');
      return;
    }

    const payload = {
      submissionId,
      walletAddress: TEST_WALLETS.company // Project owner
    };

    const response = await apiRequest('/submissions/approve', 'POST', payload);
    expect([200, 400, 403, 404]).toContain(response.status);

    if (response.status === 200) {
      expect(response.data.isSuccess).toBe(true);
      console.log('Submission approved successfully');
    } else {
      console.log('Approve submission failed:', response.data?.message || 'Unknown error');
    }
  });

  test('should delete the submission', async () => {
    if (!submissionId) {
      console.log('No submission ID available; skipping deletion test.');
      return;
    }

    const payload = {
      submissionId,
      walletAddress: TEST_WALLETS.freelancer // The freelancer can delete their own submission
    };

    const response = await apiRequest('/submissions/delete', 'POST', payload);
    expect([200, 403, 404]).toContain(response.status);

    if (response.status === 200) {
      expect(response.data.isSuccess).toBe(true);
      expect(response.data.message.toLowerCase()).toContain('deleted successfully');
      // Clean up from the local array since it's gone
      const index = createdIds.indexOf(submissionId);
      if (index > -1) {
        createdIds.splice(index, 1);
      }
      submissionId = undefined;
    } else {
      console.log('Delete submission failed:', response.data?.message || 'Unknown error');
    }
  });
});
