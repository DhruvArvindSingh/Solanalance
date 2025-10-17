# File Upload Setup Guide - SolanaLance

This guide explains how to set up AWS S3 for storing resume and cover letter PDFs in the job application system.

## Overview

The application now supports:
- Resume (PDF) upload - Optional
- Cover Letter (PDF) upload - Optional
- File size validation (max 10 MB)
- File type validation (PDF only)
- S3 storage with organized directory structure: `userId/jobId/fileType/fileName`

## Prerequisites

1. AWS Account with S3 access
2. Node.js and npm installed
3. Environment variables configured

## Step 1: Create AWS S3 Bucket

1. Go to [AWS S3 Console](https://console.aws.amazon.com/s3/)
2. Click "Create bucket"
3. Enter bucket name: `solanalance-uploads` (or your preferred name)
4. Select region: `us-east-1` (or your preferred region)
5. Keep default settings and create bucket
6. **Important**: Configure bucket CORS settings:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
    "AllowedOrigins": ["http://localhost:8080", "your-production-domain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## Step 2: Create IAM User for S3 Access

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → "Create user"
3. Enter username: `solanalance-app`
4. Click "Create user"
5. Go to the user's "Security credentials" tab
6. Create an "Access Key"
7. Download credentials CSV (save securely!)

## Step 3: Attach S3 Permissions

1. Go back to the IAM user
2. Click "Add permissions" → "Attach policies directly"
3. Search and select: `AmazonS3FullAccess` (for development; use more restrictive policy in production)
4. Save

## Step 4: Configure Environment Variables

Add the following to `http-backend/.env`:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID="your-access-key-id-from-step-2"
AWS_SECRET_ACCESS_KEY="your-secret-access-key-from-step-2"
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="solanalance-uploads"
```

## Step 5: Install Required Packages

Already done via npm:
```bash
npm install aws-sdk multer
```

## Step 6: Database Migration

The schema was already updated to include:
- `coverLetterFileUrl` - URL to cover letter PDF in S3
- `resumeFileUrl` - URL to resume PDF in S3

These are stored in the `applications` table.

## Frontend Usage

### Job Application Modal

Users can now:

1. **Write Cover Letter Text** (optional text field)
2. **Upload Resume PDF** (optional file upload, max 10 MB)
3. **Upload Cover Letter PDF** (optional file upload, max 10 MB)
4. **Enter Estimated Days** (required field)
5. **Add Portfolio Links** (optional)

### File Validation

- **File Type**: Only PDF files are accepted
- **File Size**: Maximum 10 MB per file
- **Error Handling**: Clear error messages if validation fails

### UI Features

- File upload inputs with drag-and-drop support
- File size display after selection
- Green checkmark indicating successful file selection
- Progress indication while uploading
- File size limit information

## Backend API

### Endpoint: POST `/applications`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body (FormData):**
```
jobId: string (UUID)
coverLetterText: string (optional)
estimatedCompletionDays: string (required, numeric)
portfolioUrls: string (optional, JSON array)
resume: File (optional, PDF only, max 10 MB)
coverLetter: File (optional, PDF only, max 10 MB)
```

**Response Success (201):**
```json
{
  "message": "Application submitted successfully",
  "application": {
    "id": "uuid",
    "jobId": "uuid",
    "status": "pending",
    "resumeFileUrl": "https://s3.amazonaws.com/...",
    "coverLetterFileUrl": "https://s3.amazonaws.com/...",
    "createdAt": "2025-10-16T..."
  }
}
```

**Response Error (400/500):**
```json
{
  "error": "File size exceeds 10 MB limit"
}
```

## S3 File Structure

Files are organized in S3 with the following structure:

```
solanalance-uploads/
├── userId-1/
│   ├── jobId-1/
│   │   ├── resume/
│   │   │   └── resume_1729099200000.pdf
│   │   └── cover_letter/
│   │       └── cover_letter_1729099200000.pdf
│   └── jobId-2/
│       ├── resume/
│       └── cover_letter/
└── userId-2/
    └── ...
```

## Production Considerations

1. **IAM Policy** - Use a more restrictive policy instead of `AmazonS3FullAccess`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::solanalance-uploads/*"
    }
  ]
}
```

2. **File Validation** - Add server-side magic byte validation for PDFs
3. **Virus Scanning** - Consider integrating with ClamAV or similar
4. **Retention Policy** - Set S3 lifecycle rules to delete old files after X days
5. **Backup** - Enable S3 versioning and cross-region replication
6. **Cost Management** - Monitor S3 usage and set up alerts

## Testing

### Manual Testing

1. Go to a job listing page
2. Click "Apply for Job"
3. Fill in the form:
   - Optional: Add cover letter text
   - Optional: Upload resume PDF (< 10 MB)
   - Optional: Upload cover letter PDF (< 10 MB)
   - Required: Enter estimated completion days
   - Optional: Add portfolio links
4. Click "Submit Application"
5. Verify success message
6. Check S3 bucket for uploaded files

### API Testing with cURL

```bash
curl -X POST http://localhost:3000/api/applications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "jobId=UUID" \
  -F "coverLetterText=Optional text" \
  -F "estimatedCompletionDays=30" \
  -F "resume=@/path/to/resume.pdf" \
  -F "coverLetter=@/path/to/cover_letter.pdf" \
  -F "portfolioUrls=[\"https://github.com/user\"]"
```

## Troubleshooting

### "Cannot find module 'aws-sdk'"
```bash
npm install aws-sdk --save
```

### "File size exceeds 10 MB"
- Check actual file size: `ls -lh /path/to/file.pdf`
- Ensure file is under 10 MB

### "Only PDF files are allowed"
- Verify file is actually a PDF
- Check MIME type: `file /path/to/file.pdf`

### S3 Upload Fails
- Verify AWS credentials in `.env`
- Check AWS IAM permissions
- Verify bucket name and region match
- Check bucket CORS settings
- Verify files are being sent as multipart/form-data

### Application doesn't save
- Check database connection
- Verify Prisma schema is up to date: `npx prisma db push`
- Check server logs for errors

## File URLs

Uploaded files are stored in S3 and accessible via URLs like:
```
https://solanalance-uploads.s3.us-east-1.amazonaws.com/userId/jobId/resume/resume_1729099200000.pdf
```

These URLs are stored in the `Application` record and can be retrieved for download.

## Security Notes

1. **Keep AWS credentials secure** - Never commit to version control
2. **Use IAM roles** - Consider using IAM roles instead of access keys in production
3. **Validate files** - Always validate file type and size on the backend
4. **Access control** - Implement proper authorization checks before allowing file access
5. **Encryption** - Consider enabling S3 encryption at rest
6. **Logging** - Enable S3 access logging for audit trails

## Next Steps

1. Configure AWS S3 bucket and IAM user
2. Add credentials to `.env` file
3. Restart backend server
4. Test file uploads through the UI
5. Monitor S3 usage and costs
6. Implement additional security measures as needed
