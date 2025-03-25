import { ethers } from 'ethers';

// ABI for the ProjectLedgerMVP smart contract
const CONTRACT_ABI = [
  // Registration functions
  "function registerAsCompanyFor(address walletAddress) external",
  "function registerAsFreelancerFor(address walletAddress) external",
  
  // Submission functions
  "function createSubmissionFor(address walletAddress, bytes32 _projectId) external isEligibleFreelancer(walletAddress, _projectId) returns (bytes32 submissionId)",
  
  // Approval functions
  "function approveSubmissionFor(address walletAddress, bytes32 _submissionId) external returns (bool)",
  
  // View functions
  "function isCompany(address _user) external view returns (bool)",
  "function isFreelancer(address _user) external view returns (bool)"
];

// Environment variables
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY as string;
const CONTRACT_ADDRESS = process.env.SMART_CONTRACT_ADDRESS as string;
const RPC_URL = process.env.RPC_URL || 'https://rpc-mumbai.maticvigil.com'; // Default to Mumbai testnet

if (!EXECUTOR_PRIVATE_KEY) {
  console.error('EXECUTOR_PRIVATE_KEY environment variable is not set');
}

if (!CONTRACT_ADDRESS) {
  console.error('SMART_CONTRACT_ADDRESS environment variable is not set');
}

/**
 * Get an ethers provider instance
 */
function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

/**
 * Get a signer instance for the executor role
 */
function getExecutorSigner() {
  const provider = getProvider();
  return new ethers.Wallet(EXECUTOR_PRIVATE_KEY, provider);
}

/**
 * Get a contract instance connected to the executor signer
 */
export function getContractWithExecutor() {
  const signer = getExecutorSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

/**
 * Register a user as a company in the smart contract
 * @param userAddress The user's wallet address
 */
export async function registerUserAsCompany(userAddress: string) {
  try {
    console.log(`Registering user ${userAddress} as company...`);
    
    const contract = getContractWithExecutor();
    
    // Call the registerAsCompany function as the executor
    // This simulates the user calling the function, but we handle gas costs
    const tx = await contract.registerAsCompanyFor(userAddress);
    const receipt = await tx.wait();
    
    console.log(`User registered as company. Transaction hash: ${receipt.hash}`);
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Error registering user as company:', error);
    return { success: false, error };
  }
}

/**
 * Register a user as a freelancer in the smart contract
 * @param userAddress The user's wallet address
 */
export async function registerUserAsFreelancer(userAddress: string) {
  try {
    console.log(`Registering user ${userAddress} as freelancer...`);
    
    const contract = getContractWithExecutor();
    
    // Call the registerAsFreelancer function as the executor
    const tx = await contract.registerAsFreelancerFor(userAddress);
    const receipt = await tx.wait();
    
    console.log(`User registered as freelancer. Transaction hash: ${receipt.hash}`);
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Error registering user as freelancer:', error);
    return { success: false, error };
  }
}

/**
 * Create a submission for a project in the smart contract
 * @param projectId The project ID (bytes32)
 */
export async function createSubmissionOnChain(userAddress: string, projectId: string) {
  try {
    console.log(`Creating submission for project ${projectId}...`);
    
    const contract = getContractWithExecutor();
    
    // Call the createSubmission function
    const tx = await contract.createSubmissionFor(userAddress, projectId);
    const receipt = await tx.wait();
    
    // Parse the event to get the submission ID
    const submissionId = receipt.logs[0].topics[1]; // This may need adjustment based on the actual event structure
    
    console.log(`Submission created. ID: ${submissionId}, Transaction hash: ${receipt.hash}`);
    return { success: true, submissionId, txHash: receipt.hash };
  } catch (error) {
    console.error('Error creating submission:', error);
    return { success: false, error };
  }
}

/**
 * Approve a submission in the smart contract
 * @param submissionId The submission ID (bytes32)
 */
export async function approveSubmissionOnChain(userAddress: string, submissionId: string) {
  try {
    console.log(`Approving submission ${submissionId}...`);
    
    const contract = getContractWithExecutor();
    
    // Call the approveSubmission function
    const tx = await contract.approveSubmissionFor(userAddress, submissionId);
    const receipt = await tx.wait();
    
    console.log(`Submission approved. Transaction hash: ${receipt.hash}`);
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    console.error('Error approving submission:', error);
    return { success: false, error };
  }
} 