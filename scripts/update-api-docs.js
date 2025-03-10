// update-api-docs.js
// This script updates the OpenAPI specification based on actual API responses

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const API_BASE_URL = 'https://learn-ledger-api.vercel.app/api';
const OPENAPI_SPEC_PATH = path.join(__dirname, '../project-ledger-docs/static/openapi.json');
const UPDATED_SPEC_PATH = path.join(__dirname, '../project-ledger-docs/static/openapi-updated.json');
const API_DOCS_PATH = path.join(__dirname, '../project-ledger-docs/static/api-spec.json');
const DOCS_DIR = path.join(__dirname, '../app/api-docs');

/**
 * Main function to update API documentation
 */
async function updateApiDocs() {
  console.log('Starting API documentation update...');
  console.log(`Using OpenAPI spec: ${OPENAPI_SPEC_PATH}`);
  
  // Read the OpenAPI specification
  const openApiSpec = JSON.parse(fs.readFileSync(OPENAPI_SPEC_PATH, 'utf8'));
  
  // Create a copy for updates
  const updatedSpec = JSON.parse(JSON.stringify(openApiSpec));
  
  // Process endpoints
  const endpoints = [
    {
      path: '/register',
      method: 'post',
      testParams: {
        body: {
          walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f66e",
          role: "freelancer",
          freelancerName: "Test User",
          skills: ["JavaScript", "React", "Web3"]
        }
      }
    },
    {
      path: '/userProfile',
      method: 'get',
      testParams: {
        query: {
          wallet: "0x742d35Cc6634C0532925a3b844Bc454e4438f88e",
          role: "company"
        }
      }
    },
    {
      path: '/projects',
      method: 'get'
    }
    // Add more endpoints as needed
  ];
  
  // Record of updates made
  const updates = [];
  
  // Test each endpoint and update the OpenAPI spec
  for (const endpoint of endpoints) {
    console.log(`Processing ${endpoint.method.toUpperCase()} ${endpoint.path}...`);
    
    try {
      // Test the endpoint
      const response = await testEndpoint(endpoint);
      
      // Update the OpenAPI spec with the actual response
      const updated = updateEndpointSpec(updatedSpec, endpoint.path, endpoint.method, response);
      
      if (updated) {
        updates.push(`Updated ${endpoint.method.toUpperCase()} ${endpoint.path}`);
      }
    } catch (error) {
      console.error(`Error processing ${endpoint.method.toUpperCase()} ${endpoint.path}:`, error.message);
    }
  }
  
  // Write the updated spec to a new file
  fs.writeFileSync(UPDATED_SPEC_PATH, JSON.stringify(updatedSpec, null, 2));
  console.log(`Updated OpenAPI spec written to: ${UPDATED_SPEC_PATH}`);
  
  // Copy to API docs directory
  fs.writeFileSync(path.join(DOCS_DIR, 'openapi.json'), JSON.stringify(updatedSpec, null, 2));
  console.log(`Updated OpenAPI spec copied to: ${path.join(DOCS_DIR, 'openapi.json')}`);
  
  // Copy to API docs static directory
  fs.writeFileSync(API_DOCS_PATH, JSON.stringify(updatedSpec, null, 2));
  console.log(`Updated OpenAPI spec copied to: ${API_DOCS_PATH}`);
  
  // Generate a report of updates
  generateUpdateReport(updates);
}

/**
 * Test an endpoint and return the response
 */
async function testEndpoint(endpoint) {
  const url = `${API_BASE_URL}${endpoint.path}`;
  
  // Build curl command
  let command = `curl -X '${endpoint.method.toUpperCase()}' `;
  command += `'${url}' `;
  command += `-H 'accept: application/json' `;
  
  // Add query parameters
  if (endpoint.testParams?.query) {
    const queryParams = Object.entries(endpoint.testParams.query)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    command = command.replace(`'${url}'`, `'${url}?${queryParams}'`);
  }
  
  // Add request body
  if (endpoint.testParams?.body && ['POST', 'PUT', 'PATCH'].includes(endpoint.method.toUpperCase())) {
    command += `-H 'Content-Type: application/json' `;
    command += `-d '${JSON.stringify(endpoint.testParams.body)}'`;
  }
  
  // Execute curl command
  console.log(`Executing: ${command}`);
  try {
    const response = execSync(command).toString();
    return JSON.parse(response);
  } catch (error) {
    console.error('Error executing curl command:', error.message);
    
    // Try to parse the response even if curl returns non-zero
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout.toString());
      } catch (parseError) {
        console.error('Failed to parse error response');
      }
    }
    
    throw error;
  }
}

/**
 * Update the OpenAPI spec for an endpoint based on the actual response
 */
