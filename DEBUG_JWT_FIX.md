# JWT Malformed Error - Debug & Fix

## Problem
The backend was throwing `JsonWebTokenError: jwt malformed` errors when receiving requests from the frontend.

## Root Cause
The frontend had an **invalid or malformed JWT token** stored in `localStorage` that was being sent with API requests. This can happen when:
- Old/corrupted tokens from previous sessions
- Tokens that are not properly formatted (not 3 parts separated by dots)
- Tokens with value "undefined" or "null" as strings

## Fixes Applied

### 1. Backend - Enhanced Auth Middleware (`/http-backend/src/middleware/auth.ts`)
- ✅ Added token format validation before JWT verification
- ✅ Checks if token has exactly 3 parts (header.payload.signature)
- ✅ Filters out "undefined" and "null" string values
- ✅ Improved error logging with request path and token preview
- ✅ Returns proper 401 status for invalid token format

### 2. Frontend - API Client (`/frontend/src/lib/api-client.ts`)
- ✅ Validates token format before sending requests
- ✅ Automatically clears invalid tokens from localStorage
- ✅ Clears tokens on 401/403 responses
- ✅ Shows user-friendly error message prompting re-login

### 3. Debug Tool (`/frontend/public/clear-token.html`)
- ✅ Created a standalone HTML page to debug tokens
- ✅ Can view token details, validate format, and clear tokens
- ✅ Access at: `http://localhost:5173/clear-token.html`

## How to Use the Debug Tool

1. Open your browser to `http://localhost:5173/clear-token.html`
2. Click "Show Token" to see current token status
3. Click "Validate Token" to check if it's a valid JWT
4. Click "Clear Token" to remove invalid tokens
5. Login again to get a fresh token

## Prevention

The fixes ensure that:
1. Invalid tokens are caught early and never sent to the backend
2. Users are automatically logged out when tokens become invalid
3. Better error messages guide users to re-authenticate
4. Server logs show which endpoint received the bad token

## Testing

To verify the fix:
```bash
# 1. Start backend
cd http-backend
npm run build && npm start

# 2. Start frontend
cd frontend
npm run dev

# 3. If you see JWT errors, visit:
http://localhost:5173/clear-token.html

# 4. Clear the token and login again
```

## Next Steps

If JWT errors persist:
1. Check browser console for token validation warnings
2. Use the debug tool to inspect the token
3. Verify JWT_SECRET is consistent between sessions
4. Check if token expiration is set correctly in auth routes
