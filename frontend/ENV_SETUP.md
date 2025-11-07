# Environment Setup

## Backend API Configuration

The frontend communicates with the Python backend API. By default, it expects the backend to be running on `http://localhost:8000`.

### Setting Custom Backend URL

If your backend is running on a different URL, create a `.env.local` file in the `frontend` directory:

```bash
# frontend/.env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

For production, set this to your deployed backend URL:
```bash
NEXT_PUBLIC_BACKEND_URL=https://your-backend-api.com
```

### Important Notes

1. **Environment variables must be prefixed with `NEXT_PUBLIC_`** to be available in the browser
2. **Restart your Next.js dev server** after adding or changing environment variables
3. The default backend URL is `http://localhost:8000` if no environment variable is set

### Verifying Configuration

You can check which backend URL is being used by:
1. Opening the browser console
2. Sending a message to @burpla
3. Looking for the log message: `[GroupChat] Calling backend API: ...`

If you see `http://localhost:3000/api/sent`, the environment variable is not being read correctly. Make sure:
- The `.env.local` file is in the `frontend` directory
- The variable is named `NEXT_PUBLIC_BACKEND_URL` (not `BACKEND_URL`)
- You've restarted the Next.js dev server after creating/modifying `.env.local`

## Authentication (Google OAuth)

To enable Google login/logout functionality, you need to set up Google OAuth credentials:

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (or Google Identity API)
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Configure the OAuth consent screen (if not already done):
   - Choose "External" user type (unless you have a Google Workspace)
   - Fill in app name, user support email, and developer contact
   - Add scopes: `email`, `profile`, `openid`
6. Create OAuth 2.0 Client ID for "Web application"
7. **IMPORTANT:** Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://your-domain.com/api/auth/callback/google`

### Step 2: Configure Environment Variables

Create a `.env.local` file in the `frontend` directory with:

```bash
# Google OAuth (required for Google sign-in)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# NextAuth Configuration (required)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_string_here
```

Generate a random secret using:
```bash
openssl rand -base64 32
```

**Note:** These environment variables do NOT need the `NEXT_PUBLIC_` prefix as they are only used server-side for authentication.

### Step 3: Verify Configuration

After setting up the environment variables:

1. **Restart your Next.js dev server** (required for env vars to load)
2. Check the console for warnings:
   - If you see warnings about missing credentials, check your `.env.local` file
   - Make sure the file is in the `frontend` directory (not the root)
3. Test Google sign-in:
   - Click "Sign in with Google" button
   - You should be redirected to Google's sign-in page
   - After signing in, you should return to the welcome screen

### Troubleshooting

If you're redirected to `/api/auth/error`:

1. **Check environment variables:**
   - Verify all 4 variables are set in `.env.local`
   - Make sure you've restarted the dev server after adding them

2. **Check Google Cloud Console:**
   - Verify the redirect URI matches exactly: `http://localhost:3000/api/auth/callback/google`
   - Make sure there are no extra spaces or typos
   - The URI must match exactly (including http vs https, trailing slashes, etc.)

3. **Check NEXTAUTH_SECRET:**
   - Must be a random string (use `openssl rand -base64 32`)
   - Should be at least 32 characters long

4. **Check NEXTAUTH_URL:**
   - For local development: `http://localhost:3000`
   - For production: your full domain URL (e.g., `https://your-app.com`)

5. **Check browser console:**
   - Look for any error messages
   - Check the Network tab for failed requests

The custom error page at `/auth/error` will display helpful error messages if authentication fails.

