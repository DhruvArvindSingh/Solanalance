# Fixing 401 Unauthorized Error - Job Application Submissions

## Problem
When submitting a job application, the frontend receives a `401 Unauthorized` error:
```
POST http://localhost:3000/api/applications 401 (Unauthorized)
```

## Root Cause
The authentication token is not being sent in the request headers. This can happen for several reasons:
1. Token not stored in localStorage after login
2. Token retrieval not working properly
3. Headers not being set correctly for multipart/form-data requests
4. Backend authenticateToken middleware not extracting the token

## Solution

### Step 1: Verify Token is Being Saved After Login

**Check in Browser DevTools:**
1. Open Developer Tools (F12)
2. Go to "Application" → "Local Storage" → `http://localhost:8080`
3. Look for a key called `token`
4. Verify it has a valid JWT value (looks like: `eyJhbGci...`)

**If token is missing:**
- Sign out completely
- Clear browser cache/storage
- Sign in again with valid credentials
- Check console for errors

### Step 2: Verify API Client Token Handling

**Check in Console (F12 → Console tab):**

Before submitting an application, run:
```javascript
// Check if token is in localStorage
console.log('Token:', localStorage.getItem('token'));

// Check auth header
const token = localStorage.getItem('token');
console.log('Auth header:', token ? `Bearer ${token.substring(0, 30)}...` : 'No token');
```

### Step 3: Monitor Network Request

**Check in DevTools Network tab:**
1. Go to "Network" tab
2. Trigger "Apply for Job" submission
3. Find the `applications` POST request
4. Click on it
5. Go to "Request Headers" section
6. **VERIFY**: Authorization header is present with format: `Authorization: Bearer eyJhbGc...`

If Authorization header is missing, the issue is in the frontend API client.

### Step 4: Verify Backend is Recognizing the Token

**Enable Debug Logging:**

Edit `http-backend/src/middleware/auth.ts`:

```typescript
export const authenticateToken = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers['authorization'];
        console.log('Auth header received:', authHeader); // DEBUG
        const token = authHeader && authHeader.split(' ')[1];
        
        console.log('Extracted token:', token ? token.substring(0, 30) + '...' : 'None'); // DEBUG

        if (!token) {
            console.log('No token found - returning 401'); // DEBUG
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        console.log('Token verified, userId:', decoded.userId); // DEBUG

        // ... rest of code
    } catch (error) {
        console.error('Auth error:', error); // DEBUG
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};
```

Then check backend logs when submitting an application.

### Step 5: Test with cURL

If the above steps don't reveal the issue, test with a valid token:

```bash
# First, get a token by logging in
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"password"}'

# Response will include: "token": "eyJhbGci..."
# Copy the token value

# Now test applications endpoint with the token
curl -X POST http://localhost:3000/api/applications \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "jobId=UUID" \
  -F "estimatedCompletionDays=30"
```

If this works, the backend is fine - the issue is in the frontend.

## Common Fixes

### Fix 1: API Client Not Reading Fresh Token

**The Issue:** API client was caching token at initialization

**Already Fixed in:** `frontend/src/lib/api-client.ts`

The fix changed from:
```typescript
// OLD - caches token once
private token: string | null = null;
constructor() {
    this.token = localStorage.getItem('token');
}
```

To:
```typescript
// NEW - reads token dynamically
private getToken(): string | null {
    return localStorage.getItem('token');
}
```

### Fix 2: FormData Requests Not Including Headers

**The Issue:** Multipart/form-data requests weren't setting Authorization header

**Already Fixed in:** `frontend/src/lib/api-client.ts`

The request method now properly handles both JSON and FormData:
```typescript
const isFormData = options.body instanceof FormData;

const config: RequestInit = {
    headers: isFormData 
        ? {
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
          }
        : {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
          },
    ...options,
};
```

### Fix 3: Login Endpoint Not Saving Token

**Verify:** `frontend/src/pages/Auth.tsx` - handleSignIn function:

```typescript
const handleSignIn = async (e: React.FormEvent) => {
    // ...
    const { data, error } = await apiClient.auth.login({
        email,
        password,
    });
    
    if (error) throw new Error(error);
    
    // Token should be automatically saved by apiClient.auth.login
    // Verify in lib/api-client.ts auth.login endpoint:
    if (result.data?.token) {
        this.setToken(result.data.token); // This saves to localStorage
    }
};
```

## Debugging Checklist

- [ ] Backend server is running: `npm run start` in `http-backend` directory
- [ ] Frontend can reach backend: Test `curl http://localhost:3000/api/health` (or similar)
- [ ] User is logged in: Check localStorage for `token` key
- [ ] Token is valid: Try the cURL test above
- [ ] API client is calling `getToken()` dynamically, not caching
- [ ] Authorization header is in Network requests: Check DevTools → Network tab
- [ ] Backend extracting token correctly: Add console.log statements

## Quick Test

### 1. Log in first
```
Navigate to http://localhost:8080/auth
Enter valid credentials
Click Sign In
Should redirect to home page
```

### 2. Check localStorage
```javascript
// In browser console
localStorage.getItem('token')
// Should return a JWT string like: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Try applying for job
```
Go to a job listing
Click "Apply for Job"
Fill in the form
Click "Submit Application"
Should succeed without 401 error
```

### 4. If still getting 401
Check browser console (F12) for:
- `Token available: true/false`
- `Auth header will be sent: Bearer ...`

And check backend logs for:
- `Auth header received: Bearer ...`
- `Extracted token: ...`
- `Token verified, userId: ...`

## Environment Variables

Make sure these are set correctly in `http-backend/.env`:

```bash
JWT_SECRET="your-secret-key-change-in-production"
```

The same secret must be used for:
- Token generation in login endpoint
- Token verification in authenticateToken middleware

## If All Else Fails

### Hard Reset Approach:

1. **Clear Browser Cache:**
   - DevTools → Application → Clear site data
   - Or use incognito/private window

2. **Restart Servers:**
   ```bash
   # Kill backend
   pkill -f "node dist/index.js"
   
   # Kill frontend  
   pkill -f "vite"
   
   # Restart backend
   npm run start
   
   # Restart frontend
   cd ../frontend && npm run dev
   ```

3. **Clear localStorage programmatically:**
   In browser console:
   ```javascript
   localStorage.clear()
   location.reload()
   ```

4. **Test login again:**
   - Sign up with new account or use existing
   - Verify token is saved
   - Try applying for job

## Next Steps

1. Check all items in the debugging checklist
2. Review the Network tab to verify Authorization header
3. Add console.log statements to backend auth middleware
4. Test with cURL to isolate frontend vs backend issue
5. Review the fixes already applied to api-client.ts

The 401 error almost always means the Authorization header is missing. If you follow the debugging steps above, you'll find exactly where the issue is.
