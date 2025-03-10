// validate-and-update-api-docs.js
// Main script to validate and update API documentation

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create an interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Main function to validate and update API documentation
 */
async function validateAndUpdateApiDocs() {
  console.log('=== LearnLedger API Documentation Validation and Update Tool ===');
  console.log('This tool will help ensure that API documentation matches actual API responses.');
  console.log();
  
  const options = [
    { id: 1, name: 'Validate API endpoints against documentation', script: 'validate-api-docs.js' },
    { id: 2, name: 'Test error responses against documentation', script: 'validate-error-responses.js' },
    { id: 3, name: 'Update API documentation based on actual responses', script: 'update-api-docs.js' },
    { id: 4, name: 'Run all steps (validate, test errors, update)', script: null },
    { id: 5, name: 'Exit', script: null }
  ];
  
  // Make sure the scripts directory exists
  const scriptsDir = __dirname;
  
  // Check if all required scripts exist
  const requiredScripts = ['validate-api-docs.js', 'validate-error-responses.js', 'update-api-docs.js'];
  const missingScripts = requiredScripts.filter(script => !fs.existsSync(path.join(scriptsDir, script)));
  
  if (missingScripts.length > 0) {
    console.error('Error: The following required scripts are missing:');
    missingScripts.forEach(script => console.error(`- ${script}`));
    process.exit(1);
  }
  
  // Display menu
  console.log('Available options:');
  options.forEach(option => console.log(`${option.id}. ${option.name}`));
  console.log();
  
  // Get user selection
  const selection = await promptForNumber('Select an option: ', 1, options.length);
  const selectedOption = options.find(option => option.id === selection);
  
  if (selectedOption.id === 5) {
    console.log('Exiting...');
    rl.close();
    return;
  }
  
  if (selectedOption.id === 4) {
    // Run all steps
    console.log('Running all steps...');
    await runScript(path.join(scriptsDir, 'validate-api-docs.js'));
    await runScript(path.join(scriptsDir, 'validate-error-responses.js'));
    
    // Ask before updating
    const shouldUpdate = await promptYesNo('Do you want to update the API documentation based on the validation results? (y/n): ');
    if (shouldUpdate) {
      await runScript(path.join(scriptsDir, 'update-api-docs.js'));
    }
  } else if (selectedOption.script) {
    // Run single script
    await runScript(path.join(scriptsDir, selectedOption.script));
  }
  
  console.log('Done.');
  rl.close();
}

/**
 * Run a Node.js script
 */
async function runScript(scriptPath) {
  console.log(`Running ${path.basename(scriptPath)}...`);
  try {
    execSync(`node ${scriptPath}`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Error running ${path.basename(scriptPath)}:`, error.message);
    return false;
  }
}

/**
 * Prompt for a number within a range
 */
function promptForNumber(prompt, min, max) {
  return new Promise(resolve => {
    const promptUser = () => {
      rl.question(prompt, answer => {
        const num = parseInt(answer, 10);
        if (isNaN(num) || num < min || num > max) {
          console.log(`Please enter a number between ${min} and ${max}.`);
          promptUser();
        } else {
          resolve(num);
        }
      });
    };
    promptUser();
  });
}

/**
 * Prompt for a yes/no answer
 */
function promptYesNo(prompt) {
  return new Promise(resolve => {
    const promptUser = () => {
      rl.question(prompt, answer => {
        const normalized = answer.toLowerCase().trim();
        if (['y', 'yes'].includes(normalized)) {
          resolve(true);
        } else if (['n', 'no'].includes(normalized)) {
          resolve(false);
        } else {
          console.log('Please answer y or n.');
          promptUser();
        }
      });
    };
    promptUser();
  });
}

// Run the tool
validateAndUpdateApiDocs().catch(error => {
  console.error('Error:', error);
  rl.close();
}); 