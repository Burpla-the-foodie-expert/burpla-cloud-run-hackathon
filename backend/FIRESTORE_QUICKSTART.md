# Firestore Quick Start Guide

## 🚀 Quick Setup (Automated)

### Option 1: Run the Setup Script (Easiest)

```bash
./setup_firestore.sh
```

The script will:
1. ✅ Check for gcloud CLI
2. ✅ Create/select Google Cloud project
3. ✅ Enable Firestore API
4. ✅ Create Firestore database
5. ✅ Create service account
6. ✅ Download credentials
7. ✅ Update .env file
8. ✅ Install dependencies

**After the script completes:**
```bash
# Start your server
python main.py

# You should see:
# ✓ Using Firestore for session storage
# → Project: your-project-id
# → Collection: agent_sessions
```

---

## 🔧 Manual Setup

### Step 1: Install gcloud CLI

If you don't have it:
```bash
# macOS
brew install google-cloud-sdk

# Or download from:
# https://cloud.google.com/sdk/docs/install
```

### Step 2: Create Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login

# Create project
gcloud projects create burpla-agent-123

# Set as default
gcloud config set project burpla-agent-123

# Enable billing (required)
# Visit: https://console.cloud.google.com/billing
```

### Step 3: Enable Firestore

```bash
# Enable Firestore API
gcloud services enable firestore.googleapis.com

# Create Firestore database
gcloud firestore databases create --location=us-central1
```

### Step 4: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create burpla-agent \
    --display-name="Burpla Agent"

# Grant Firestore permissions
gcloud projects add-iam-policy-binding burpla-agent-123 \
    --member="serviceAccount:burpla-agent@burpla-agent-123.iam.gserviceaccount.com" \
    --role="roles/datastore.user"

# Download credentials
gcloud iam service-accounts keys create firestore-key.json \
    --iam-account=burpla-agent@burpla-agent-123.iam.gserviceaccount.com
```

### Step 5: Update .env

Edit your `.env` file:
```bash
USE_FIRESTORE=true
GOOGLE_CLOUD_PROJECT=burpla-agent-123
GOOGLE_APPLICATION_CREDENTIALS=./firestore-key.json
FIRESTORE_COLLECTION=agent_sessions
```

### Step 6: Install Dependencies

```bash
pip install google-cloud-firestore
```

### Step 7: Test

```bash
# Start server
python main.py

# Test with client
python test_client.py
```

---

## 🧪 Testing Persistence

### Test 1: Basic Conversation
```bash
# Terminal 1: Start server
python main.py

# Terminal 2: Test client
python test_client.py
> Find Italian restaurants in Houston
> (Wait for response)

# Ctrl+C to stop both

# Restart server
python main.py

# Restart client with SAME session
python test_client.py
> What did I ask before?
> (Should remember: "Italian restaurants")
```

### Test 2: API Endpoints

```bash
# Check storage info
curl http://localhost:8000/storage_info

# List sessions for user 1
curl http://localhost:8000/sessions/1

# Get session history
curl http://localhost:8000/session/test_session_abc/history?user_id=1

# Delete a session
curl -X DELETE http://localhost:8000/session/test_session_abc?user_id=1
```

### Test 3: Firestore Console

1. Go to: https://console.cloud.google.com/firestore
2. Select your project
3. Navigate to `agent_sessions` collection
4. You should see documents like: `burbla:1:session_abc`
5. Click to view conversation history

---

## 📊 Verify Setup

### Check if Firestore is enabled:
```bash
curl http://localhost:8000/storage_info
```

**Expected output:**
```json
{
  "storage_type": "firestore",
  "persistent": true,
  "project_id": "burpla-agent-123",
  "collection": "agent_sessions",
  "warning": null
}
```

### Check server logs:
```bash
python main.py
```

**You should see:**
```
✓ Using Firestore for session storage
  → Project: burpla-agent-123
  → Collection: agent_sessions
✓ API Key loaded: AIzaSyDaY...
✓ Server started successfully!
```

---

## 🔄 Switching Back to In-Memory

If you want to disable Firestore temporarily:

```bash
# Edit .env
USE_FIRESTORE=false

# Restart server
python main.py

# You'll see:
# ⚠️  Using InMemorySessionService (conversations will be lost on restart)
```

---

## 🐛 Troubleshooting

