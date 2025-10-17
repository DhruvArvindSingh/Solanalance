# Profile Picture Upload to S3 - Complete Implementation

## Overview

Users can now upload their profile pictures directly from the edit profile page (`/profile/edit`). The images are stored in AWS S3 under the path `PROFILE_PIC/{userId}/` and automatically displayed across the application.

## Features Implemented

### 1. Profile Picture Upload
- **Location**: `/profile/edit`
- **File Types**: JPEG, PNG, GIF, WebP
- **Max Size**: 5 MB
- **Storage**: AWS S3 (`PROFILE_PIC/{userId}/`)

### 2. Automatic Retrieval on Login
- When user logs in, system checks S3 for profile picture
- If found, displays S3 URL instead of default avatar
- If not found, shows default avatar fallback

### 3. Profile Picture Display
- On profile pages: Shows uploaded picture or default fallback
- On navbar: Shows profile picture if available
- On job applicants page: Shows recruiter/freelancer profile pictures

## Backend Changes

### 1. S3 Upload Utilities (`http-backend/src/utils/s3Upload.ts`)

**New Functions:**

```typescript
// Upload profile picture to S3
export const uploadProfilePictureToS3 = async (userId: string, file: any): Promise<string>

// Get profile picture from S3
export const getProfilePictureFromS3 = async (userId: string): Promise<string | null>
```

**Features:**
- Validates file size (max 5 MB)
- Validates image MIME types
- Stores in S3 with path: `PROFILE_PIC/{userId}/{filename}`
- Returns public S3 URL
- Handles file deletion and lookup

### 2. Profile Route (`http-backend/src/routes/profile.ts`)

**New Endpoint:**
```
POST /api/profile/picture/upload
```

**Middleware:**
- Multer for file handling
- JWT authentication required
- File validation (type, size)

**Response:**
```json
{
  "message": "Profile picture uploaded successfully",
  "avatar_url": "https://s3.amazonaws.com/..."
}
```

**GET Endpoint Update:**
- Auto-fetches profile picture from S3 if not set in database
- Updates database with S3 URL for future requests

### 3. Auth Route (`http-backend/src/routes/auth.ts`)

**Updates to Login:**
```typescript
// Checks S3 for profile picture if not in database
const s3ProfilePic = await getProfilePictureFromS3(user.id);
if (s3ProfilePic) {
    avatarUrl = s3ProfilePic;
}
```

**Updates to ME Endpoint:**
- Returns profile picture URL from S3 if available

## Frontend Changes

### 1. Edit Profile Page (`frontend/src/pages/EditProfile.tsx`)

**New Components:**
- File input for profile picture upload
- Preview of selected image
- Upload button with progress indicator
- File size and type display

**New State:**
```typescript
const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
const [previewUrl, setPreviewUrl] = useState<string>("");
const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
```

**New Handlers:**
```typescript
// Handle file selection and validation
const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>)

// Upload file to S3
const handleUploadProfilePicture = async ()

// Remove selected file
const handleRemoveProfilePicture = ()
```

**UI Features:**
- Real-time file preview
- File validation messages
- Upload progress indicator
- File size display
- Option to use URL instead

## File Structure

### S3 Storage
```
s3://solanalance-uploads/
└── PROFILE_PIC/
    ├── user-id-1/
    │   ├── profile_1729099200000.jpg
    │   └── profile_1729099300000.png
    └── user-id-2/
        └── profile_1729099400000.png
```

### Database
```
Profile {
    id: UUID (User ID)
    avatarUrl: STRING (S3 URL or external URL)
    // ... other fields
}
```

## API Flow

### Upload Profile Picture
```
1. User selects file on /profile/edit
2. Frontend validates (type, size)
3. Shows preview
4. User clicks "Upload"
5. Frontend sends to /api/profile/picture/upload
6. Backend validates file
7. Backend uploads to S3
8. Backend updates database
9. Backend returns S3 URL
10. Frontend updates avatar display
```

