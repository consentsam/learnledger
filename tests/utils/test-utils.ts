/**
 * Test utilities for API testing
 */

import { ethers } from 'ethers';
import { getEIP712Domain } from '@/lib/ethereum/signature-utils';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Define the MockApiResponse interface for all API responses
export interface MockApiResponse {
  isSuccess: boolean;
  message?: string;
  data?: any;
}

// Define specific types for structured data responses
export interface ProjectData {
  id: string;
  projectName: string;
  projectDescription?: string;
  projectLink?: string;
  prizeAmount?: number;
  requiredSkills?: string[];
  projectStatus: string;
  projectOwner: string;
  assignedFreelancer?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionData {
  id: string;
  projectId: string;
  submissionContent: string;
  linkToWork?: string;
  freelancerAddress: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserData {
  id: string;
  walletAddress: string;
  name: string;
  role: 'company' | 'freelancer';
  bio?: string;
  website?: string;
  skills?: string[];
  createdAt: string;
  updatedAt: string;
}

// Define types for the mock database
interface MockUser {
  id: string;
  walletAddress: string;
  name: string;
  role: 'company' | 'freelancer';
  bio?: string;
  website?: string;
  skills?: string[];
  createdAt: string;
  updatedAt: string;
}

interface MockProject {
  id: string;
  projectName: string;
  projectDescription?: string;
  projectLink?: string;
  prizeAmount?: number;
  requiredSkills?: string[];
  projectStatus: string;
  projectOwner: string;
  assignedFreelancer?: string;
  createdAt: string;
  updatedAt: string;
}

interface MockSubmission {
  id: string;
  projectId: string;
  submissionContent: string;
  linkToWork?: string;
  freelancerAddress: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory storage for mock data
const mockDB = {
  users: [] as MockUser[],
  projects: [] as MockProject[],
  submissions: [] as MockSubmission[],
};

// Helper function to generate mock IDs
function generateId(): string {
  const mockIds = ['mock-id-1', 'mock-id-2', 'mock-id-3', 'mock-id-4', 'mock-id-5', 'mock-id-6'];
  const usedIds = [...mockDB.users.map(u => u.id), ...mockDB.projects.map(p => p.id), ...mockDB.submissions.map(s => s.id)];
  
  // Find the first unused ID, or generate a new one if all are used
  const availableId = mockIds.find(id => !usedIds.includes(id));
  if (availableId) return availableId;
  
  return `mock-id-${Date.now()}`;
}

// Helper function to verify signatures
// For testing, we'll accept any signature except ones with 'invalid' in them
function verifySignature(walletAddress: string, signature: string, _typedData: any): boolean {
  // For testing purposes:
  // 1. If signature explicitly contains 'invalid', it's invalid
  // 2. Otherwise, it's considered valid
  return !signature.includes('invalid');
}

/**
 * Loads test wallets from environment variables
 */
export function loadTestWallets() {
  const wallets: Record<string, { address: string; privateKey: string }> = {};
  
  // Load company wallets
  wallets.COMPANY1 = {
    address: process.env.TEST_COMPANY1_ADDRESS || '0xCompany1Address',
    privateKey: process.env.TEST_COMPANY1_PRIVATE_KEY || '0xCompany1PrivateKey'
  };
  
  wallets.COMPANY2 = {
    address: process.env.TEST_COMPANY2_ADDRESS || '0xCompany2Address',
    privateKey: process.env.TEST_COMPANY2_PRIVATE_KEY || '0xCompany2PrivateKey'
  };
  
  // Load freelancer wallets
  wallets.FREELANCER1 = {
    address: process.env.TEST_FREELANCER1_ADDRESS || '0xFreelancer1Address',
    privateKey: process.env.TEST_FREELANCER1_PRIVATE_KEY || '0xFreelancer1PrivateKey'
  };
  
  wallets.FREELANCER2 = {
    address: process.env.TEST_FREELANCER2_ADDRESS || '0xFreelancer2Address',
    privateKey: process.env.TEST_FREELANCER2_PRIVATE_KEY || '0xFreelancer2PrivateKey'
  };
  
  wallets.FREELANCER3 = {
    address: process.env.TEST_FREELANCER3_ADDRESS || '0xFreelancer3Address',
    privateKey: process.env.TEST_FREELANCER3_PRIVATE_KEY || '0xFreelancer3PrivateKey'
  };
  
  return wallets;
}

/**
 * Signs a message using the provided private key
 */
export async function signMessage(privateKey: string, typedData: any): Promise<string> {
  if (!privateKey || privateKey.startsWith('0x') && privateKey.length < 66) {
    // Use a mock signature for testing if no valid private key
    return `mock-signature-${Date.now()}`;
  }
  
  try {
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signTypedData(
      typedData.domain,
      typedData.types,
      typedData.value
    );
    return signature;
  } catch (error) {
    console.error("Error signing message:", error);
    return `mock-signature-${Date.now()}`;
  }
}

/**
 * Generates typed data for user registration
 */
export function generateUserRegistrationTypedData(walletAddress: string, name: string, role: 'company' | 'freelancer') {
  return {
    domain: {
      name: 'ProjectLedger',
      version: '1',
      chainId: 1,
    },
    types: {
      Registration: [
        { name: 'walletAddress', type: 'address' },
        { name: 'name', type: 'string' },
        { name: 'role', type: 'string' },
        { name: 'nonce', type: 'string' },
      ],
    },
    value: {
      walletAddress,
      name,
      role,
      nonce: String(Date.now()),
    },
    nonce: String(Date.now()),
  };
}

/**
 * Generates typed data for project creation
 */
export function generateProjectCreationTypedData(walletAddress: string, projectName: string, description: string, prize: number) {
  return {
    domain: {
      name: 'ProjectLedger',
      version: '1',
      chainId: 1,
    },
    types: {
      ProjectCreation: [
        { name: 'walletAddress', type: 'address' },
        { name: 'projectName', type: 'string' },
        { name: 'projectDescription', type: 'string' },
        { name: 'prizeAmount', type: 'uint256' },
        { name: 'nonce', type: 'string' },
      ],
    },
    value: {
      walletAddress,
      projectName,
      projectDescription: description,
      prizeAmount: prize,
      nonce: String(Date.now()),
    },
    nonce: String(Date.now()),
  };
}

/**
 * Generates typed data for project update
 */
export function generateProjectUpdateTypedData(projectId: string, walletAddress: string, projectName: string) {
  return {
    domain: {
      name: 'ProjectLedger',
      version: '1',
      chainId: 1,
    },
    types: {
      ProjectUpdate: [
        { name: 'projectId', type: 'string' },
        { name: 'walletAddress', type: 'address' },
        { name: 'projectName', type: 'string' },
        { name: 'nonce', type: 'string' },
      ],
    },
    value: {
      projectId,
      walletAddress,
      projectName,
      nonce: String(Date.now()),
    },
    nonce: String(Date.now()),
  };
}

/**
 * Generates typed data for project deletion
 */
export function generateProjectDeleteTypedData(projectId: string, walletAddress: string) {
  return {
    domain: {
      name: 'ProjectLedger',
      version: '1',
      chainId: 1,
    },
    types: {
      ProjectDeletion: [
        { name: 'projectId', type: 'string' },
        { name: 'walletAddress', type: 'address' },
        { name: 'nonce', type: 'string' },
      ],
    },
    value: {
      projectId,
      walletAddress,
      nonce: String(Date.now()),
    },
    nonce: String(Date.now()),
  };
}

/**
 * Generates typed data for submission creation
 */
export function generateSubmissionCreateTypedData(projectId: string, walletAddress: string) {
  return {
    domain: {
      name: 'ProjectLedger',
      version: '1',
      chainId: 1,
    },
    types: {
      SubmissionCreate: [
        { name: 'projectId', type: 'string' },
        { name: 'walletAddress', type: 'address' },
        { name: 'nonce', type: 'string' },
      ],
    },
    value: {
      projectId,
      walletAddress,
      nonce: String(Date.now()),
    },
    nonce: String(Date.now()),
  };
}

/**
 * Generates typed data for submission update
 */
export function generateSubmissionUpdateTypedData(submissionId: string, projectId: string, walletAddress: string) {
  return {
    domain: {
      name: 'ProjectLedger',
      version: '1',
      chainId: 1,
    },
    types: {
      SubmissionUpdate: [
        { name: 'submissionId', type: 'string' },
        { name: 'projectId', type: 'string' },
        { name: 'walletAddress', type: 'address' },
        { name: 'nonce', type: 'string' },
      ],
    },
    value: {
      submissionId,
      projectId,
      walletAddress,
      nonce: String(Date.now()),
    },
    nonce: String(Date.now()),
  };
}

/**
 * Generates typed data for submission deletion
 */
export function generateSubmissionDeleteTypedData(submissionId: string, projectId: string, walletAddress: string) {
  return {
    domain: {
      name: 'ProjectLedger',
      version: '1',
      chainId: 1,
    },
    types: {
      SubmissionDeletion: [
        { name: 'submissionId', type: 'string' },
        { name: 'projectId', type: 'string' },
        { name: 'walletAddress', type: 'address' },
        { name: 'nonce', type: 'string' },
      ],
    },
    value: {
      submissionId,
      projectId,
      walletAddress,
      nonce: String(Date.now()),
    },
    nonce: String(Date.now()),
  };
}

/**
 * Generates typed data for user profile update
 */
export function generateUserProfileUpdateTypedData(walletAddress: string, name: string, bio?: string) {
  return {
    domain: {
      name: 'ProjectLedger',
      version: '1',
      chainId: 1,
    },
    types: {
      ProfileUpdate: [
        { name: 'walletAddress', type: 'address' },
        { name: 'name', type: 'string' },
        { name: 'bio', type: 'string' },
        { name: 'nonce', type: 'string' },
      ],
    },
    value: {
      walletAddress,
      name,
      bio: bio || '',
      nonce: String(Date.now()),
    },
    nonce: String(Date.now()),
  };
}

/**
 * Generates typed data for user profile deletion
 */
export function generateUserProfileDeleteTypedData(walletAddress: string) {
  return {
    domain: {
      name: 'ProjectLedger',
      version: '1',
      chainId: 1,
    },
    types: {
      ProfileDeletion: [
        { name: 'walletAddress', type: 'address' },
        { name: 'nonce', type: 'string' },
      ],
    },
    value: {
      walletAddress,
      nonce: String(Date.now()),
    },
    nonce: String(Date.now()),
  };
}

/**
 * Mock API for testing
 */
export const api = {
  /**
   * GET request
   */
  async get(path: string, params: Record<string, any> = {}): Promise<MockApiResponse> {
    try {
      // Handle different API paths
      if (path.startsWith('/user/profile/')) {
        const walletAddress = path.split('/').pop();
        const user = mockDB.users.find(u => u.walletAddress === walletAddress);
        
        if (user) {
          return {
            isSuccess: true,
            data: user
          };
        } else {
          console.log(`${walletAddress} profile not found, will need to create it`);
          return {
            isSuccess: false,
            message: 'User profile not found'
          };
        }
      }
      
      // Handle /projects/[id] path
      if (path.startsWith('/projects/') && !path.endsWith('/projects')) {
        const projectId = path.split('/').pop();
        
        if (projectId === 'non-existent-id') {
          return {
            isSuccess: false,
            message: 'Project not found'
          };
        }
        
        const project = mockDB.projects.find(p => p.id === projectId);
        if (project) {
          return {
            isSuccess: true,
            data: project
          };
        } else {
          return {
            isSuccess: false,
            message: 'Project not found'
          };
        }
      }
      
      // Handle /submissions/[id] path
      if (path.startsWith('/submissions/') && !path.endsWith('/submissions')) {
        const submissionId = path.split('/').pop();
        
        if (submissionId === 'non-existent-id') {
          return {
            isSuccess: false,
            message: 'Submission not found'
          };
        }
        
        const submission = mockDB.submissions.find(s => s.id === submissionId);
        if (submission) {
          return {
            isSuccess: true,
            data: submission
          };
        } else {
          return {
            isSuccess: false,
            message: 'Submission not found'
          };
        }
      }
      
      // Handle /projects
      if (path === '/projects') {
        let filteredProjects = [...mockDB.projects];
        
        // Apply filters
        if (params.status) {
          filteredProjects = filteredProjects.filter(p => p.projectStatus === params.status);
        }
        
        if (params.skill) {
          filteredProjects = filteredProjects.filter(p => 
            p.requiredSkills && p.requiredSkills.includes(params.skill)
          );
        }
        
        return {
          isSuccess: true,
          data: filteredProjects
        };
      }
      
      // Handle /submissions with filters
      if (path === '/submissions') {
        let filteredSubmissions = [...mockDB.submissions];
        
        if (params.projectId) {
          filteredSubmissions = filteredSubmissions.filter(s => s.projectId === params.projectId);
        }
        
        if (params.freelancerAddress) {
          filteredSubmissions = filteredSubmissions.filter(s => s.freelancerAddress === params.freelancerAddress);
        }
        
        return {
          isSuccess: true,
          data: filteredSubmissions
        };
      }
      
      // Handle GET /userProfile
      if (path === '/userProfile') {
        const { walletAddress } = params;
        
        if (!walletAddress) {
          return { isSuccess: false, message: 'Wallet address is required' };
        }
        
        const user = mockDB.users.find(u => u.walletAddress.toLowerCase() === walletAddress.toLowerCase());
        
        if (!user) {
          return { isSuccess: false, message: 'User profile not found' };
        }
        
        return { isSuccess: true, data: { ...user } };
      }
      
      // Default response for unknown paths
      return {
        isSuccess: true,
        data: []
      };
    } catch (error) {
      console.error('Error making GET request:', error);
      return {
        isSuccess: false,
        message: 'Request failed'
      };
    }
  },
  
  /**
   * POST request
   */
  async post(path: string, data: Record<string, any>): Promise<MockApiResponse> {
    try {
      // Handle user registration
      if (path === '/register') {
        // Check for required fields
        if (!data.walletAddress || !data.name || !data.role || !data.signature) {
          return {
            isSuccess: false,
            message: 'Missing required fields'
          };
        }
        
        // Verify signature first
        if (!verifySignature(data.walletAddress, data.signature, {
          domain: { name: 'ProjectLedger', version: '1', chainId: 1 },
          types: {
            Registration: [
              { name: 'walletAddress', type: 'address' },
              { name: 'name', type: 'string' },
              { name: 'role', type: 'string' },
              { name: 'nonce', type: 'string' },
            ]
          },
          value: {
            walletAddress: data.walletAddress,
            name: data.name,
            role: data.role,
            nonce: data.nonce
          }
        })) {
          return {
            isSuccess: false,
            message: 'Invalid signature'
          };
        }
        
        // After signature verification, check if user already exists
        const existingUser = mockDB.users.find(u => u.walletAddress === data.walletAddress);
        if (existingUser) {
          return {
            isSuccess: false,
            message: 'User already registered'
          };
        }
        
        // Create new user
        const newUser: MockUser = {
          id: generateId(),
          walletAddress: data.walletAddress,
          name: data.name,
          role: data.role,
          bio: data.bio || '',
          website: data.website || '',
          skills: data.skills ? (typeof data.skills === 'string' ? data.skills.split(',') : data.skills) : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        mockDB.users.push(newUser);
        
        return {
          isSuccess: true,
          data: newUser
        };
      }
      
      // Handle project creation
      if (path === '/projects') {
        // Check for required fields
        if (!data.walletAddress || !data.projectName || !data.signature) {
          return {
            isSuccess: false,
            message: 'Missing required fields'
          };
        }
        
        // Verify signature
        if (!verifySignature(data.walletAddress, data.signature, {
          domain: { name: 'ProjectLedger', version: '1', chainId: 1 },
          types: {
            ProjectCreation: [
              { name: 'walletAddress', type: 'address' },
              { name: 'projectName', type: 'string' },
              { name: 'projectDescription', type: 'string' },
              { name: 'prizeAmount', type: 'uint256' },
              { name: 'nonce', type: 'string' },
            ]
          },
          value: {
            walletAddress: data.walletAddress,
            projectName: data.projectName,
            projectDescription: data.projectDescription || '',
            prizeAmount: data.prizeAmount || 0,
            nonce: data.nonce
          }
        })) {
          return {
            isSuccess: false,
            message: 'Invalid signature'
          };
        }
        
        // Create new project
        const newProject: MockProject = {
          id: generateId(),
          projectName: data.projectName,
          projectDescription: data.projectDescription || '',
          projectLink: data.projectLink || '',
          prizeAmount: data.prizeAmount || 0,
          requiredSkills: data.requiredSkills ? (typeof data.requiredSkills === 'string' ? data.requiredSkills.split(',') : data.requiredSkills) : [],
          projectStatus: data.projectStatus || 'open',
          projectOwner: data.walletAddress,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        mockDB.projects.push(newProject);
        
        return {
          isSuccess: true,
          data: newProject
        };
      }
      
      // Handle submission creation
      if (path === '/submissions') {
        // Check for required fields
        if (!data.walletAddress || !data.projectId || !data.submissionContent || !data.signature) {
          return {
            isSuccess: false,
            message: 'Missing required fields'
          };
        }
        
        // Verify project exists
        const project = mockDB.projects.find(p => p.id === data.projectId);
        if (!project) {
          return {
            isSuccess: false,
            message: 'Project not found'
          };
        }
        
        // Verify signature
        if (!verifySignature(data.walletAddress, data.signature, {
          domain: { name: 'ProjectLedger', version: '1', chainId: 1 },
          types: {
            SubmissionCreate: [
              { name: 'projectId', type: 'string' },
              { name: 'walletAddress', type: 'address' },
              { name: 'nonce', type: 'string' },
            ]
          },
          value: {
            projectId: data.projectId,
            walletAddress: data.walletAddress,
            nonce: data.nonce
          }
        })) {
          return {
            isSuccess: false,
            message: 'Invalid signature'
          };
        }
        
        // Create new submission
        const newSubmission: MockSubmission = {
          id: generateId(),
          projectId: data.projectId,
          submissionContent: data.submissionContent,
          linkToWork: data.linkToWork || '',
          freelancerAddress: data.walletAddress,
          status: 'submitted',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        mockDB.submissions.push(newSubmission);
        
        return {
          isSuccess: true,
          data: newSubmission
        };
      }
      
      // Default response for unknown paths
      return {
        isSuccess: false,
        message: 'Endpoint not found'
      };
    } catch (error) {
      console.error('Error making POST request:', error);
      return {
        isSuccess: false,
        message: 'Request failed'
      };
    }
  },
  
  /**
   * PUT request
   */
  async put(path: string, data: Record<string, any>): Promise<MockApiResponse> {
    try {
      // Handle PUT /userProfile
      if (path === '/userProfile') {
        const { walletAddress, name, bio, role, skills, signature, nonce } = data;
        
        // Check required fields
        if (!walletAddress || !name || !role || !signature) {
          return { isSuccess: false, message: 'Missing required fields' };
        }
        
        // Check for invalid signature
        if (signature.includes('invalid')) {
          return { isSuccess: false, message: 'Invalid signature' };
        }
        
        // Verify signature
        const typedData = generateUserProfileUpdateTypedData(walletAddress, name, bio);
        if (!verifySignature(walletAddress, signature, typedData)) {
          return { isSuccess: false, message: 'Invalid signature' };
        }
        
        // Find existing user or create new one
        let user = mockDB.users.find(u => u.walletAddress.toLowerCase() === walletAddress.toLowerCase());
        
        if (user) {
          // Update existing user
          user.name = name;
          if (bio) user.bio = bio;
          if (skills) user.skills = skills; // Store skills as-is, don't convert
          user.updatedAt = new Date().toISOString();
        } else {
          // Create new user
          user = {
            id: generateId(),
            walletAddress,
            name,
            role: role as 'company' | 'freelancer',
            bio,
            skills: skills, // Store skills as-is, don't convert
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          mockDB.users.push(user);
        }
        
        return { isSuccess: true, data: { ...user } };
      }
      
      // Handle project update
      if (path.startsWith('/projects/')) {
        const projectId = path.split('/').pop();
        
        // Check for required fields
        if (!data.walletAddress || !data.signature) {
          return {
            isSuccess: false,
            message: 'Missing required fields'
          };
        }
        
        // Check if project exists
        const projectIndex = mockDB.projects.findIndex(p => p.id === projectId);
        if (projectIndex === -1) {
          return {
            isSuccess: false,
            message: 'Project not found'
          };
        }
        
        // Check if user is the owner
        if (mockDB.projects[projectIndex].projectOwner !== data.walletAddress) {
          return {
            isSuccess: false,
            message: 'Not authorized to update this project'
          };
        }
        
        // Verify signature
        if (!verifySignature(data.walletAddress, data.signature, {
          domain: { name: 'ProjectLedger', version: '1', chainId: 1 },
          types: {
            ProjectUpdate: [
              { name: 'projectId', type: 'string' },
              { name: 'walletAddress', type: 'address' },
              { name: 'projectName', type: 'string' },
              { name: 'nonce', type: 'string' },
            ]
          },
          value: {
            projectId: projectId || '',
            walletAddress: data.walletAddress,
            projectName: data.projectName || mockDB.projects[projectIndex].projectName,
            nonce: data.nonce
          }
        })) {
          return {
            isSuccess: false,
            message: 'Invalid signature'
          };
        }
        
        // Update project
        const updatedProject = {
          ...mockDB.projects[projectIndex],
          projectName: data.projectName !== undefined ? data.projectName : mockDB.projects[projectIndex].projectName,
          projectDescription: data.projectDescription !== undefined ? data.projectDescription : mockDB.projects[projectIndex].projectDescription,
          projectLink: data.projectLink !== undefined ? data.projectLink : mockDB.projects[projectIndex].projectLink,
          prizeAmount: data.prizeAmount !== undefined ? data.prizeAmount : mockDB.projects[projectIndex].prizeAmount,
          requiredSkills: data.requiredSkills ? (typeof data.requiredSkills === 'string' ? data.requiredSkills.split(',') : data.requiredSkills) : mockDB.projects[projectIndex].requiredSkills,
          projectStatus: data.projectStatus !== undefined ? data.projectStatus : mockDB.projects[projectIndex].projectStatus,
          updatedAt: new Date().toISOString()
        };
        
        mockDB.projects[projectIndex] = updatedProject;
        
        return {
          isSuccess: true,
          data: updatedProject
        };
      }
      
      // Handle submission update
      if (path.startsWith('/submissions/')) {
        const submissionId = path.split('/').pop();
        
        // Check for required fields
        if (!data.walletAddress || !data.signature) {
          return {
            isSuccess: false,
            message: 'Missing required fields'
          };
        }
        
        // Check if submission exists
        const submissionIndex = mockDB.submissions.findIndex(s => s.id === submissionId);
        if (submissionIndex === -1) {
          return {
            isSuccess: false,
            message: 'Submission not found'
          };
        }
        
        // Check if user is the owner
        if (mockDB.submissions[submissionIndex].freelancerAddress !== data.walletAddress) {
          return {
            isSuccess: false,
            message: 'Not authorized to update this submission'
          };
        }
        
        // Verify signature
        if (!verifySignature(data.walletAddress, data.signature, {
          domain: { name: 'ProjectLedger', version: '1', chainId: 1 },
          types: {
            SubmissionUpdate: [
              { name: 'submissionId', type: 'string' },
              { name: 'projectId', type: 'string' },
              { name: 'walletAddress', type: 'address' },
              { name: 'nonce', type: 'string' },
            ]
          },
          value: {
            submissionId: submissionId || '',
            projectId: mockDB.submissions[submissionIndex].projectId,
            walletAddress: data.walletAddress,
            nonce: data.nonce
          }
        })) {
          return {
            isSuccess: false,
            message: 'Invalid signature'
          };
        }
        
        // Update submission
        const updatedSubmission = {
          ...mockDB.submissions[submissionIndex],
          submissionContent: data.submissionContent !== undefined ? data.submissionContent : mockDB.submissions[submissionIndex].submissionContent,
          linkToWork: data.linkToWork !== undefined ? data.linkToWork : mockDB.submissions[submissionIndex].linkToWork,
          updatedAt: new Date().toISOString()
        };
        
        mockDB.submissions[submissionIndex] = updatedSubmission;
        
        return {
          isSuccess: true,
          data: updatedSubmission
        };
      }
      
      // Default response for unknown paths
      return {
        isSuccess: false,
        message: 'Endpoint not found'
      };
    } catch (error) {
      console.error('Error making PUT request:', error);
      return {
        isSuccess: false,
        message: 'Request failed'
      };
    }
  },
  
  /**
   * DELETE request
   */
  async delete(path: string, data: Record<string, any>): Promise<MockApiResponse> {
    try {
      // Handle DELETE /userProfile
      if (path === '/userProfile') {
        const { walletAddress, signature } = data;
        
        // Check required fields
        if (!walletAddress || !signature) {
          return { isSuccess: false, message: 'Missing required fields' };
        }
        
        // Check for invalid signature
        if (signature.includes('invalid')) {
          return { isSuccess: false, message: 'Invalid signature' };
        }
        
        // Verify signature
        const typedData = generateUserProfileDeleteTypedData(walletAddress);
        if (!verifySignature(walletAddress, signature, typedData)) {
          return { isSuccess: false, message: 'Invalid signature' };
        }
        
        // Find user index
        const userIndex = mockDB.users.findIndex(u => u.walletAddress.toLowerCase() === walletAddress.toLowerCase());
        
        if (userIndex === -1) {
          return { isSuccess: false, message: 'User profile not found' };
        }
        
        // Remove user
        mockDB.users.splice(userIndex, 1);
        
        return { isSuccess: true, message: 'User profile deleted successfully' };
      }
      
      // Handle project deletion
      if (path.startsWith('/projects/')) {
        const projectId = path.split('/').pop();
        
        // Check for required fields
        if (!data.walletAddress || !data.signature) {
          return {
            isSuccess: false,
            message: 'Missing required fields'
          };
        }
        
        // Check if project exists
        const projectIndex = mockDB.projects.findIndex(p => p.id === projectId);
        if (projectIndex === -1) {
          return {
            isSuccess: false,
            message: 'Project not found'
          };
        }
        
        // Check if user is the owner
        if (mockDB.projects[projectIndex].projectOwner !== data.walletAddress) {
          return {
            isSuccess: false,
            message: 'Not authorized to delete this project'
          };
        }
        
        // Verify signature
        if (!verifySignature(data.walletAddress, data.signature, {
          domain: { name: 'ProjectLedger', version: '1', chainId: 1 },
          types: {
            ProjectDeletion: [
              { name: 'projectId', type: 'string' },
              { name: 'walletAddress', type: 'address' },
              { name: 'nonce', type: 'string' },
            ]
          },
          value: {
            projectId: projectId || '',
            walletAddress: data.walletAddress,
            nonce: data.nonce
          }
        })) {
          return {
            isSuccess: false,
            message: 'Invalid signature'
          };
        }
        
        // Delete project
        mockDB.projects.splice(projectIndex, 1);
        
        // Also delete associated submissions
        mockDB.submissions = mockDB.submissions.filter(s => s.projectId !== projectId);
        
        return {
          isSuccess: true,
          message: 'Project deleted successfully'
        };
      }
      
      // Handle submission deletion
      if (path.startsWith('/submissions/')) {
        const submissionId = path.split('/').pop();
        
        // Check for required fields
        if (!data.walletAddress || !data.signature) {
          return {
            isSuccess: false,
            message: 'Missing required fields'
          };
        }
        
        // Check if submission exists
        const submissionIndex = mockDB.submissions.findIndex(s => s.id === submissionId);
        if (submissionIndex === -1) {
          return {
            isSuccess: false,
            message: 'Submission not found'
          };
        }
        
        // Check if user is the owner
        if (mockDB.submissions[submissionIndex].freelancerAddress !== data.walletAddress) {
          return {
            isSuccess: false,
            message: 'Not authorized to delete this submission'
          };
        }
        
        // Verify signature
        if (!verifySignature(data.walletAddress, data.signature, {
          domain: { name: 'ProjectLedger', version: '1', chainId: 1 },
          types: {
            SubmissionDeletion: [
              { name: 'submissionId', type: 'string' },
              { name: 'projectId', type: 'string' },
              { name: 'walletAddress', type: 'address' },
              { name: 'nonce', type: 'string' },
            ]
          },
          value: {
            submissionId: submissionId || '',
            projectId: mockDB.submissions[submissionIndex].projectId,
            walletAddress: data.walletAddress,
            nonce: data.nonce
          }
        })) {
          return {
            isSuccess: false,
            message: 'Invalid signature'
          };
        }
        
        // Delete submission
        mockDB.submissions.splice(submissionIndex, 1);
        
        return {
          isSuccess: true,
          message: 'Submission deleted successfully'
        };
      }
      
      // Default response for unknown paths
      return {
        isSuccess: false,
        message: 'Endpoint not found'
      };
    } catch (error) {
      console.error('Error making DELETE request:', error);
      return {
        isSuccess: false,
        message: 'Request failed'
      };
    }
  }
}; 