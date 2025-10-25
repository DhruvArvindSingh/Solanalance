# File Upload Backend Setup Guide

## Overview
Complete backend implementation for file uploads to AWS S3, allowing freelancers to attach files to milestone submissions.

## Changes Made

### 1. Backend Route (`/http-backend/src/routes/upload.ts`)

Created new upload route with:
- **Single file upload**: `POST /api/upload`
- **Multiple file upload**: `POST /api/upload/multiple`

#### Features:
- ✅ File validation (type, size)
- ✅ AWS S3 integration
- ✅ Unique filename generation
- ✅ Authentication required
- ✅ File type restrictions
- ✅ 10MB file size limit
- ✅ Maximum 5 files per upload

#### Supported File Types:
- Documents: PDF, DOC, DOCX, TXT
- Archives: ZIP
- Images: PNG, JPG, JPEG, GIF

### 2. Backend Index (`/http-backend/src/index.ts`)

- ✅ Imported upload routes
- ✅ Registered `/api/upload` endpoint

### 3. Package Dependencies (`/http-backend/package.json`)

Added:
- `@aws-sdk/client-s3`: ^3.621.0 (AWS SDK v3 for S3)
- `multer`: Already installed (file upload middleware)

### 4. Frontend API Client (`/frontend/src/lib/api-client.ts`)

Added upload methods:
```typescript
upload = {
    uploadFile: async (formData: FormData) => { ... },
    uploadMultiple: async (formData: FormData) => { ... }
}
```

### 5. Frontend ProjectWorkspace (`/frontend/src/pages/ProjectWorkspace.tsx`)

Updated `uploadFilesToS3` function to use real API endpoint instead of placeholder.

### 6. Environment Variables (`.env.example`)

Added AWS S3 configuration:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET=solana-lance-uploads
```

## Installation Steps

### 1. Install Dependencies

```bash
cd http-backend
npm install
```

This will install the new `@aws-sdk/client-s3` package.

### 2. Configure AWS S3

#### Option A: Create New S3 Bucket

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click "Create bucket"
3. Bucket name: `solana-lance-uploads` (or your choice)
4. Region: `us-east-1` (or your choice)
5. **Block Public Access**: Uncheck if you want files publicly accessible
6. Click "Create bucket"

#### Option B: Use Existing Bucket

Use your existing S3 bucket name in the environment variables.

### 3. Get AWS Credentials

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Create new user or use existing
3. Attach policy: `AmazonS3FullAccess` (or create custom policy)
4. Generate Access Key
5. Copy **Access Key ID** and **Secret Access Key**

### 4. Update Environment Variables

Create or update `/http-backend/.env`:

```env
# Existing variables
DATABASE_URL=postgresql://...
PORT=3000
JWT_SECRET=your-jwt-secret
NODE_ENV=development

# Add these for S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=solana-lance-uploads
```

### 5. Build and Restart Backend

```bash
cd http-backend
npm run build
npm start
```

## API Endpoints

### Upload Single File

```http
POST /api/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- file: <file>
- type: "milestone" | "profile" | "application" | "general"
```

**Response:**
```json
{
  "success": true,
  "url": "https://solana-lance-uploads.s3.us-east-1.amazonaws.com/milestone/user-id/1234567890-abc123.pdf",
  "fileName": "document.pdf",
  "size": 245678,
  "type": "application/pdf"
}
```

### Upload Multiple Files

```http
POST /api/upload/multiple
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- files[]: <file1>
- files[]: <file2>
- type: "milestone"
```

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "url": "https://...",
      "fileName": "file1.pdf",
      "size": 123456,
      "type": "application/pdf"
    },
    {
      "url": "https://...",
      "fileName": "file2.png",
      "size": 234567,
      "type": "image/png"
    }
  ]
}
```

## File Organization in S3

Files are organized by type and user:

