import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { authenticateToken } from '../middleware/auth';
import crypto from 'crypto';
import path from 'path';

const router = express.Router();

// Configure AWS S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'solana-lance';

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allowed file types
        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/zip',
            'application/x-zip-compressed',
            'image/png',
            'image/jpeg',
            'image/gif',
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, TXT, ZIP, PNG, JPG, GIF'));
        }
    },
});

// Upload single file
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { type = 'general' } = req.body; // type: 'milestone', 'profile', 'application', etc.
        const userId = req.user!.id;

        // Generate unique filename
        const fileExtension = path.extname(req.file.originalname);
        const randomString = crypto.randomBytes(16).toString('hex');
        const timestamp = Date.now();
        const fileName = `${type}/${userId}/${timestamp}-${randomString}${fileExtension}`;

        // Upload to S3
        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            // Make files publicly readable (optional, adjust based on your needs)
            // ACL: 'public-read',
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        // Generate file URL
        const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;

        res.json({
            success: true,
            url: fileUrl,
            fileName: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype,
        });
    } catch (error: any) {
        console.error('Upload error:', error);

        if (error.message.includes('Invalid file type')) {
            return res.status(400).json({ error: error.message });
        }

        if (error.message.includes('File too large')) {
            return res.status(400).json({ error: 'File size exceeds 10MB limit' });
        }

        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Upload multiple files
router.post('/multiple', authenticateToken, upload.array('files', 5), async (req, res) => {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const { type = 'general' } = req.body;
        const userId = req.user!.id;
        const uploadedFiles = [];

        for (const file of req.files) {
            // Generate unique filename
            const fileExtension = path.extname(file.originalname);
            const randomString = crypto.randomBytes(16).toString('hex');
            const timestamp = Date.now();
            const fileName = `${type}/${userId}/${timestamp}-${randomString}${fileExtension}`;

            // Upload to S3
            const uploadParams = {
                Bucket: BUCKET_NAME,
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
            };

            await s3Client.send(new PutObjectCommand(uploadParams));

            // Generate file URL
            const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;

            uploadedFiles.push({
                url: fileUrl,
                fileName: file.originalname,
                size: file.size,
                type: file.mimetype,
            });
        }

        res.json({
            success: true,
            files: uploadedFiles,
        });
    } catch (error: any) {
        console.error('Multiple upload error:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});

export default router;
