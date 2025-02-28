/**
 * Tests for the submission management API endpoints
 */

import { 
  loadTestWallets, 
  signMessage, 
  generateSubmissionCreateTypedData,
  generateSubmissionUpdateTypedData,
  generateSubmissionDeleteTypedData,
  generateProjectCreationTypedData,
  generateProjectDeleteTypedData,
  api,
  MockApiResponse,
  SubmissionData,
  ProjectData
} from '../utils/test-utils';

// Load test wallets
const testWallets = loadTestWallets();

// Company wallet for test projects
const companyWallet = testWallets.COMPANY1;

// Freelancer wallet for submissions
const freelancerWallet = testWallets.FREELANCER1;

// Store created project and submission IDs for later tests
let testProject: ProjectData | null = null;
let testSubmission: SubmissionData | null = null;

describe('Submission Management API', () => {
  // This beforeAll block will ensure we have all the necessary test wallets and create a test project
  beforeAll(async () => {
    // Verify we have the necessary test wallets
    expect(companyWallet).toBeDefined();
    expect(companyWallet.privateKey).toBeDefined();
    expect(freelancerWallet).toBeDefined();
    expect(freelancerWallet.privateKey).toBeDefined();
    
    // Create a test project for submissions
    const projectName = 'Test Project for Submissions';
    const projectDescription = 'A test project for submission API testing';
    const prizeAmount = 1000;
    
    // Generate the typed data for project creation
    const typedData = generateProjectCreationTypedData(
      companyWallet.address,
      projectName,
      projectDescription,
      prizeAmount
    );
    
    // Sign the message
    const signature = await signMessage(companyWallet.privateKey, typedData);
    
    // Create the request payload
    const requestData = {
      walletAddress: companyWallet.address,
      projectName,
      projectDescription,
      prizeAmount,
      requiredSkills: ['JavaScript', 'React', 'Node.js'],
      projectLink: 'https://example.com/project-for-submissions',
      signature,
      nonce: typedData.nonce
    };
    
    // Make the request
    const response = await api.post('/projects', requestData);
    
    // Store the project for later tests
    if (response.isSuccess && response.data) {
      testProject = response.data as ProjectData;
    }
    
    // Make sure we have a test project
    expect(testProject).not.toBeNull();
  });
  
  describe('POST /submissions', () => {
    it('should create a submission with valid signature', async () => {
      // Make sure we have a test project
      expect(testProject).not.toBeNull();
      
      // Generate the typed data for submission creation
      const typedData = generateSubmissionCreateTypedData(
        testProject!.id,
        freelancerWallet.address
      );
      
      // Sign the message
      const signature = await signMessage(freelancerWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        walletAddress: freelancerWallet.address,
        projectId: testProject!.id,
        submissionContent: 'This is my submission for the test project',
        linkToWork: 'https://example.com/my-submission',
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.post('/submissions', requestData);
      
      // Store the submission for later tests
      if (response.isSuccess && response.data) {
        testSubmission = response.data as SubmissionData;
      }
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      if (response.data) {
        const submission = response.data as SubmissionData;
        expect(submission.projectId).toBe(testProject!.id);
        expect(submission.freelancerAddress).toBe(freelancerWallet.address);
        expect(submission.submissionContent).toBe('This is my submission for the test project');
      }
    });
    
    it('should reject submission creation with invalid signature', async () => {
      // Make sure we have a test project
      expect(testProject).not.toBeNull();
      
      // Generate the typed data for submission creation
      const typedData = generateSubmissionCreateTypedData(
        testProject!.id,
        freelancerWallet.address
      );
      
      // Create an invalid signature
      const invalidSignature = "invalid-signature";
      
      // Create the request payload
      const requestData = {
        walletAddress: freelancerWallet.address,
        projectId: testProject!.id,
        submissionContent: 'This submission should be rejected',
        signature: invalidSignature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.post('/submissions', requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(false);
      expect(response.message).toContain('Invalid signature');
    });
    
    it('should reject submission for non-existent project', async () => {
      // Generate the typed data for submission creation
      const typedData = generateSubmissionCreateTypedData(
        'non-existent-id',
        freelancerWallet.address
      );
      
      // Sign the message
      const signature = await signMessage(freelancerWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        walletAddress: freelancerWallet.address,
        projectId: 'non-existent-id',
        submissionContent: 'This submission should be rejected',
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.post('/submissions', requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(false);
      expect(response.message).toContain('Project not found');
    });
  });
  
  describe('GET /submissions', () => {
    it('should retrieve submissions for a project', async () => {
      // Make sure we have a test project
      expect(testProject).not.toBeNull();
      
      // Make the request
      const response = await api.get('/submissions', { projectId: testProject!.id });
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      if (response.data) {
        expect(Array.isArray(response.data)).toBe(true);
        
        // We should have at least one submission
        expect(response.data.length).toBeGreaterThanOrEqual(1);
        
        // All submissions should be for our test project
        response.data.forEach((submission: SubmissionData) => {
          expect(submission.projectId).toBe(testProject!.id);
        });
      }
    });
    
    it('should retrieve submissions by freelancer', async () => {
      // Make the request
      const response = await api.get('/submissions', { freelancerAddress: freelancerWallet.address });
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      if (response.data) {
        expect(Array.isArray(response.data)).toBe(true);
        
        // We should have at least one submission
        expect(response.data.length).toBeGreaterThanOrEqual(1);
        
        // All submissions should be from our test freelancer
        response.data.forEach((submission: SubmissionData) => {
          expect(submission.freelancerAddress).toBe(freelancerWallet.address);
        });
      }
    });
  });
  
  describe('GET /submissions/:id', () => {
    it('should retrieve a specific submission by ID', async () => {
      // Make sure we have a test submission
      expect(testSubmission).not.toBeNull();
      
      // Make the request
      const response = await api.get(`/submissions/${testSubmission!.id}`);
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      if (response.data) {
        const submission = response.data as SubmissionData;
        expect(submission.id).toBe(testSubmission!.id);
        expect(submission.projectId).toBe(testProject!.id);
        expect(submission.freelancerAddress).toBe(freelancerWallet.address);
      }
    });
    
    it('should return an error for non-existent submission ID', async () => {
      // Make the request with a non-existent ID
      const response = await api.get('/submissions/non-existent-id');
      
      // Assertions
      expect(response.isSuccess).toBe(false);
      expect(response.message).toContain('not found');
    });
  });
  
  describe('PUT /submissions/:id', () => {
    it('should update a submission with valid signature', async () => {
      // Make sure we have a test submission
      expect(testSubmission).not.toBeNull();
      
      const updatedContent = 'Updated submission content';
      
      // Generate the typed data for submission update
      const typedData = generateSubmissionUpdateTypedData(
        testSubmission!.id,
        testProject!.id,
        freelancerWallet.address
      );
      
      // Sign the message
      const signature = await signMessage(freelancerWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        walletAddress: freelancerWallet.address,
        submissionContent: updatedContent,
        linkToWork: 'https://example.com/updated-submission',
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.put(`/submissions/${testSubmission!.id}`, requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      if (response.data) {
        const submission = response.data as SubmissionData;
        expect(submission.id).toBe(testSubmission!.id);
        expect(submission.submissionContent).toBe(updatedContent);
      }
      
      // Update our test submission data
      if (response.isSuccess && response.data) {
        testSubmission = response.data as SubmissionData;
      }
    });
    
    it('should reject submission update with invalid signature', async () => {
      // Make sure we have a test submission
      expect(testSubmission).not.toBeNull();
      
      // Generate the typed data for submission update
      const typedData = generateSubmissionUpdateTypedData(
        testSubmission!.id,
        testProject!.id,
        freelancerWallet.address
      );
      
      // Create an invalid signature
      const invalidSignature = "invalid-signature";
      
      // Create the request payload
      const requestData = {
        walletAddress: freelancerWallet.address,
        submissionContent: 'This update should be rejected',
        signature: invalidSignature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.put(`/submissions/${testSubmission!.id}`, requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(false);
      expect(response.message).toContain('Invalid signature');
    });
  });
  
  describe('DELETE /submissions/:id', () => {
    it('should delete a submission with valid signature', async () => {
      // Make sure we have a test submission
      expect(testSubmission).not.toBeNull();
      
      // Generate the typed data for submission deletion
      const typedData = generateSubmissionDeleteTypedData(
        testSubmission!.id,
        testProject!.id,
        freelancerWallet.address
      );
      
      // Sign the message
      const signature = await signMessage(freelancerWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        walletAddress: freelancerWallet.address,
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.delete(`/submissions/${testSubmission!.id}`, requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      
      // Verify the submission is actually deleted
      const getResponse = await api.get(`/submissions/${testSubmission!.id}`);
      expect(getResponse.isSuccess).toBe(false);
      
      // Clear our test submission
      testSubmission = null;
    });
    
    it('should reject submission deletion with invalid signature', async () => {
      // We need to create a new submission since we deleted the previous one
      // First, make sure we have a test project
      expect(testProject).not.toBeNull();
      
      // Generate the typed data for submission creation
      const createTypedData = generateSubmissionCreateTypedData(
        testProject!.id,
        freelancerWallet.address
      );
      
      // Sign the message
      const createSignature = await signMessage(freelancerWallet.privateKey, createTypedData);
      
      // Create the request payload
      const createRequestData = {
        walletAddress: freelancerWallet.address,
        projectId: testProject!.id,
        submissionContent: 'This is a new submission for deletion test',
        signature: createSignature,
        nonce: createTypedData.nonce
      };
      
      // Create a new submission
      const createResponse = await api.post('/submissions', createRequestData);
      
      // Store the new submission
      if (createResponse.isSuccess && createResponse.data) {
        testSubmission = createResponse.data as SubmissionData;
      }
      
      // Make sure we have a test submission
      expect(testSubmission).not.toBeNull();
      
      // Now try to delete it with an invalid signature
      // Generate the typed data for submission deletion
      const deleteTypedData = generateSubmissionDeleteTypedData(
        testSubmission!.id,
        testProject!.id,
        freelancerWallet.address
      );
      
      // Create an invalid signature
      const invalidSignature = "invalid-signature";
      
      // Create the request payload
      const deleteRequestData = {
        walletAddress: freelancerWallet.address,
        signature: invalidSignature,
        nonce: deleteTypedData.nonce
      };
      
      // Make the request
      const response = await api.delete(`/submissions/${testSubmission!.id}`, deleteRequestData);
      
      // Assertions
      expect(response.isSuccess).toBe(false);
      expect(response.message).toContain('Invalid signature');
      
      // Verify the submission still exists
      const getResponse = await api.get(`/submissions/${testSubmission!.id}`);
      expect(getResponse.isSuccess).toBe(true);
    });
  });
  
  // Clean up after all tests
  afterAll(async () => {
    // Delete the test project if it exists
    if (testProject) {
      // Generate the typed data for project deletion
      const typedData = generateProjectDeleteTypedData(
        testProject.id,
        companyWallet.address
      );
      
      // Sign the message
      const signature = await signMessage(companyWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        walletAddress: companyWallet.address,
        signature,
        nonce: typedData.nonce
      };
      
      // Delete the project
      await api.delete(`/projects/${testProject.id}`, requestData);
    }
  });
}); 