### Retrieve Profile Picture
```
On Login:
1. User logs in
2. Backend checks Profile.avatarUrl
3. If empty, queries S3 for PROFILE_PIC/{userId}/*
4. Returns latest file URL
5. Updates database
6. Returns to frontend

On Profile Load:
1. User visits profile page
2. Frontend fetches profile data
3. If avatarUrl exists, displays
4. If not, shows default fallback
```

## Implementation Details

### File Validation

**Client-side (Frontend):**
```typescript
// File types
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Max size: 5 MB
const MAX_SIZE = 5 * 1024 * 1024;
```

**Server-side (Backend):**
```typescript
// Multer fileFilter
const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Multer limits
limits: { fileSize: 5 * 1024 * 1024 }
```

### S3 URL Generation

**Public URL Format:**
```
https://{bucket}.s3.{region}.amazonaws.com/{key}
```

**Example:**
```
https://solanalance-uploads.s3.us-east-1.amazonaws.com/PROFILE_PIC/user-123/profile_1729099200000.jpg
```

## Configuration

### Environment Variables

Required in `.env`:
```
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=solanalance-uploads
JWT_SECRET=your-jwt-secret
```

### S3 Bucket Configuration

1. **Bucket Policy**: Allow public read access for profile pictures
2. **CORS**: Configure for frontend domain
3. **Lifecycle**: Optional - delete old profile pictures after X days

## User Experience Flow

### First-time User
1. Sign up with wallet address
2. No profile picture set (uses default fallback)
3. Goes to `/profile/edit`
4. Uploads profile picture
5. Picture saved to S3 under `PROFILE_PIC/{userId}/`
6. Returns to profile and sees new picture

### Returning User
1. Logs in
2. Backend fetches profile picture from S3
3. Profile displays with user's picture
4. Can change picture anytime from `/profile/edit`

### Changing Profile Picture
1. Navigate to `/profile/edit`
2. Select new image file
3. Preview shows in avatar
4. Click "Upload" button
5. New picture replaces old one in S3
6. Database updates automatically

## Default Fallback

If no profile picture found:
```tsx
<AvatarFallback className="bg-gradient-solana text-background text-3xl font-bold">
    {fullName.charAt(0) || "?"}
</AvatarFallback>
```

Shows first letter of user's name in gradient background.

## Testing

### Test Scenarios

1. **Upload with Valid Image**
   - Select JPEG file (< 5 MB)
   - Preview shows
   - Upload succeeds
   - Profile picture updates

2. **Reject Invalid File**
   - Try to upload non-image file
   - Error toast appears
   - Upload prevented

3. **Reject Oversized File**
   - Try to upload image > 5 MB
   - Size error message
   - Upload prevented

4. **Profile Picture Persistence**
   - Upload picture
   - Logout
   - Login again
   - Profile picture still shows
   - Retrieved from S3

5. **Multiple Picture Updates**
   - Upload picture 1
   - Go back to edit
   - Upload picture 2
   - Picture 2 displays
   - Both files in S3 (latest returned)

### Manual Test Steps

1. **Navigate to edit profile:**
   ```
   http://localhost:8080/profile/edit
   ```

2. **Upload profile picture:**
   - Click file input
   - Select image (< 5 MB)
   - See preview in avatar
   - Click "Upload" button
   - See success message

3. **Verify in S3:**
   - Check bucket: `solanalance-uploads`
   - Navigate to: `PROFILE_PIC/{userId}/`
   - See uploaded file

4. **Verify on profile:**
   - Go to profile page
   - Picture displays
   - Logout

5. **Verify on login:**
   - Login
   - Profile picture displays immediately

## Troubleshooting

### Picture Not Uploading

**Check:**
1. AWS credentials in `.env`
2. File size < 5 MB
3. File is valid image format
4. S3 bucket permissions
5. Browser console for errors

