import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';

// Configure AWS S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'solana-lanse';

interface MessageFileUploadOptions {
    userId: string;
    file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
    };
    conversationType: 'project' | 'direct';
    conversationId: string; // projectId or recipientId
}

export const uploadMessageFileToS3 = async (options: MessageFileUploadOptions): Promise<{
    url: string;
    fileName: string;
    fileSize: number;
}> => {
    const { userId, file, conversationType, conversationId } = options;

    // Validate file size (25 MB limit for message files)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 25 MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    }

    // Allowed file types for messages
    const allowedMimeTypes = [
        // Images
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/webp',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        // Archives
        'application/zip',
        'application/x-zip-compressed',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        // Audio
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        // Video (smaller files only due to size limit)
        'video/mp4',
        'video/webm',
        'video/ogg',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error(`File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`);
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const randomString = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');

    // Create S3 key path: MESSAGE_FILES/conversationType/conversationId/userId/timestamp-random-filename
    const s3Key = `MESSAGE_FILES/${conversationType}/${conversationId}/${userId}/${timestamp}-${randomString}-${sanitizedOriginalName}`;

    const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
            userId,
            conversationType,
            conversationId,
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
        },
    };

    try {
        await s3Client.send(new PutObjectCommand(uploadParams));

        // Generate file URL
        const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;

        console.log(`Message file uploaded successfully: ${s3Key}`);

        return {
            url: fileUrl,
            fileName: file.originalname,
            fileSize: file.size,
        };
    } catch (error) {
        console.error('S3 message file upload error:', error);
        throw new Error(`Failed to upload file to S3: ${(error as Error).message}`);
    }
};

// Helper function to get file type category for UI display
export const getFileTypeCategory = (mimetype: string): 'image' | 'document' | 'audio' | 'video' | 'archive' | 'other' => {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.includes('pdf') || mimetype.includes('document') || mimetype.includes('text')) return 'document';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('7z')) return 'archive';
    return 'other';
};

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
