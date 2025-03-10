# API Documentation Validation and Update Tools

This directory contains scripts to validate API documentation against actual API responses and update the documentation accordingly.

## Overview

The tools in this directory help ensure that API documentation in the OpenAPI specification matches the actual behavior of the API. This is crucial for maintaining accurate and reliable documentation for API consumers.

## Prerequisites

- Node.js (v14 or higher recommended)
- npm

## Scripts

### Main script

- `validate-and-update-api-docs.js` - Interactive tool that guides you through the validation and update process

### Individual scripts

- `validate-api-docs.js` - Validates API endpoints against documentation by testing each endpoint and comparing the response with what's documented
- `validate-error-responses.js` - Tests error scenarios to ensure error responses match the documentation
- `update-api-docs.js` - Updates the OpenAPI specification based on actual API responses

## Installation

Make sure you have the required Node.js packages installed:

```bash
npm install
```

## Usage

1. Run the main script:

```bash
node scripts/validate-and-update-api-docs.js
```

2. Follow the interactive prompts to validate and update API documentation.

Alternatively, you can run individual scripts directly:

```bash
# Validate API endpoints
node scripts/validate-api-docs.js

# Test error responses
node scripts/validate-error-responses.js

# Update API documentation
node scripts/update-api-docs.js
```

## Reports

The scripts generate detailed reports:

- `api-validation-report.md` - Report of API endpoint validation
- `api-error-validation-report.md` - Report of error response validation
- `api-docs-update-report.md` - Report of updates made to the OpenAPI specification

## How It Works

1. **Validation Process**:
   - Reads the OpenAPI specification to identify endpoints and expected responses
   - Makes actual API calls to the endpoints
   - Compares the actual responses with what's documented
   - Generates a report of discrepancies

2. **Error Testing**:
   - Uses predefined test scenarios to trigger error responses
   - Compares the actual error responses with what's documented
   - Generates a report of discrepancies

3. **Update Process**:
   - Makes API calls to endpoints
   - Updates the OpenAPI specification to match the actual responses
   - Generates a report of changes made
   - Creates updated specification files

## Tips

- **Updating documentation**: After validation, review the reports before applying updates.
- **Error scenarios**: You can add custom error scenarios in `validate-error-responses.js`.
- **Custom endpoints**: Add custom endpoints to test in `update-api-docs.js`. 