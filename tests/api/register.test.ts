/**
 * Tests for the /api/register endpoint
 */

import { loadTestWallets, signMessage, generateUserRegistrationTypedData, api, MockApiResponse } from '../utils/test-utils';

// Load test wallets
const testWallets = loadTestWallets();

// Store the company and freelancer test IDs
let company1Id: string | undefined;
let company2Id: string | undefined;
let freelancer1Id: string | undefined;
let freelancer2Id: string | undefined;
let freelancer3Id: string | undefined;

describe('User Registration API', () => {
  // This beforeAll block will ensure we have all the necessary test wallets
  beforeAll(() => {
    // Verify we have the necessary test wallets
    expect(testWallets.COMPANY1).toBeDefined();
    expect(testWallets.COMPANY2).toBeDefined();
    expect(testWallets.FREELANCER1).toBeDefined();
    expect(testWallets.FREELANCER2).toBeDefined();
    expect(testWallets.FREELANCER3).toBeDefined();
  });

  describe('POST /api/register', () => {
    it('should register a company with valid signature', async () => {
      const companyWallet = testWallets.COMPANY1;
      const companyName = 'Test Company 1';
      
      // Generate the typed data for registration
      const typedData = generateUserRegistrationTypedData(
        companyWallet.address, 
        companyName,
        'company'
      );
      
      // Sign the message
      const signature = await signMessage(companyWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        role: 'company',
        walletAddress: companyWallet.address,
        name: companyName,
        bio: 'A test company for API testing',
        website: 'https://example.com',
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.post('/register', requestData);
      
      // Store the company ID for later tests
      if (response.isSuccess && response.data) {
        company1Id = response.data.id;
      }
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
    });
    
    it('should register another company with valid signature', async () => {
      const companyWallet = testWallets.COMPANY2;
      const companyName = 'Test Company 2';
      
      // Generate the typed data for registration
      const typedData = generateUserRegistrationTypedData(
        companyWallet.address, 
        companyName,
        'company'
      );
      
      // Sign the message
      const signature = await signMessage(companyWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        role: 'company',
        walletAddress: companyWallet.address,
        name: companyName,
        bio: 'Another test company for API testing',
        website: 'https://example.com/company2',
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.post('/register', requestData);
      
      // Store the company ID for later tests
      if (response.isSuccess && response.data) {
        company2Id = response.data.id;
      }
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
    });
    
    it('should register a freelancer with valid signature', async () => {
      const freelancerWallet = testWallets.FREELANCER1;
      const freelancerName = 'Test Freelancer 1';
      
      // Generate the typed data for registration
      const typedData = generateUserRegistrationTypedData(
        freelancerWallet.address, 
        freelancerName,
        'freelancer'
      );
      
      // Sign the message
      const signature = await signMessage(freelancerWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        role: 'freelancer',
        walletAddress: freelancerWallet.address,
        name: freelancerName,
        skills: ['JavaScript', 'React', 'Node.js'],
        bio: 'A test freelancer',
        website: 'https://example.com/profile1',
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.post('/register', requestData);
      
      // Store the freelancer ID for later tests
      if (response.isSuccess && response.data) {
        freelancer1Id = response.data.id;
      }
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
    });
    
    it('should register another freelancer with valid signature', async () => {
      const freelancerWallet = testWallets.FREELANCER2;
      const freelancerName = 'Test Freelancer 2';
      
      // Generate the typed data for registration
      const typedData = generateUserRegistrationTypedData(
        freelancerWallet.address, 
        freelancerName,
        'freelancer'
      );
      
      // Sign the message
      const signature = await signMessage(freelancerWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        role: 'freelancer',
        walletAddress: freelancerWallet.address,
        name: freelancerName,
        skills: ['JavaScript', 'Python', 'Go'],
        bio: 'Another test freelancer',
        website: 'https://example.com/profile2',
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.post('/register', requestData);
      
      // Store the freelancer ID for later tests
      if (response.isSuccess && response.data) {
        freelancer2Id = response.data.id;
      }
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
    });
    
    it('should register a third freelancer with valid signature', async () => {
      const freelancerWallet = testWallets.FREELANCER3;
      const freelancerName = 'Test Freelancer 3';
      
      // Generate the typed data for registration
      const typedData = generateUserRegistrationTypedData(
        freelancerWallet.address, 
        freelancerName,
        'freelancer'
      );
      
      // Sign the message
      const signature = await signMessage(freelancerWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        role: 'freelancer',
        walletAddress: freelancerWallet.address,
        name: freelancerName,
        skills: ['Solidity', 'Smart Contracts', 'Security Auditing'],
        bio: 'A blockchain expert',
        website: 'https://example.com/profile3',
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.post('/register', requestData);
      
      // Store the freelancer ID for later tests
      if (response.isSuccess && response.data) {
        freelancer3Id = response.data.id;
      }
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
    });
    
    it('should reject registration with invalid signature', async () => {
      // Using Company2 wallet but with a different name to avoid "already registered" error
      const companyWallet = testWallets.COMPANY2;
      const companyName = 'Company With Invalid Signature';
      
      // Generate the typed data for registration
      const typedData = generateUserRegistrationTypedData(
        companyWallet.address, 
        companyName,
        'company'
      );
      
      // Create an explicitly invalid signature
      const invalidSignature = "invalid-signature";
      
      // Create the request payload
      const requestData = {
        role: 'company',
        walletAddress: companyWallet.address,
        name: companyName,
        bio: 'This should be rejected',
        signature: invalidSignature, // Explicitly invalid signature
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.post('/register', requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(false);
      expect(response.message).toContain('Invalid signature');
    });
  });

  // Export the user IDs for use in other tests
  afterAll(() => {
    // Write the IDs to a file that can be imported by other tests
    console.log('User IDs for other tests:');
    console.log('Company 1 ID:', company1Id);
    console.log('Company 2 ID:', company2Id);
    console.log('Freelancer 1 ID:', freelancer1Id);
    console.log('Freelancer 2 ID:', freelancer2Id);
    console.log('Freelancer 3 ID:', freelancer3Id);
  });
}); 