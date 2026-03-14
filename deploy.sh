#!/bin/bash
# deploy.sh — Deploy Toon World 3D to Google Cloud Run
#
# Prerequisites:
#   gcloud CLI installed and authenticated
#   gcloud auth login
#   gcloud config set project YOUR_PROJECT_ID
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh

set -e

# ── Config — edit these ───────────────────────────────────────────────────────
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
SERVICE_NAME="toon-world"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo ""
echo "  🚀 Deploying Toon World 3D to Cloud Run"
echo "  📦 Project:  ${PROJECT_ID}"
echo "  📍 Region:   ${REGION}"
echo "  🏷  Service:  ${SERVICE_NAME}"
echo ""

# ── Step 1: Build and push container image ────────────────────────────────────
echo "▶ Building and pushing Docker image..."
gcloud builds submit \
  --tag "${IMAGE}" \
  --project "${PROJECT_ID}"

# ── Step 2: Deploy to Cloud Run ───────────────────────────────────────────────
echo "▶ Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --project "${PROJECT_ID}"

# ── Step 3: Grant Vertex AI access to the service account ─────────────────────
# Cloud Run uses the Compute Engine default service account by default.
# We grant it the Vertex AI User role so it can call Gemini.
echo "▶ Granting Vertex AI User role to Cloud Run service account..."
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member "serviceAccount:${SERVICE_ACCOUNT}" \
  --role "roles/aiplatform.user" \
  --condition=None

echo ""
echo "  ✅ Deployment complete!"
echo ""
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" --format="value(status.url)")
echo "  🌐 Live at: ${SERVICE_URL}"
echo ""
