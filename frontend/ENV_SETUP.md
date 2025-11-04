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

