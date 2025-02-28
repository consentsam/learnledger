/**
 * Script to generate test wallets for API testing
 * Run this script with: node tests/generate-wallets.js
 */

// Register ts-node
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
  },
});

// Import and run the wallet generator
require('./utils/wallet-generator.ts').generateTestWallets()
  .then(() => console.log('Test wallets generated successfully'))
  .catch(error => {
    console.error('Failed to generate test wallets:', error);
    process.exit(1);
  }); 