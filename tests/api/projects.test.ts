/**
 * Tests for the project management API endpoints
 */

import { 
  loadTestWallets, 
  signMessage, 
  generateProjectCreationTypedData,
  generateProjectUpdateTypedData,
  generateProjectDeleteTypedData,
  api,
  MockApiResponse,
  ProjectData
} from '../utils/test-utils';

// Load test wallets
const testWallets = loadTestWallets();

// Company wallet for test projects
const companyWallet = testWallets.COMPANY1;

// Store created project IDs for later tests
const testProjects: ProjectData[] = [];

describe('Project Management API', () => {
  // This beforeAll block will ensure we have all the necessary test wallets
  beforeAll(() => {
    // Verify we have the necessary test wallets
    expect(companyWallet).toBeDefined();
    expect(companyWallet.privateKey).toBeDefined();
  });

  describe('POST /projects', () => {
    it('should create a project with valid signature', async () => {
      const projectName = 'Test Project 1';
      const projectDescription = 'A test project for API testing';
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
        projectLink: 'https://example.com/project1',
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.post('/projects', requestData);
      
      // Add to test projects if successful
      if (response.isSuccess && response.data) {
        testProjects.push(response.data as ProjectData);
      }
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      if (response.data) {
        const project = response.data as ProjectData;
        expect(project.projectName).toBe(projectName);
        expect(project.projectDescription).toBe(projectDescription);
        expect(Number(project.prizeAmount)).toBe(prizeAmount);
        expect(project.projectOwner).toBe(companyWallet.address);
      }
    });
    
    it('should create another project with valid signature', async () => {
      const projectName = 'Test Project 2';
      const projectDescription = 'Another test project for API testing';
      const prizeAmount = 2000;
      
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
        requiredSkills: ['Python', 'Django', 'PostgreSQL'],
        projectLink: 'https://example.com/project2',
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.post('/projects', requestData);
      
      // Add to test projects if successful
      if (response.isSuccess && response.data) {
        testProjects.push(response.data as ProjectData);
      }
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      if (response.data) {
        const project = response.data as ProjectData;
        expect(project.projectName).toBe(projectName);
        expect(project.projectOwner).toBe(companyWallet.address);
      }
    });
    
    it('should reject project creation with invalid signature', async () => {
      const projectName = 'Invalid Project';
      const projectDescription = 'This project should be rejected';
      const prizeAmount = 3000;
      
      // Generate the typed data for project creation
      const typedData = generateProjectCreationTypedData(
        companyWallet.address,
        projectName,
        projectDescription,
        prizeAmount
      );
      
      // Create an invalid signature
      const invalidSignature = "invalid-" + await signMessage(companyWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        walletAddress: companyWallet.address,
        projectName,
        projectDescription,
        prizeAmount,
        signature: invalidSignature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.post('/projects', requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(false);
      expect(response.message).toContain('Invalid signature');
    });
  });
  
  describe('GET /projects', () => {
    it('should retrieve all projects', async () => {
      // Make the request
      const response = await api.get('/projects');
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      if (response.data) {
        expect(Array.isArray(response.data)).toBe(true);
        
        // We should have at least the two projects we created
        expect(response.data.length).toBeGreaterThanOrEqual(2);
      }
    });
    
    it('should filter projects by status', async () => {
      // Filter for open projects
      const response = await api.get('/projects', { status: 'open' });
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      if (response.data) {
        expect(Array.isArray(response.data)).toBe(true);
        
        // All projects should have status 'open'
        response.data.forEach((project: ProjectData) => {
          expect(project.projectStatus).toBe('open');
        });
      }
    });
    
    it('should filter projects by required skill', async () => {
      // Filter for projects requiring JavaScript
      const response = await api.get('/projects', { skill: 'JavaScript' });
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      if (response.data) {
        expect(Array.isArray(response.data)).toBe(true);
        
        // All projects should require JavaScript
        response.data.forEach((project: ProjectData) => {
          expect(project.requiredSkills?.includes('JavaScript')).toBe(true);
        });
      }
    });
  });
  
  describe('GET /projects/:id', () => {
    it('should retrieve a specific project by ID', async () => {
      // Make sure we have at least one test project
      expect(testProjects.length).toBeGreaterThan(0);
      
      const projectId = testProjects[0].id;
      
      // Make the request
      const response = await api.get(`/projects/${projectId}`);
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      if (response.data) {
        const project = response.data as ProjectData;
        expect(project.id).toBe(projectId);
        expect(project.projectName).toBe(testProjects[0].projectName);
      }
    });
    
    it('should return an error for non-existent project ID', async () => {
      // Make the request with a non-existent ID
      const response = await api.get('/projects/non-existent-id');
      
      // Assertions
      expect(response.isSuccess).toBe(false);
      expect(response.message).toContain('not found');
    });
  });
  
  describe('PUT /projects/:id', () => {
    it('should update a project with valid signature', async () => {
      // Make sure we have at least one test project
      expect(testProjects.length).toBeGreaterThan(0);
      
      const projectId = testProjects[0].id;
      const updatedName = 'Updated Project Name';
      
      // Generate the typed data for project update
      const typedData = generateProjectUpdateTypedData(
        projectId,
        companyWallet.address,
        updatedName
      );
      
      // Sign the message
      const signature = await signMessage(companyWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        walletAddress: companyWallet.address,
        projectName: updatedName,
        projectDescription: 'Updated project description',
        signature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.put(`/projects/${projectId}`, requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      expect(response.data).toBeDefined();
      if (response.data) {
        const project = response.data as ProjectData;
        expect(project.id).toBe(projectId);
        expect(project.projectName).toBe(updatedName);
      }
      
      // Update our test project data
      if (response.isSuccess && response.data) {
        testProjects[0] = response.data as ProjectData;
      }
    });
    
    it('should reject project update with invalid signature', async () => {
      // Make sure we have at least one test project
      expect(testProjects.length).toBeGreaterThan(0);
      
      const projectId = testProjects[0].id;
      const updatedName = 'This Update Should Fail';
      
      // Generate the typed data for project update
      const typedData = generateProjectUpdateTypedData(
        projectId,
        companyWallet.address,
        updatedName
      );
      
      // Create an invalid signature
      const invalidSignature = "invalid-" + await signMessage(companyWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        walletAddress: companyWallet.address,
        projectName: updatedName,
        signature: invalidSignature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.put(`/projects/${projectId}`, requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(false);
      expect(response.message).toContain('Invalid signature');
    });
  });
  
  describe('DELETE /projects/:id', () => {
    it('should delete a project with valid signature', async () => {
      // Make sure we have at least two test projects
      expect(testProjects.length).toBeGreaterThanOrEqual(2);
      
      // Use the second project for deletion
      const projectId = testProjects[1].id;
      
      // Generate the typed data for project deletion
      const typedData = generateProjectDeleteTypedData(
        projectId,
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
      
      // Make the request
      const response = await api.delete(`/projects/${projectId}`, requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(true);
      
      // Verify the project is actually deleted
      const getResponse = await api.get(`/projects/${projectId}`);
      expect(getResponse.isSuccess).toBe(false);
      
      // Remove the project from our test projects
      const index = testProjects.findIndex(p => p.id === projectId);
      if (index !== -1) {
        testProjects.splice(index, 1);
      }
    });
    
    it('should reject project deletion with invalid signature', async () => {
      // Make sure we have at least one test project
      expect(testProjects.length).toBeGreaterThan(0);
      
      const projectId = testProjects[0].id;
      
      // Generate the typed data for project deletion
      const typedData = generateProjectDeleteTypedData(
        projectId,
        companyWallet.address
      );
      
      // Create an invalid signature
      const invalidSignature = "invalid-" + await signMessage(companyWallet.privateKey, typedData);
      
      // Create the request payload
      const requestData = {
        walletAddress: companyWallet.address,
        signature: invalidSignature,
        nonce: typedData.nonce
      };
      
      // Make the request
      const response = await api.delete(`/projects/${projectId}`, requestData);
      
      // Assertions
      expect(response.isSuccess).toBe(false);
      expect(response.message).toContain('Invalid signature');
      
      // Verify the project still exists
      const getResponse = await api.get(`/projects/${projectId}`);
      expect(getResponse.isSuccess).toBe(true);
    });
  });
}); 