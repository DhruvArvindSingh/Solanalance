# Quick Start: File Upload Setup

## 🚀 3-Step Setup

### Step 1: Create S3 Bucket (5 minutes)

1. Go to https://s3.console.aws.amazon.com/
2. Click **"Create bucket"**
3. Bucket name: `solana-lance-uploads`
4. Region: `us-east-1`
5. Click **"Create bucket"**

### Step 2: Get AWS Credentials (5 minutes)

1. Go to https://console.aws.amazon.com/iam/
2. Click **"Users"** → **"Create user"**
3. Username: `solana-lance-uploader`
4. Click **"Next"**
5. Attach policy: **"AmazonS3FullAccess"**
6. Click **"Create user"**
7. Click on the user → **"Security credentials"**
8. Click **"Create access key"**
9. Choose **"Application running outside AWS"**
10. Copy **Access Key ID** and **Secret Access Key**

### Step 3: Update .env File (1 minute)

Edit `/http-backend/.env` and add:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=PASTE_YOUR_ACCESS_KEY_HERE
AWS_SECRET_ACCESS_KEY=PASTE_YOUR_SECRET_KEY_HERE
AWS_S3_BUCKET=solana-lance-uploads
```

**That's it!** 🎉

## ✅ Test It

1. Restart backend: `cd http-backend && npm start`
2. Open frontend: http://localhost:8080
3. Go to any project workspace
4. Select a milestone
5. Click "Choose Files"
6. Upload a file
7. Click "Submit for Review"

Files will upload to S3! ✨

## 🆘 Troubleshooting

**Error: "Access Denied"**
- Check AWS credentials in `.env`
- Verify IAM user has S3 permissions

**Error: "Bucket not found"**
- Check bucket name matches `.env`
- Verify bucket exists in correct region

**Files not uploading**
- Check browser console for errors
- Verify backend is running
- Check file size (max 10MB)

## 📚 Full Documentation

See `FILE_UPLOAD_BACKEND_SETUP.md` for complete details.

## 💡 Alternative: Skip S3 (Development Only)

If you don't want to set up S3 right now, the frontend will still work but files won't be stored. You can test the UI and add S3 later.

The upload will show success but files are stored as placeholder names until S3 is configured.
