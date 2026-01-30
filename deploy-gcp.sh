#!/bin/bash

# EmoCall V2 - Google Cloud Platform Deployment Script
# This script builds and deploys your app to Cloud Run

set -e  # Exit on any error

# Configuration - UPDATE THESE VALUES
PROJECT_ID="emocall-485414"  # Your GCP project ID
REGION="us-central1"
SERVICE_NAME="emocall-service"
IMAGE_NAME="gcr.io/${PROJECT_ID}/emocall-server"

# Cloud SQL connection
CLOUDSQL_CONNECTION="emocall-485414:us-central1:emocall-db"

# Environment variables - Update with your actual values
AGORA_APP_ID="421b8a3da45e45789e8bcbdcc8e98d69"
AGORA_APP_CERTIFICATE="ad36e8c0019d435e9a2c62ac882bddf8"

# Database URL - Update PASSWORD with your postgres password
# Format: postgresql://postgres:PASSWORD@localhost/emocall_prod?host=/cloudsql/PROJECT:REGION:INSTANCE
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD_HERE@localhost/emocall_prod?host=/cloudsql/${CLOUDSQL_CONNECTION}"

echo "=== EmoCall V2 - GCP Deployment ==="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Step 1: Build web client with production URL
echo "[1/4] Building web client..."
export EXPO_PUBLIC_DOMAIN="https://${SERVICE_NAME}-${REGION}.run.app"
npm run expo:static:build

# Step 2: Build and push Docker image
echo "[2/4] Building Docker image..."
gcloud builds submit --tag ${IMAGE_NAME} --project ${PROJECT_ID}

# Step 3: Deploy to Cloud Run
echo "[3/4] Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --add-cloudsql-instances="${CLOUDSQL_CONNECTION}" \
  --set-env-vars="NODE_ENV=production,AGORA_APP_ID=${AGORA_APP_ID},AGORA_APP_CERTIFICATE=${AGORA_APP_CERTIFICATE},DATABASE_URL=${DATABASE_URL}" \
  --project ${PROJECT_ID}

# Step 4: Get service URL
echo "[4/4] Deployment complete!"
echo ""
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)' --project ${PROJECT_ID})
echo "Your app is live at: ${SERVICE_URL}"
echo ""
echo "Next steps:"
echo "1. Update eas.json with the service URL"
echo "2. Rebuild mobile apps with: npx eas build"
