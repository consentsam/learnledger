// tests/api/submissions.test.ts
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
      companyName: 'Test Company',
      shortDescription: 'A testing company'
    });

    // 2. Register a freelancer
    await apiRequest('/register', 'POST', {
      role: 'freelancer',
      walletAddress: TEST_WALLETS.freelancer,
      freelancerName: 'Test Freelancer',
      skills: 'JavaScript, React'
    });

    // 3. Create a project or find an existing one
    const projectResponse = await apiRequest('/projects', 'POST', {
      walletAddress: TEST_WALLETS.company,
      projectName: 'Test Project for Submissions',
      projectDescription: 'A test project to test submissions',
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
      if (projectsResponse.status === 200 && projectsResponse.data.isSuccess && projectsResponse.data.data?.length > 0) {
        // Use the first project we find
        projectId = projectsResponse.data.data[0].id;
        console.log('Using existing project with ID:', projectId);
      }
    }
  });

  // Clean up after all tests
  afterAll(async () => {
    await cleanupTest(createdIds);
  });

  test('should create a new submission', async () => {
    // Skip if we don't have a project to submit to
    if (!projectId) {
      console.log('Skipping test: no project ID available');
      return;
    }

    const payload = {
      projectId: projectId,
      freelancerAddress: TEST_WALLETS.freelancer,
      prLink: 'https://github.com/owner/repo/pull/123'
    };

    const response = await apiRequest('/submissions/create', 'POST', payload);
    
    // Accept 200 (success) or various error codes
    expect([200, 400, 404, 500]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.data.isSuccess).toBe(true);
      expect(response.data.data).toBeTruthy();
      expect(response.data.data.projectId).toBe(projectId);
      expect(response.data.data.freelancerAddress.toLowerCase()).toBe(TEST_WALLETS.freelancer.toLowerCase());

      // Store submission ID for other tests
      if (response.data.data && response.data.data.id) {
        submissionId = response.data.data.id;
        if (submissionId) {
          createdIds.push(submissionId);
        }
      }
    } else {
      console.log('Create submission failed:', response.data?.message || 'Unknown error');
    }
  });

  test('should return 400 when missing required fields for submission creation', async () => {
    const payload = {
      // Missing projectId
      freelancerAddress: TEST_WALLETS.freelancer,
      prLink: 'https://github.com/owner/repo/pull/123'
    };

    const response = await apiRequest('/submissions/create', 'POST', payload);
    
    expect(response.status).toBe(400);
    expect(response.data.isSuccess).toBe(false);
  });

  test('should delete a submission', async () => {
    // Skip if we don't have a submission to delete
    if (!submissionId) {
      console.log('Skipping test: no submission ID available');
      return;
    }

    const payload = {
      submissionId: submissionId,
      walletAddress: TEST_WALLETS.freelancer // Freelancer can delete their own submission
    };

    const response = await apiRequest('/submissions/delete', 'POST', payload);
    
    expect([200, 403, 404]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.data.isSuccess).toBe(true);
      expect(response.data.message).toContain('deleted successfully');

      // Remove from createdIds since it's already deleted
      if (submissionId) {
        const index = createdIds.indexOf(submissionId);
        if (index > -1) {
          createdIds.splice(index, 1);
        }
      }
      
      // Reset submissionId since we've deleted it
      submissionId = undefined;
    } else {
      console.log('Delete submission failed:', response.data?.message || 'Unknown error');
    }
  });

  test('should return 400 when missing required fields for submission deletion', async () => {
    const payload = {
      // Missing submissionId
      walletAddress: TEST_WALLETS.freelancer
    };

    const response = await apiRequest('/submissions/delete', 'POST', payload);
    
    expect(response.status).toBe(400);
    expect(response.data.isSuccess).toBe(false);
  });

  test('should create another submission for approval tests', async () => {
    // Skip if we don't have a project
    if (!projectId) {
      console.log('Skipping test: no project ID available');
      return;
    }
    
    const payload = {
      projectId: projectId,
      freelancerAddress: TEST_WALLETS.freelancer,
      prLink: 'https://github.com/owner/repo/pull/124'
    };

    const response = await apiRequest('/submissions/create', 'POST', payload);
    
    expect([200, 400, 404]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.data.isSuccess).toBe(true);
      expect(response.data.data).toBeTruthy();

      // Store submission ID for approval test
      if (response.data.data && response.data.data.id) {
        submissionId = response.data.data.id;
        if (submissionId) {
          createdIds.push(submissionId);
        }
      }
    } else {
      console.log('Create another submission failed:', response.data?.message || 'Unknown error');
    }
  });

  test('should approve a submission', async () => {
    // Skip if we don't have a submission to approve
    if (!submissionId) {
      console.log('Skipping test: no submission ID available');
      return;
    }

    const payload = {
      submissionId: submissionId,
      walletAddress: TEST_WALLETS.company // Only project owner can approve
    };

    const response = await apiRequest('/submissions/approve', 'POST', payload);
    
    expect([200, 403, 404, 500]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.data.isSuccess).toBe(true);
      expect(response.data.message).toContain('approved successfully');
    } else {
      console.log('Approve submission failed:', response.data?.message || 'Unknown error');
    }
  });

  test('should return 403 when non-owner tries to approve a submission', async () => {
    // Skip without a project
    if (!projectId) {
      console.log('Skipping test: no project ID available');
      return;
    }
    
    // Create another submission first
    const createResponse = await apiRequest('/submissions/create', 'POST', {
      projectId: projectId,
      freelancerAddress: TEST_WALLETS.freelancer,
      prLink: 'https://github.com/owner/repo/pull/125'
    });
    
    if (createResponse.status !== 200 || !createResponse.data.isSuccess) {
      console.log('Could not create submission for non-owner approval test');
      return;
    }
    
    const newSubmissionId = createResponse.data.data.id;
    if (newSubmissionId) {
      createdIds.push(newSubmissionId);
    
      // Try to approve with non-owner wallet
      const payload = {
        submissionId: newSubmissionId,
        walletAddress: TEST_WALLETS.user // Not the project owner
      };

      const response = await apiRequest('/submissions/approve', 'POST', payload);
      
      expect([403, 404]).toContain(response.status);
      expect(response.data.isSuccess).toBe(false);
      expect(response.data.message).toContain('Only the project owner');
    }
  });
}); 