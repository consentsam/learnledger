/**
 * Wallet generator for creating test wallets
 * This script generates Ethereum test wallets that can be used for testing
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// Define wallet types
interface WalletConfig {
  role: 'company' | 'freelancer';
  name: string;
}

// List of wallets to generate
const walletsToGenerate: WalletConfig[] = [
  { role: 'company', name: 'COMPANY1' },
  { role: 'company', name: 'COMPANY2' },
  { role: 'freelancer', name: 'FREELANCER1' },
  { role: 'freelancer', name: 'FREELANCER2' },
  { role: 'freelancer', name: 'FREELANCER3' }
];

/**
 * Generates a new wallet
 */
function generateWallet() {
  return ethers.Wallet.createRandom();
}

/**
 * Updates the .env.local file with wallet information
 */
export async function generateTestWallets() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  
  try {
    // Check if .env.local exists and read its content
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    // Parse the existing .env.local content
    const envLines = envContent.split('\n');
    const envData: Record<string, string> = {};
    
    envLines.forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envData[key.trim()] = value.trim();
      }
    });

    // Generate new wallets and update .env data
    const newEnvEntries: string[] = [];
    
    for (const walletConfig of walletsToGenerate) {
      const { role, name } = walletConfig;
      
      // Check if wallet already exists
      const addressKey = `TEST_${name}_ADDRESS`;
      const privateKeyKey = `TEST_${name}_PRIVATE_KEY`;
      const roleKey = `TEST_${name}_ROLE`;
      
      if (!envData[addressKey] || !envData[privateKeyKey]) {
        // Generate new wallet
        const wallet = generateWallet();
        
        envData[addressKey] = wallet.address;
        envData[privateKeyKey] = wallet.privateKey;
        envData[roleKey] = role;
        
        newEnvEntries.push(`${addressKey}=${wallet.address}`);
        newEnvEntries.push(`${privateKeyKey}=${wallet.privateKey}`);
        newEnvEntries.push(`${roleKey}=${role}`);
      }
    }

    // If we generated new wallets, update the .env.local file
    if (newEnvEntries.length > 0) {
      // First, add any existing env entries that we didn't modify
      const existingEntries = envLines.filter(line => {
        const key = line.split('=')[0]?.trim();
        return key && !Object.keys(envData).includes(key);
      });
      
      // Create the updated env content
      const updatedEnvContent = [
        ...existingEntries,
        ...Object.entries(envData).map(([key, value]) => `${key}=${value}`)
      ].join('\n');
      
      // Write the updated content to .env.local
      fs.writeFileSync(envPath, updatedEnvContent);
      
      console.log(`Generated ${newEnvEntries.length / 3} new test wallets`);
    } else {
      console.log('All test wallets already exist in .env.local');
    }
    
    // Return the wallet data
    return Object.entries(envData)
      .filter(([key]) => key.startsWith('TEST_'))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
    
  } catch (error) {
    console.error('Error generating test wallets:', error);
    throw error;
  }
}

// If this script is run directly, generate wallets
if (require.main === module) {
  generateTestWallets()
    .then(() => console.log('Test wallets generated successfully'))
    .catch(error => console.error('Failed to generate test wallets:', error));
} 