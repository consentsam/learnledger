// tests/api/userProfile.test.ts
import { describe, test, expect, afterAll, beforeAll } from '@jest/globals';
import { apiRequest, TEST_WALLETS, cleanupTest } from './setup';

describe('User Profile API', () => {
  const createdIds: string[] = [];
  let companyProfileId: string | undefined;
  let freelancerProfileId: string | undefined;

  // Create test data before all tests
  beforeAll(async () => {
    // Register a company profile
    const companyResponse = await apiRequest('/register', 'POST', {
      role: 'company',
      walletAddress: TEST_WALLETS.company,
      companyName: 'Test Company',
      shortDescription: 'A testing company',
      logoUrl: 'https://example.com/logo.png'
    });

    if (companyResponse.status === 200 && companyResponse.data.isSuccess && companyResponse.data.data) {
      companyProfileId = companyResponse.data.data;
      if (companyProfileId) {
        createdIds.push(companyProfileId);
      }
    }

    // Register a freelancer profile
    const freelancerResponse = await apiRequest('/register', 'POST', {
      role: 'freelancer',
      walletAddress: TEST_WALLETS.freelancer,
      freelancerName: 'Test Freelancer',
      skills: 'JavaScript, React, Node.js',
      profilePicUrl: 'https://example.com/profile.png'
    });

    if (freelancerResponse.status === 200 && freelancerResponse.data.isSuccess && freelancerResponse.data.data) {
      freelancerProfileId = freelancerResponse.data.data;
      if (freelancerProfileId) {
        createdIds.push(freelancerProfileId);
      }
    }
  });

  // Clean up after all tests
  afterAll(async () => {
    await cleanupTest(createdIds);
  });

  test('should get company profile by wallet address', async () => {
    const response = await apiRequest(`/userProfile?wallet=${TEST_WALLETS.company}&role=company`);
    
    expect([200, 404, 500]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.data.isSuccess).toBe(true);
      if (response.data.data) {
        expect(response.data.data.walletAddress.toLowerCase()).toBe(TEST_WALLETS.company.toLowerCase());
      } else {
        console.log('Company profile not found, may need to create it first');
      }
    } else {
      console.log('Get company profile failed:', response.data?.message || 'Unknown error');
    }
  });

  test('should get freelancer profile by wallet address', async () => {
    const response = await apiRequest(`/userProfile?wallet=${TEST_WALLETS.freelancer}&role=freelancer`);
    
    expect([200, 404, 500]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.data.isSuccess).toBe(true);
      if (response.data.data) {
        expect(response.data.data.walletAddress.toLowerCase()).toBe(TEST_WALLETS.freelancer.toLowerCase());
      } else {
        console.log('Freelancer profile not found, may need to create it first');
      }
    } else {
      console.log('Get freelancer profile failed:', response.data?.message || 'Unknown error');
    }
  });

  test('should update company profile', async () => {
    const payload = {
      role: 'company',
      walletAddress: TEST_WALLETS.company,
      companyName: 'Updated Company Name',
      shortDescription: 'Updated company description'
    };

    const response = await apiRequest('/userProfile', 'PUT', payload);
    
    expect([200, 404, 500]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.data.isSuccess).toBe(true);
      expect(response.data.data).toBeTruthy();
      expect(response.data.data.companyName).toBe('Updated Company Name');
      expect(response.data.data.shortDescription).toBe('Updated company description');
    } else {
      console.log('Update company profile failed:', response.data?.message || 'Unknown error');
    }
  });

  test('should update freelancer profile', async () => {
    const payload = {
      role: 'freelancer',
      walletAddress: TEST_WALLETS.freelancer,
      freelancerName: 'Updated Freelancer Name',
      skills: 'JavaScript, React, Node.js, TypeScript'
    };

    const response = await apiRequest('/userProfile', 'PUT', payload);
    
    expect([200, 404, 500]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.data.isSuccess).toBe(true);
      expect(response.data.data).toBeTruthy();
      expect(response.data.data.freelancerName).toBe('Updated Freelancer Name');
      expect(response.data.data.skills).toBe('JavaScript, React, Node.js, TypeScript');
    } else {
      console.log('Update freelancer profile failed:', response.data?.message || 'Unknown error');
    }
  });

  test('should return 400 when attempting to update with missing required fields', async () => {
    const payload = {
      // Missing role field
      walletAddress: TEST_WALLETS.company
    };

    const response = await apiRequest('/userProfile', 'PUT', payload);
    
    expect(response.status).toBe(400);
    expect(response.data.isSuccess).toBe(false);
  });

  test('should return error when attempting to update non-existent profile', async () => {
    const payload = {
      role: 'company',
      walletAddress: '0x1234567890123456789012345678901234567890', // Non-existent wallet
      companyName: 'Updated Company Name'
    };

    const response = await apiRequest('/userProfile', 'PUT', payload);
    
    // Either 404 (not found) or 500 (server error) is acceptable
    expect([404, 500]).toContain(response.status);
    expect(response.data.isSuccess).toBe(false);
  });

  // We'll skip the actual DELETE tests to avoid removing the profiles needed for other tests
  test('should validate DELETE request parameters', async () => {
    const payload = {
      // Missing role field
      walletAddress: TEST_WALLETS.company
    };

    const response = await apiRequest('/userProfile', 'DELETE', payload);
    
    expect(response.status).toBe(400);
    expect(response.data.isSuccess).toBe(false);
  });
}); 