### Error: "Permission denied"
```bash
# Re-grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:burpla-agent@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/datastore.user"
```

### Error: "Project not found"
```bash
# Verify project ID
gcloud config get-value project

# List all projects
gcloud projects list
```

### Error: "Credentials file not found"
```bash
# Check file exists
ls firestore-key.json

# Verify path in .env
grep GOOGLE_APPLICATION_CREDENTIALS .env
```

### Error: "Firestore not enabled"
```bash
# Enable Firestore API
gcloud services enable firestore.googleapis.com
```

### Sessions not persisting
1. Check `USE_FIRESTORE=true` in .env
2. Verify GOOGLE_APPLICATION_CREDENTIALS path
3. Check server logs for errors
4. Test Firestore connection:
   ```python
   from google.cloud import firestore
   db = firestore.Client(project="your-project-id")
   print(db.collection("test").document("test").get())
   ```

---

## 💰 Cost Estimate

### Free Tier (should cover most testing):
- 50,000 document reads/day
- 20,000 document writes/day
- 1 GB storage
- 20,000 deletes/day

### Example Usage:
- **10 users, 20 messages/day each:**
  - Operations: 400 reads + 400 writes = 800 ops/day
  - Cost: **FREE** (within free tier)

- **100 users, 20 messages/day each:**
  - Operations: 4,000 reads + 4,000 writes = 8,000 ops/day
  - Cost: **FREE** (within free tier)

- **1,000 users, 20 messages/day:**
  - Operations: 40,000 reads + 40,000 writes = 80,000 ops/day
  - Cost: ~$0.15/day = **$5/month**

### Monitor Usage:
https://console.cloud.google.com/firestore/usage

---

## 🔐 Security Best Practices

### 1. Never commit credentials
```bash
# Add to .gitignore
echo "firestore-key.json" >> .gitignore
echo ".env" >> .gitignore
```

### 2. Set Firestore security rules

In Firebase Console → Firestore → Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /agent_sessions/{session} {
      // Only service account can read/write
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Use IAM roles in production

For Cloud Run/GCE:
```bash
# Use Workload Identity (no service account keys needed)
gcloud iam service-accounts add-iam-policy-binding \
    burpla-agent@PROJECT_ID.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:PROJECT_ID.svc.id.goog[default/burpla-agent]"
```

### 4. Rotate keys regularly
```bash
# Delete old keys
gcloud iam service-accounts keys list \
    --iam-account=burpla-agent@PROJECT_ID.iam.gserviceaccount.com

gcloud iam service-accounts keys delete KEY_ID \
    --iam-account=burpla-agent@PROJECT_ID.iam.gserviceaccount.com

# Create new key
gcloud iam service-accounts keys create firestore-key.json \
    --iam-account=burpla-agent@PROJECT_ID.iam.gserviceaccount.com
```

---

## 📚 Additional Resources

- [Google Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Google ADK Sessions Guide](https://google.github.io/adk-docs/sessions/)
- [Firestore Pricing](https://cloud.google.com/firestore/pricing)
- [ADK + Firestore Codelab](https://codelabs.developers.google.com/personal-expense-assistant-multimodal-adk)

---

## ✅ Checklist

Before going to production:

- [ ] Firestore setup complete
- [ ] Service account created with proper permissions
- [ ] Credentials secured (not in git)
- [ ] .env configured correctly
- [ ] Tested conversation persistence
- [ ] Firestore security rules set
- [ ] Monitoring enabled
- [ ] Backup strategy planned
- [ ] Cost alerts configured

---

## 🎉 Success!

Your Burpla agent now has persistent conversation storage with Google Firestore!

**Benefits:**
- ✅ Conversations survive server restarts
- ✅ Scales to multiple server instances
- ✅ Real-time synchronization
- ✅ Automatic backups
- ✅ Query conversation history
- ✅ Analytics-ready

**Next Steps:**
1. Test thoroughly with real conversations
2. Monitor usage in Firestore console
3. Set up alerts for quota limits
4. Deploy to production (Cloud Run recommended)

Need help? Check the main documentation:
- `ARCHITECTURE.md` - Architecture overview
- `IMPLEMENTATION_PLAN.md` - Detailed guide
- `CONVERSATION_STORAGE_SUMMARY.md` - Quick reference
