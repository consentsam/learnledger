/**
 * Utils for handling EIP-712 typed signatures for ProjectLedger.
 * Compatible with ethers v6.
 */

// The domain definition consistent across all EIP-712 signatures in our app
export const getEIP712Domain = () => ({
  name: 'ProjectLedger',
  version: '1',
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID || '1',
  verifyingContract: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'
})

/**
 * Generate the EIP-712 typed data for a submission deletion request 
 */
export const generateDeleteSubmissionTypedData = (
  submissionId: string,
  projectId: string,
  walletAddress: string
) => {
  const domain = getEIP712Domain()
  
  const types = {
    DeleteSubmission: [
      { name: 'submissionId', type: 'string' },
      { name: 'projectId', type: 'string' },
      { name: 'walletAddress', type: 'address' },
      { name: 'nonce', type: 'uint256' }
    ]
  }

  // In a production app, you'd implement a proper nonce system 
  // to prevent replay attacks. For simplicity, we're using timestamp.
  const nonce = Date.now()
  
  const value = {
    submissionId,
    projectId,
    walletAddress,
    nonce
  }

  return {
    domain,
    types,
    value,
    nonce
  }
}

/**
 * Request a signature from MetaMask for deleting a submission.
 * Uses eth_signTypedData_v4 which is compatible with EIP-712.
 */
export const signDeleteSubmissionRequest = async (
  ethereum: any,
  submissionId: string, 
  projectId: string, 
  walletAddress: string
) => {
  if (!ethereum) throw new Error('MetaMask is not installed')
  
  const { domain, types, value } = generateDeleteSubmissionTypedData(
    submissionId,
    projectId,
    walletAddress
  )
  
  try {
    // Request signature from MetaMask using EIP-712
    const signature = await ethereum.request({
      method: 'eth_signTypedData_v4',
      params: [walletAddress, JSON.stringify({ types, domain, primaryType: 'DeleteSubmission', message: value })],
    })

    return {
      signature,
      submissionId: value.submissionId,
      projectId: value.projectId,
      walletAddress: value.walletAddress,
      nonce: value.nonce
    }
  } catch (error) {
    console.error('Error signing message:', error)
    throw error
  }
} 