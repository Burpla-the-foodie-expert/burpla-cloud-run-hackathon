#!/bin/bash

# Firestore Setup Script for Burpla Agent
# This script helps you set up Google Cloud Firestore for persistent conversation storage

set -e

echo "============================================"
echo "  Firestore Setup for Burpla Agent"
echo "============================================"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed."
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "✓ gcloud CLI found"
echo ""

# Get project ID
read -p "Enter your Google Cloud Project ID (or press Enter to create new): " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    read -p "Enter a new project ID (e.g., burpla-agent-12345): " PROJECT_ID
    if [ -z "$PROJECT_ID" ]; then
        echo "❌ Project ID is required"
        exit 1
    fi

    echo "Creating project: $PROJECT_ID"
    gcloud projects create $PROJECT_ID --set-as-default

    echo "⚠️  You may need to enable billing for this project"
    echo "Visit: https://console.cloud.google.com/billing/projects"
    read -p "Press Enter when billing is enabled..."
else
    echo "Using existing project: $PROJECT_ID"
    gcloud config set project $PROJECT_ID
fi

echo ""
echo "============================================"
echo "  Step 1: Enable Firestore API"
echo "============================================"
echo "Enabling Firestore API..."
gcloud services enable firestore.googleapis.com

echo ""
echo "============================================"
echo "  Step 2: Create Firestore Database"
echo "============================================"
echo "Select Firestore location:"
echo "  1) us-central1 (Iowa)"
echo "  2) us-east1 (South Carolina)"
echo "  3) us-west1 (Oregon)"
echo "  4) europe-west1 (Belgium)"
echo "  5) asia-northeast1 (Tokyo)"
read -p "Enter choice [1-5] (default: 1): " LOCATION_CHOICE

case $LOCATION_CHOICE in
    2) LOCATION="us-east1";;
    3) LOCATION="us-west1";;
    4) LOCATION="europe-west1";;
    5) LOCATION="asia-northeast1";;
    *) LOCATION="us-central1";;
esac

echo "Creating Firestore database in $LOCATION..."
gcloud firestore databases create --location=$LOCATION || echo "⚠️  Database may already exist"

echo ""
echo "============================================"
echo "  Step 3: Create Service Account"
echo "============================================"
SERVICE_ACCOUNT_NAME="burpla-agent"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Creating service account: $SERVICE_ACCOUNT_NAME"
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --display-name="Burpla Agent Service Account" \
    --description="Service account for Burpla agent to access Firestore" \
    || echo "⚠️  Service account may already exist"

echo ""
echo "============================================"
echo "  Step 4: Grant Firestore Permissions"
echo "============================================"
echo "Granting datastore.user role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/datastore.user" \
    --condition=None

echo ""
echo "============================================"
echo "  Step 5: Download Credentials"
echo "============================================"
KEY_FILE="firestore-key.json"

if [ -f "$KEY_FILE" ]; then
    read -p "⚠️  $KEY_FILE already exists. Overwrite? (y/n): " OVERWRITE
    if [ "$OVERWRITE" != "y" ]; then
        echo "Skipping key download"
        KEY_FILE=$(ls firestore-key*.json | head -1)
    else
        rm $KEY_FILE
        echo "Downloading new service account key..."
        gcloud iam service-accounts keys create $KEY_FILE \
            --iam-account=$SERVICE_ACCOUNT_EMAIL
    fi
else
    echo "Downloading service account key..."
    gcloud iam service-accounts keys create $KEY_FILE \
        --iam-account=$SERVICE_ACCOUNT_EMAIL
fi

echo ""
echo "============================================"
echo "  Step 6: Update .env File"
echo "============================================"

# Update .env file
if [ -f ".env" ]; then
    echo "Updating .env file..."

    # Update or add Firestore config
    if grep -q "USE_FIRESTORE=" .env; then
        sed -i.bak "s/USE_FIRESTORE=.*/USE_FIRESTORE=true/" .env
        sed -i.bak "s/GOOGLE_CLOUD_PROJECT=.*/GOOGLE_CLOUD_PROJECT=$PROJECT_ID/" .env
        sed -i.bak "s|GOOGLE_APPLICATION_CREDENTIALS=.*|GOOGLE_APPLICATION_CREDENTIALS=./$KEY_FILE|" .env
        rm .env.bak 2>/dev/null || true
    else
        echo "" >> .env
        echo "# Firestore Configuration" >> .env
        echo "USE_FIRESTORE=true" >> .env
        echo "GOOGLE_CLOUD_PROJECT=$PROJECT_ID" >> .env
        echo "GOOGLE_APPLICATION_CREDENTIALS=./$KEY_FILE" >> .env
        echo "FIRESTORE_COLLECTION=agent_sessions" >> .env
    fi

    echo "✓ .env file updated"
else
    echo "⚠️  .env file not found. Please create it manually with:"
    echo ""
    echo "USE_FIRESTORE=true"
    echo "GOOGLE_CLOUD_PROJECT=$PROJECT_ID"
    echo "GOOGLE_APPLICATION_CREDENTIALS=./$KEY_FILE"
    echo "FIRESTORE_COLLECTION=agent_sessions"
fi

echo ""
echo "============================================"
echo "  Step 7: Install Dependencies"
echo "============================================"
echo "Installing Python packages..."
pip install google-cloud-firestore

echo ""
echo "============================================"
echo "  ✅ Setup Complete!"
echo "============================================"
echo ""
echo "Configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  Location: $LOCATION"
echo "  Service Account: $SERVICE_ACCOUNT_EMAIL"
echo "  Credentials: $KEY_FILE"
echo ""
echo "Next Steps:"
echo "  1. Start your server: python main.py"
echo "  2. Test conversation persistence"
echo "  3. View sessions: http://localhost:8000/storage_info"
echo "  4. Check Firestore console:"
echo "     https://console.cloud.google.com/firestore/databases/-default-/data/panel?project=$PROJECT_ID"
echo ""
echo "To disable Firestore (revert to in-memory):"
echo "  Set USE_FIRESTORE=false in .env"
echo ""
echo "============================================"
