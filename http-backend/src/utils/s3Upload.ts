import s3 from '../config/s3';
import { Request, Response } from 'express';

interface FileUploadOptions {
    userId: string;
    jobId: string;
    fileType: 'resume' | 'cover_letter';
    file: Express.Multer.File;
}

export const uploadFileToS3 = async (options: FileUploadOptions): Promise<string> => {
    const { userId, jobId, fileType, file } = options;

    // Validate file size (10 MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 10 MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    }

    // Validate file type
    const allowedMimeTypes = ['application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error('Only PDF files are allowed');
    }

    // Create S3 key path
    const timestamp = Date.now();
    const fileName = `${fileType}_${timestamp}.pdf`;
    const s3Key = `${userId}/${jobId}/${fileType}/${fileName}`;

    const params = {
        Bucket: process.env.AWS_BUCKET_NAME || 'solanalance-uploads',
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
            userId,
            jobId,
            fileType,
            uploadedAt: new Date().toISOString(),
        },
    };

    try {
        const result = await s3.upload(params).promise();
        console.log(`File uploaded successfully: ${s3Key}`);
        return result.Location;
    } catch (error) {
        console.error('S3 upload error:', error);
        throw new Error(`Failed to upload file to S3: ${(error as Error).message}`);
    }
};

export const deleteFileFromS3 = async (s3Key: string): Promise<void> => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME || 'solanalance-uploads',
        Key: s3Key,
    };

    try {
        await s3.deleteObject(params).promise();
        console.log(`File deleted successfully: ${s3Key}`);
    } catch (error) {
        console.error('S3 delete error:', error);
        throw new Error(`Failed to delete file from S3: ${(error as Error).message}`);
    }
};