function updateEndpointSpec(openApiSpec, path, method, actualResponse) {
  const pathObject = openApiSpec.paths[path];
  if (!pathObject) {
    console.warn(`Path ${path} not found in OpenAPI spec`);
    return false;
  }
  
  const methodObject = pathObject[method];
  if (!methodObject) {
    console.warn(`Method ${method} not found for path ${path}`);
    return false;
  }
  
  // Get the success response
  const successResponse = methodObject.responses['200'];
  if (!successResponse || !successResponse.content || !successResponse.content['application/json']) {
    console.warn(`Success response not properly defined for ${method} ${path}`);
    return false;
  }
  
  // Update the response example
  if (!successResponse.content['application/json'].examples) {
    successResponse.content['application/json'].examples = {};
  }
  
  successResponse.content['application/json'].examples.actual = {
    value: actualResponse
  };
  
  // Update the schema based on actual response
  const schema = successResponse.content['application/json'].schema;
  if (schema) {
    updateSchema(schema, actualResponse, openApiSpec);
  }
  
  return true;
}

/**
 * Update a schema based on an actual response
 */
function updateSchema(schema, actualResponse, openApiSpec) {
  // Handle $ref
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/', '').split('/');
    let refSchema = openApiSpec;
    for (const part of refPath) {
      refSchema = refSchema[part];
    }
    updateSchema(refSchema, actualResponse, openApiSpec);
    return;
  }
  
  // Handle oneOf
  if (schema.oneOf) {
    // For oneOf, we need to figure out which schema matches the response
    for (const subSchema of schema.oneOf) {
      if (schemaMatches(subSchema, actualResponse, openApiSpec)) {
        updateSchema(subSchema, actualResponse, openApiSpec);
        break;
      }
    }
    return;
  }
  
  // Handle different types
  switch (schema.type) {
    case 'object':
      if (typeof actualResponse !== 'object' || actualResponse === null) {
        return;
      }
      
      // Update properties based on actual response
      if (!schema.properties) {
        schema.properties = {};
      }
      
      // Add properties from actual response that aren't in the schema
      for (const [key, value] of Object.entries(actualResponse)) {
        if (!schema.properties[key]) {
          schema.properties[key] = createSchemaForValue(value);
        } else {
          // Update existing property schema
          updateSchema(schema.properties[key], value, openApiSpec);
        }
      }
      
      // Update example
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (actualResponse[key] !== undefined) {
          propSchema.example = actualResponse[key];
        }
      }
      
      break;
      
    case 'array':
      if (!Array.isArray(actualResponse) || actualResponse.length === 0) {
        return;
      }
      
      // Update items schema based on the first item
      if (!schema.items) {
        schema.items = createSchemaForValue(actualResponse[0]);
      } else {
        updateSchema(schema.items, actualResponse[0], openApiSpec);
      }
      
      break;
      
    default:
      // For primitive types, update the example
      schema.example = actualResponse;
      break;
  }
}

/**
 * Check if a schema matches a value
 */
function schemaMatches(schema, value, openApiSpec) {
  // Handle $ref
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/', '').split('/');
    let refSchema = openApiSpec;
    for (const part of refPath) {
      refSchema = refSchema[part];
    }
    return schemaMatches(refSchema, value, openApiSpec);
  }
  
  // Check type match
  switch (schema.type) {
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
      
    case 'array':
      return Array.isArray(value);
      
    case 'string':
      return typeof value === 'string';
      
    case 'number':
    case 'integer':
      return typeof value === 'number';
      
    case 'boolean':
      return typeof value === 'boolean';
      
    case 'null':
      return value === null;
      
    default:
      return false;
  }
}

/**
 * Create a schema for a value
 */
function createSchemaForValue(value) {
  if (value === null) {
    return { type: 'null' };
  }
  
  if (Array.isArray(value)) {
    return {
      type: 'array',
      items: value.length > 0 ? createSchemaForValue(value[0]) : {}
    };
  }
  
  switch (typeof value) {
    case 'string':
      // Try to detect format
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        return {
          type: 'string',
          format: 'uuid',
          example: value
        };
      }
      
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value)) {
        return {
          type: 'string',
          format: 'date-time',
          example: value
        };
      }
      
      if (/^https?:\/\//.test(value)) {
        return {
          type: 'string',
          format: 'uri',
          example: value
        };
      }
      
      return {
        type: 'string',
        example: value
      };
      
    case 'number':
      return {
        type: Number.isInteger(value) ? 'integer' : 'number',
        example: value
      };
      
    case 'boolean':
      return {
        type: 'boolean',
        example: value
      };
      
    case 'object':
      const schema = {
        type: 'object',
        properties: {}
      };
      
      for (const [key, propValue] of Object.entries(value)) {
        schema.properties[key] = createSchemaForValue(propValue);
      }
      
      return schema;
      
    default:
      return {};
  }
}

/**
 * Generate a report of updates made
 */
function generateUpdateReport(updates) {
  const reportPath = path.join(__dirname, '../api-docs-update-report.md');
  
  let report = `# API Documentation Update Report\n\n`;
  report += `Generated on: ${new Date().toLocaleString()}\n\n`;
  
  if (updates.length === 0) {
    report += `No updates were made to the OpenAPI specification.\n`;
  } else {
    report += `## Updates Made\n\n`;
    
    for (const update of updates) {
      report += `- ${update}\n`;
    }
  }
  
  fs.writeFileSync(reportPath, report);
  console.log(`Update report generated at: ${reportPath}`);
}

// Run the update
updateApiDocs().catch(error => {
  console.error('Update failed:', error);
}); 