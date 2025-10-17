import s3 from '../config/s3';

interface FileUploadOptions {
    userId: string;
    jobId: string;
    fileType: 'resume' | 'cover_letter';
    file: any;
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
    const s3Key = `_main/${userId}/${jobId}/${fileType}/${fileName}`;

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

export const uploadProfilePictureToS3 = async (userId: string, file: any): Promise<string> => {
    // Validate file size (5 MB for images)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 5 MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    }

    // Validate file type - accept common image formats
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error('Only JPEG, PNG, GIF, and WebP images are allowed');
    }

    // Determine file extension from MIME type
    const mimeToExt: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
    };
    const fileExtension = mimeToExt[file.mimetype] || '.jpg';

    // Create S3 key path: PROFILE_PIC/{userId}/profile{extension}
    const fileName = `profile_${Date.now()}${fileExtension}`;
    const s3Key = `PROFILE_PIC/${userId}/${fileName}`;

    const params = {
        Bucket: process.env.AWS_BUCKET_NAME || 'solanalance-uploads',
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
            userId,
            uploadedAt: new Date().toISOString(),
        },
    };

    try {
        const result = await s3.upload(params).promise();
        console.log(`Profile picture uploaded successfully: ${s3Key}`);
        return result.Location;
    } catch (error) {
        console.error('S3 profile picture upload error:', error);
        throw new Error(`Failed to upload profile picture to S3: ${(error as Error).message}`);
    }
};

export const getProfilePictureFromS3 = async (userId: string): Promise<string | null> => {
    try {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME || 'solanalance-uploads',
            Prefix: `PROFILE_PIC/${userId}/`,
        };

        const result = await s3.listObjectsV2(params).promise();

        if (!result.Contents || result.Contents.length === 0) {
            console.log(`No profile picture found for user: ${userId}`);
            return null;
        }

        // Get the most recent file
        const latestFile = result.Contents.sort((a, b) =>
            (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
        )[0];

        if (!latestFile.Key) {
            return null;
        }

        // Generate public URL
        const publicUrl = `https://${params.Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${latestFile.Key}`;
        console.log(`Profile picture URL for user ${userId}: ${publicUrl}`);
        return publicUrl;
    } catch (error) {
        console.error('Error getting profile picture from S3:', error);
        return null;
    }
};
