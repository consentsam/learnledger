# Vercel Deployment Guide

This guide explains how to deploy the ProjectLedger application to Vercel with proper SSL certificate configuration.

## Prerequisites

1. A Vercel account
2. Git repository for your project
3. CA Certificate for DigitalOcean PostgreSQL database

## Deployment Steps

### 1. Prepare the CA Certificate

The CA certificate has been placed in the `public/certs/` directory. This will ensure it's included in the deployment to Vercel.

### 2. Deploy to Vercel

You can deploy to Vercel in several ways:

#### Option 1: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI if you haven't already
npm i -g vercel

# Log in to Vercel if not already logged in
vercel login

# Deploy to production
vercel --prod
```

When prompted:
- Set up and deploy project? `Y`
- Select scope: Choose your account
- Link to existing project? If you've deployed before, select `Y` and choose the project
- Override settings? `N` (unless you need to change something)

#### Option 2: Using GitHub Integration

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Follow the Vercel deployment steps

### 3. Configure Environment Variables

Make sure to set these environment variables in the Vercel dashboard:

- `DATABASE_URL`: Your DigitalOcean PostgreSQL connection string
- Other environment variables as needed

You can set environment variables via the CLI:

```bash
vercel env add DATABASE_URL
```

Or through the Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the required variables

### 4. Verify Deployment

After deployment, check the function logs in Vercel to ensure:

1. The CA certificate is being found and loaded correctly
2. The database connection is successful

Look for these log messages:
```
✅ Successfully connected to DigitalOcean PostgreSQL database
✅ SSL configuration: Using CA certificate
```

You can view logs in the Vercel dashboard or via CLI:
```bash
vercel logs your-project-name.vercel.app
```

## Troubleshooting

If you encounter SSL/TLS issues:

1. Check that the certificate in `public/certs/` is accessible
2. Verify the certificate is valid and matches the DigitalOcean PostgreSQL server
3. If necessary, fall back to disabling certificate validation by setting `DISABLE_SSL_VALIDATION=true` in your environment variables

### Quick Fix for SSL Issues

If you continue to experience SSL certificate issues, you can bypass certificate validation as a temporary solution:

1. Add the environment variable in Vercel dashboard:
   - Name: `DISABLE_SSL_VALIDATION`
   - Value: `true`

2. Or via CLI:
   ```bash
   vercel env add DISABLE_SSL_VALIDATION production
   # Enter 'true' when prompted for the value
   ```

3. Redeploy your application:
   ```bash
   vercel --prod
   ``` 