```
s3://solana-lance-uploads/
├── milestone/
│   ├── user-id-1/
│   │   ├── 1698765432-abc123def456.pdf
│   │   └── 1698765433-xyz789ghi012.png
│   └── user-id-2/
│       └── 1698765434-mno345pqr678.docx
├── profile/
│   └── user-id-1/
│       └── 1698765435-avatar.jpg
└── application/
    └── user-id-1/
        └── 1698765436-resume.pdf
```

## Security Considerations

### 1. File Validation
- ✅ File type checking (MIME type)
- ✅ File size limit (10MB)
- ✅ Malicious filename prevention (random names)

### 2. Access Control
- ✅ Authentication required
- ✅ User ID in file path
- ⚠️ Consider adding virus scanning

### 3. S3 Bucket Permissions

**Option 1: Public Read (Simpler)**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::solana-lance-uploads/*"
    }
  ]
}
```

**Option 2: Private with Signed URLs (More Secure)**
- Keep bucket private
- Generate signed URLs for file access
- Requires additional implementation

## Testing

### Test File Upload

```bash
# Upload single file
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/file.pdf" \
  -F "type=milestone"

# Upload multiple files
curl -X POST http://localhost:3000/api/upload/multiple \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@/path/to/file1.pdf" \
  -F "files=@/path/to/file2.png" \
  -F "type=milestone"
```

### Test from Frontend

1. Navigate to project workspace
2. Select a milestone
3. Click "Choose Files"
4. Select 1-5 files (max 10MB each)
5. Fill in description
6. Click "Submit for Review"
7. Check browser console for upload progress
8. Verify files in S3 bucket

## Troubleshooting

### Error: "Access Denied"
- Check AWS credentials in `.env`
- Verify IAM user has S3 permissions
- Check bucket name is correct

### Error: "Invalid file type"
- Only allowed: PDF, DOC, DOCX, TXT, ZIP, PNG, JPG, GIF
- Check file MIME type

### Error: "File too large"
- Maximum 10MB per file
- Compress or split large files

### Files not appearing in S3
- Check AWS region matches `.env`
- Verify bucket exists
- Check IAM permissions

## Alternative Storage Options

If you don't want to use AWS S3:

### 1. Cloudflare R2 (S3-compatible)
- Change endpoint in upload.ts
- More affordable than S3

### 2. DigitalOcean Spaces (S3-compatible)
- Similar API to S3
- Simpler pricing

### 3. Local Storage (Development Only)
```typescript
// In upload.ts, replace S3 upload with:
const uploadDir = path.join(__dirname, '../../uploads');
fs.writeFileSync(path.join(uploadDir, fileName), req.file.buffer);
```

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Configure AWS S3 bucket
3. ✅ Add AWS credentials to `.env`
4. ✅ Build and restart backend
5. ⬜ Test file upload from frontend
6. ⬜ Add virus scanning (optional)
7. ⬜ Implement signed URLs for private files (optional)
8. ⬜ Add file deletion endpoint (optional)

## Production Checklist

- [ ] Use environment-specific S3 buckets (dev, staging, prod)
- [ ] Enable S3 versioning
- [ ] Set up S3 lifecycle policies (auto-delete old files)
- [ ] Add CloudFront CDN for faster file delivery
- [ ] Implement virus scanning (ClamAV, AWS GuardDuty)
- [ ] Add file compression for large uploads
- [ ] Monitor S3 costs and usage
- [ ] Set up S3 access logging
- [ ] Implement signed URLs for sensitive files
- [ ] Add file deletion when milestones are deleted

## Cost Estimation

AWS S3 Pricing (us-east-1):
- Storage: $0.023 per GB/month
- PUT requests: $0.005 per 1,000 requests
- GET requests: $0.0004 per 1,000 requests

Example: 1000 users, 5 files each, 2MB average
- Storage: 10GB = $0.23/month
- Uploads: 5000 files = $0.025
- Downloads: ~10,000 = $0.004
- **Total: ~$0.26/month**

Very affordable! 💰
