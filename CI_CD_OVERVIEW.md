# Overview: How Our Automated CI/CD Pipeline Works

This document provides a high-level overview of our automated deployment pipeline, explaining how a `git push` triggers a secure deployment to Google Cloud Run.

---

### The Goal

To automatically build and deploy our frontend (React) and backend (Python) applications whenever new code is pushed to the `main` branch.

---

### The Four Core Components & How They Connect

Our pipeline is built on four main pillars that work together in a sequence.

#### 1. The Blueprint: `Dockerfile`
- **What it is:** A set of instructions to package our application (either frontend or backend) into a standardized, portable container image.
- **How it connects:** This is the starting point. Without a `Dockerfile`, our application can't be containerized, and the rest of the pipeline has nothing to deploy.

#### 2. The Trigger & Conductor: `GitHub Actions`
- **What it is:** The automation engine. The `.github/workflows/*.yml` files are the "playbooks" that define what to do when something happens.
- **The Trigger:** The `on:` block in our workflow files tells GitHub to listen for a `push` to the `main` branch that affects either the `frontend-test/` or `backend/` directories. This event is the "spark" that starts everything.
- **How it connects:** When triggered, GitHub Actions starts a temporary virtual machine (a "Runner") and begins executing the steps in our playbook, acting as the conductor for the entire process.

#### 3. The Secure Handshake: `Workload Identity Federation (WIF)`
- **What it is:** The secure bridge between GitHub Actions and Google Cloud. It allows GitHub to prove its identity to Google without using any static passwords or secret keys.
- **How it connects:**
    1.  The GitHub Actions Runner presents a temporary, unique token (its "ID card") to Google Cloud.
    2.  Our WIF configuration in Google Cloud (the "security desk") checks this ID card. A crucial **Attribute Condition** ensures that only requests from our specific `Burpla-the-foodie-expert/...` repository are trusted.
    3.  If trusted, the Runner is then allowed to temporarily "impersonate" a pre-configured **Service Account** (`github-actions-deployer`). This Service Account holds all the necessary permissions (IAM Roles) to perform actions like building images and deploying services.
- **This entire step is handled by the `google-github-actions/auth` action in our workflow.**

#### 4. The Deployment: `Cloud Build` & `Cloud Run`
- **What it is:** The final execution phase on Google Cloud.
- **How it connects:**
    1.  Now securely authenticated, the GitHub Actions Runner executes `gcloud` commands.
    2.  **`gcloud builds submit`**: The Runner uploads our source code (from the `Dockerfile`'s context) to **Cloud Build**, which reads the `Dockerfile` and builds the container image in the cloud. The new image is then stored in **Artifact Registry**.
    3.  **`gcloud run deploy`**: The Runner tells **Cloud Run** to deploy a new revision of our service (e.g., `burpla-ui` or `burpla-api`), pulling the specific image we just built from Artifact Registry.
    4.  **Secrets**: For the backend, this deploy command also tells Cloud Run to fetch the `GOOGLE_API_KEY` from **Secret Manager** and inject it into the running container as an environment variable, making it available to our Python code.

---

### The Flow in Simple Terms

1.  You **push** new code to GitHub.
2.  **GitHub Actions** detects the push and starts its playbook.
3.  Actions uses **WIF** to securely prove its identity to Google Cloud and obtain temporary permissions.
4.  Actions commands **Cloud Build** to build a new container image from your code using the `Dockerfile`.
5.  Actions commands **Cloud Run** to deploy this new image, injecting any necessary secrets from **Secret Manager**.
6.  Your new version is live!
