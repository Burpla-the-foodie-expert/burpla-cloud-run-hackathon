# Fix: redirect_uri_mismatch Error

## Problem
You're seeing `Error 400: redirect_uri_mismatch` when trying to sign in with Google.

## Solution

This error means the redirect URI in your request doesn't match what's configured in Google Cloud Console.

### Step 1: Check Your Current Redirect URI

NextAuth automatically uses: `{NEXTAUTH_URL}/api/auth/callback/google`

For local development, this should be:
```
http://localhost:3000/api/auth/callback/google
```

### Step 2: Verify NEXTAUTH_URL

Make sure your `.env.local` file has:
```bash
NEXTAUTH_URL=http://localhost:3000
```

**Important:**
- No trailing slash
- Use `http://` (not `https://`) for local development
- Must match exactly what you put in Google Cloud Console

### Step 3: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, make sure you have EXACTLY:
   ```
   http://localhost:3000/api/auth/callback/google
   ```

**Critical Points:**
- ✅ Must be exactly: `http://localhost:3000/api/auth/callback/google`
- ❌ NOT: `http://localhost:3000/api/auth/callback/google/` (no trailing slash)
- ❌ NOT: `https://localhost:3000/api/auth/callback/google` (wrong protocol)
- ❌ NOT: `localhost:3000/api/auth/callback/google` (missing protocol)

### Step 4: Restart Your Server

After making changes:
1. Stop your Next.js dev server (Ctrl+C)
2. Restart it: `npm run dev`
3. Try signing in again

### Step 5: Verify the Redirect URI

You can check what redirect URI NextAuth is using by:
1. Opening browser DevTools (F12)
2. Going to Network tab
3. Clicking "Sign in with Google"
4. Looking at the redirect URL in the Google OAuth request

The redirect_uri parameter should be: `http://localhost:3000/api/auth/callback/google`

### Common Issues

1. **Trailing Slash**: Google is very strict - no trailing slashes allowed
2. **Protocol Mismatch**: Must use `http://` for localhost, not `https://`
3. **Port Mismatch**: Make sure the port (3000) matches your Next.js server
4. **Case Sensitivity**: URLs are case-sensitive
5. **Multiple Entries**: If you have multiple redirect URIs, make sure the exact one is listed

### For Production

When deploying to production, add your production redirect URI:
```
https://your-domain.com/api/auth/callback/google
```

And update `NEXTAUTH_URL` in your production environment:
```bash
NEXTAUTH_URL=https://your-domain.com
```

