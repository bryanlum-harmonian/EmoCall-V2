# EmoCall V2 - Google Cloud Platform Deployment Guide

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed: https://cloud.google.com/sdk/docs/install
3. **Docker** installed (for local testing)

## Setup

### 1. Create GCP Project

```bash
gcloud projects create emocall-prod --name="EmoCall Production"
gcloud config set project emocall-prod
```

### 2. Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
```

### 3. Create Cloud SQL Database

```bash
# Create PostgreSQL instance
gcloud sql instances create emocall-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create emocall_prod --instance=emocall-db

# Set root password
gcloud sql users set-password postgres \
  --instance=emocall-db \
  --password=YOUR_SECURE_PASSWORD

# Get connection name (you'll need this for deployment)
gcloud sql instances describe emocall-db --format="value(connectionName)"
```

### 4. Update Configuration

Edit `deploy-gcp.sh` and update:
- `PROJECT_ID` - your GCP project ID
- `CLOUDSQL_CONNECTION` - from step 3
- `DATABASE_URL` - update with your database password
- `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE`

### 5. Run Database Migrations

```bash
# Connect to Cloud SQL and run migrations
npm run db:push
```

## Deployment

### Option A: Using the Script (Recommended)

```bash
chmod +x deploy-gcp.sh
./deploy-gcp.sh
```

### Option B: Manual Deployment

```bash
# 1. Set project
gcloud config set project YOUR_PROJECT_ID

# 2. Build web client
export EXPO_PUBLIC_DOMAIN="https://your-service-url.run.app"
npm run expo:static:build

# 3. Build and push Docker image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/emocall-server

# 4. Deploy to Cloud Run
gcloud run deploy emocall-service \
  --image gcr.io/YOUR_PROJECT_ID/emocall-server \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances="PROJECT:REGION:INSTANCE" \
  --set-env-vars="NODE_ENV=production,AGORA_APP_ID=...,DATABASE_URL=..."
```

## Post-Deployment

### 1. Update Mobile App Configuration

Update `eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_DOMAIN": "https://your-service-url.run.app"
      }
    }
  }
}
```

### 2. Rebuild Mobile Apps

```bash
npx eas build --platform all --profile production
```

### 3. Set up Custom Domain (Optional)

```bash
gcloud run domain-mappings create \
  --service emocall-service \
  --domain app.emocall.com \
  --region us-central1
```

## Environment Variables

The following environment variables are required:

- `NODE_ENV` - Set to "production"
- `DATABASE_URL` - PostgreSQL connection string
- `AGORA_APP_ID` - From Agora console
- `AGORA_APP_CERTIFICATE` - From Agora console
- `ALLOWED_ORIGINS` - Comma-separated allowed origins (optional)

## Monitoring

View logs:
```bash
gcloud run services logs read emocall-service --region us-central1
```

View metrics:
```bash
gcloud run services describe emocall-service --region us-central1
```

## Cost Optimization

- **Cloud Run**: Pay per request (free tier: 2M requests/month)
- **Cloud SQL**: Use `db-f1-micro` for dev ($7/month), scale up for production
- **Container Registry**: ~$0.10/GB storage

## Troubleshooting

### Database Connection Issues

Ensure:
1. Cloud SQL connection name is correct
2. Database URL uses Unix socket: `/cloudsql/PROJECT:REGION:INSTANCE`
3. Cloud Run service has Cloud SQL instance attached

### CORS Issues

Add your domain to `ALLOWED_ORIGINS`:
```bash
gcloud run services update emocall-service \
  --update-env-vars ALLOWED_ORIGINS="https://app.emocall.com,https://emocall-service.run.app"
```

### Build Failures

Check build logs:
```bash
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

## Rollback

```bash
# List revisions
gcloud run revisions list --service emocall-service --region us-central1

# Rollback to previous revision
gcloud run services update-traffic emocall-service \
  --to-revisions REVISION_NAME=100 \
  --region us-central1
```
