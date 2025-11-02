# CI/CD Automation Setup for Burpla Project - Team Summary

Hey Team,

I've successfully set up a complete CI/CD pipeline for our project. Now, any push to the `main` branch will automatically build and deploy the latest version of our frontend and backend services to Google Cloud Run.

Here are the key points of the new setup:

---

### **1. Core Technology**
- **Automation:** GitHub Actions
- **Containerization:** Docker
- **Hosting:** Google Cloud Run
- **Image Storage:** Google Artifact Registry
- **Secret Management:** Google Secret Manager
- **Authentication:** Google Workload Identity Federation (for secure, keyless access)

---

### **2. Two Independent Pipelines**

We have two separate workflows to allow independent deployments:

**A. Frontend (`burpla-ui` Service):**
- **Trigger:** Activates on any push to the `main` branch that modifies the `frontend-test/` directory.
- **Process:**
    1.  Builds the React app using a multi-stage Dockerfile (Node.js for building, Nginx for serving).
    2.  Pushes the container image to Artifact Registry.
    3.  Deploys the new image to our `burpla-ui` service on Cloud Run.

**B. Backend (`burpla-api` Service):**
- **Trigger:** Activates on any push to `main` that modifies the `backend/` directory.
- **Process:**
    1.  Builds the Python/FastAPI app using its Dockerfile.
    2.  The container is configured to dynamically listen on the `$PORT` environment variable provided by Cloud Run.
    3.  Pushes the container image to Artifact Registry.
    4.  Deploys the new image to our `burpla-api` service on Cloud Run.

---

### **3. Security & Secrets Management**

This was the most critical part of the setup:

- **Keyless Authentication:** We are **not** using any long-lived service account keys. Authentication between GitHub Actions and Google Cloud is handled by **Workload Identity Federation (WIF)**, which is the industry best practice for security.
- **Dedicated Service Account:** A specific service account (`github-actions-deployer`) has been created with the minimum required IAM roles to perform deployments (Cloud Run Admin, Cloud Build Editor, Storage Admin, etc.).
- **Repo-Specific Trust:** The WIF provider is configured with an **Attribute Condition** that strictly allows access **only** from our `Burpla-the-foodie-expert/burpla-cloud-run-hackathon` repository.
- **Backend API Key:** The `GOOGLE_API_KEY` required by our backend is stored securely in **Google Secret Manager**. The GitHub Actions workflow injects this key as an environment variable into the Cloud Run service during deployment, so it's never exposed in our code or logs.

---

This setup makes our development process much faster and more reliable. Let me know if you have any questions!
