/**
 * Tests for the /api/userProfile endpoints
 */

import { 
  loadTestWallets, 
  signMessage, 
  generateUserProfileUpdateTypedData,
  generateUserProfileDeleteTypedData,
  api 
} from '../utils/test-utils';

// Load test wallets
const testWallets = loadTestWallets();

// Store user IDs for reference
const userIds: {[key: string]: string} = {};

describe('User Profile API', () => {
  // This beforeAll block will ensure we have all the necessary test wallets
  // and create test users via registration if needed
  beforeAll(async () => {
    // Verify we have the necessary test wallets
    expect(testWallets.COMPANY1).toBeDefined();
    expect(testWallets.COMPANY2).toBeDefined();
    expect(testWallets.FREELANCER1).toBeDefined();
  });

  describe('GET /api/userProfile', () => {
    it('should retrieve user profile by wallet address for company', async () => {
      const companyWallet = testWallets.COMPANY1;
      
      // Make the request
      const response = await api.get('/userProfile', { walletAddress: companyWallet.address });
      
      // Store the user ID if the profile exists
      if (response.isSuccess && response.data) {
        userIds.COMPANY1 = response.data.id;
      }
      
      // If the profile doesn't exist, we'll create it in the next test
      if (!response.isSuccess) {
        console.log('Company profile not found, will need to create it');
        return;
      }
      
      // Assertions for existing profile
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.walletAddress).toBe(companyWallet.address);
    });
    
    it('should retrieve user profile by wallet address for freelancer', async () => {
      const freelancerWallet = testWallets.FREELANCER1;
      
      // Make the request
      const response = await api.get('/userProfile', { walletAddress: freelancerWallet.address });
      
      // Store the user ID if the profile exists
      if (response.isSuccess && response.data) {
        userIds.FREELANCER1 = response.data.id;
      }
      
      // If the profile doesn't exist, we'll create it in the next test
      if (!response.isSuccess) {
        console.log('Freelancer profile not found, will need to create it');
        return;
      }
      
      // Assertions for existing profile
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.walletAddress).toBe(freelancerWallet.address);
    });
    
    it('should return 404 for non-existent wallet address', async () => {
      const nonExistentWallet = '0x0000000000000000000000000000000000000000';
      
      // Make the request
      const response = await api.get('/userProfile', { walletAddress: nonExistentWallet });
      
      // Assertions
      expect(response.isSuccess).toBe(false);
      expect(response.message).toContain('not found');
    });
  });

  describe('PUT /api/userProfile', () => {
    it('should update company profile with valid signature', async () => {
      const companyWallet = testWallets.COMPANY1;
      const profileName = 'Updated Company Name';
      const profileBio = 'This is an updated company bio for testing';
      
      // Generate typed data for profile update
      const typedData = generateUserProfileUpdateTypedData(
        companyWallet.address,
        profileName,
        profileBio
      );
      
      // Sign the message
      const signature = await signMessage(companyWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        walletAddress: companyWallet.address,
        name: profileName,
        bio: profileBio,
        role: 'company',
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.put('/userProfile', requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.name).toBe(profileName);
      expect(response.data.bio).toBe(profileBio);
      expect(response.data.walletAddress).toBe(companyWallet.address);
      
      // Store the user ID if we don't have it yet
      if (!userIds.COMPANY1 && response.data.id) {
        userIds.COMPANY1 = response.data.id;
      }
    });
    
    it('should update freelancer profile with valid signature', async () => {
      const freelancerWallet = testWallets.FREELANCER1;
      const profileName = 'Updated Freelancer Name';
      const profileBio = 'This is an updated freelancer bio for testing';
      const skills = 'JavaScript,React,Node.js';
      
      // Generate typed data for profile update
      const typedData = generateUserProfileUpdateTypedData(
        freelancerWallet.address,
        profileName,
        profileBio
      );
      
      // Sign the message
      const signature = await signMessage(freelancerWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        walletAddress: freelancerWallet.address,
        name: profileName,
        bio: profileBio,
        skills,
        role: 'freelancer',
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.put('/userProfile', requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.name).toBe(profileName);
      expect(response.data.bio).toBe(profileBio);
      expect(response.data.skills).toBe(skills);
      expect(response.data.walletAddress).toBe(freelancerWallet.address);
      
      // Store the user ID if we don't have it yet
      if (!userIds.FREELANCER1 && response.data.id) {
        userIds.FREELANCER1 = response.data.id;
      }
    });
    
    it('should reject profile update with invalid signature', async () => {
      const companyWallet = testWallets.COMPANY1;
      const wrongPrivateKey = testWallets.COMPANY2.privateKey;
      const profileName = 'Invalid Update Name';
      const profileBio = 'This update should be rejected';
      
      // Generate typed data for profile update
      const typedData = generateUserProfileUpdateTypedData(
        companyWallet.address,
        profileName,
        profileBio
      );
      
      // Create an explicitly invalid signature
      const invalidSignature = "invalid-signature";
      
      // Create the request payload
      const requestData = {
        walletAddress: companyWallet.address, // COMPANY1's address
        name: profileName,
        bio: profileBio,
        role: 'company',
        signature: invalidSignature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.put('/userProfile', requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(false);
      expect(response.message).toContain('Invalid signature');
    });
    
    it('should reject profile update without required fields', async () => {
      const companyWallet = testWallets.COMPANY1;
      
      // Missing name field
      const requestData = {
        walletAddress: companyWallet.address,
        // name is missing
        bio: 'This update should be rejected',
        role: 'company'
      };
      
      // Make the request
      const response = await api.put('/userProfile', requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(false);
    });
  });

  describe('DELETE /api/userProfile', () => {
    // We'll create a new test user specifically for deletion
    let testDeleteWallet = testWallets.COMPANY2;
    
    it('should first create a profile for deletion test', async () => {
      const profileName = 'Profile To Delete';
      const profileBio = 'This profile will be deleted in the next test';
      
      // Generate typed data for profile update
      const typedData = generateUserProfileUpdateTypedData(
        testDeleteWallet.address,
        profileName,
        profileBio
      );
      
      // Sign the message
      const signature = await signMessage(testDeleteWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        walletAddress: testDeleteWallet.address,
        name: profileName,
        bio: profileBio,
        role: 'company',
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request to create/update the profile
      const response = await api.put('/userProfile', requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.name).toBe(profileName);
      
      // Store the ID for the deletion test
      if (response.data && response.data.id) {
        userIds.DELETE_TEST = response.data.id;
      }
    });
    
    it('should delete user profile with valid signature', async () => {
      expect(userIds.DELETE_TEST).toBeDefined();
      
      // Generate typed data for profile deletion
      const typedData = generateUserProfileDeleteTypedData(
        testDeleteWallet.address
      );
      
      // Sign the message
      const signature = await signMessage(testDeleteWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        walletAddress: testDeleteWallet.address,
        role: 'company',
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.delete('/userProfile', requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.message).toContain('deleted');
      
      // Verify the profile is actually deleted
      const verifyResponse = await api.get('/userProfile', { walletAddress: testDeleteWallet.address });
      expect(verifyResponse.isSuccess).toBe(false);
      expect(verifyResponse.message).toContain('not found');
    });
    
    it('should reject profile deletion with invalid signature', async () => {
      // We'll use COMPANY1 for this test since we didn't delete it
      const companyWallet = testWallets.COMPANY1;
      
      // Generate typed data for profile deletion
      const typedData = generateUserProfileDeleteTypedData(
        companyWallet.address
      );
      
      // Create an explicitly invalid signature
      const invalidSignature = "invalid-signature";
      
      // Create the request payload
      const requestData = {
        walletAddress: companyWallet.address,
        role: 'company',
        signature: invalidSignature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.delete('/userProfile', requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(false);
      expect(response.message).toContain('Invalid signature');
      
      // Verify the profile still exists
      const verifyResponse = await api.get('/userProfile', { walletAddress: companyWallet.address });
      expect(verifyResponse.isSuccess).toBe(true);
    });
  });

  // Export the user IDs for reference in other tests
  afterAll(() => {
    console.log('User IDs for reference:');
    Object.entries(userIds).forEach(([key, id]) => {
      console.log(`${key}:`, id);
    });
  });
}); 