### Picture Not Showing After Upload

**Check:**
1. Response includes `avatar_url`
2. S3 URL is accessible
3. Browser cache (hard refresh: Ctrl+Shift+R)
4. Database updated with URL
5. S3 bucket public read access

### Old Picture Still Showing

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Logout and login again
4. Check S3 file timestamps

### S3 Errors

**Common Issues:**
- `NoSuchBucket`: Bucket doesn't exist
- `AccessDenied`: AWS credentials invalid
- `InvalidBucketName`: Bucket name wrong in .env

**Solution:**
- Verify AWS credentials
- Check bucket name spelling
- Test AWS connection
- Check IAM permissions

## Security Considerations

1. **File Upload Security**
   - Validate MIME type on server
   - Validate file size
   - Check file extension matches MIME
   - Scan for malicious content (optional)

2. **S3 Access Control**
   - Public read access for profile pictures
   - Private write access (only via API)
   - Consider signed URLs for sensitive content

3. **User Privacy**
   - Profile pictures are public
   - No sensitive data in filenames
   - Old pictures remain in S3 (optional cleanup)

## Performance Optimization

1. **Image Compression**
   - Consider compressing before upload
   - Use CDN for S3 images
   - CloudFront distribution

2. **Caching**
   - Browser caches avatar URLs
   - Database caches S3 URL
   - Reduces S3 lookups

3. **File Management**
   - Latest picture returned from S3 (by date)
   - Old pictures not deleted automatically
   - Consider lifecycle policies

## Future Enhancements

1. **Image Cropping**
   - Allow users to crop/resize before upload
   - Mobile optimization

2. **Multiple Formats**
   - Generate thumbnails
   - Create different sizes for different uses
   - Progressive image loading

3. **Backup/Restore**
   - Keep multiple versions
   - Allow users to revert to old picture
   - Archive deleted pictures

4. **Advanced Validation**
   - Detect inappropriate images
   - Face detection verification
   - EXIF metadata stripping

5. **CDN Integration**
   - CloudFront for faster delivery
   - Geographic distribution
   - Reduced latency

## API Documentation

### Upload Profile Picture

**Endpoint:** `POST /api/profile/picture/upload`

**Authentication:** Required (JWT)

**Request:**
```
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body: {
    profilePicture: File (image/jpeg, image/png, image/gif, image/webp)
}
```

**Response (Success - 200):**
```json
{
    "message": "Profile picture uploaded successfully",
    "avatar_url": "https://s3.amazonaws.com/solanalance-uploads/PROFILE_PIC/{userId}/{filename}.jpg"
}
```

**Response (Error - 400/500):**
```json
{
    "error": "File size exceeds 5 MB limit"
}
```

### Get Profile Picture

**Endpoint:** `GET /api/profile/{id}`

**Response:**
```json
{
    "id": "user-id",
    "avatar_url": "https://s3.amazonaws.com/solanalance-uploads/PROFILE_PIC/{userId}/{filename}.jpg",
    "full_name": "John Doe",
    ...
}
```

## Files Modified

1. **Backend:**
   - `http-backend/src/utils/s3Upload.ts` - Added profile picture upload functions
   - `http-backend/src/routes/profile.ts` - Added upload endpoint, updated GET
   - `http-backend/src/routes/auth.ts` - Updated login and me endpoints

2. **Frontend:**
   - `frontend/src/pages/EditProfile.tsx` - Added file upload UI and handlers

## Related Files

- `http-backend/src/config/s3.ts` - S3 configuration
- `http-backend/src/middleware/auth.ts` - JWT authentication
- `frontend/src/hooks/useAuth.tsx` - Authentication state
- `frontend/src/components/Navbar.tsx` - Shows profile picture
- `frontend/src/pages/UserProfile.tsx` - Displays profile picture

---

**Status: ✅ Implemented and tested**
**Date: October 17, 2025**
