import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Paperclip,
    Upload,
    X,
    File,
    Image,
    FileText,
    Music,
    Video,
    Archive,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
    onFileUploaded: (fileData: {
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimetype: string;
    }) => void;
    userId: string;
    conversationType: 'project' | 'direct';
    conversationId: string;
    disabled?: boolean;
}

const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (mimetype.startsWith('audio/')) return <Music className="w-4 h-4" />;
    if (mimetype.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (mimetype.includes('pdf') || mimetype.includes('document') || mimetype.includes('text'))
        return <FileText className="w-4 h-4" />;
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('7z'))
        return <Archive className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FileUpload = ({
    onFileUploaded,
    userId,
    conversationType,
    conversationId,
    disabled = false
}: FileUploadProps) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showUploadArea, setShowUploadArea] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const allowedTypes = [
        // Images
        'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
        // Documents
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'text/csv',
        // Archives
        'application/zip', 'application/x-zip-compressed',
        'application/x-rar-compressed', 'application/x-7z-compressed',
        // Audio
        'audio/mpeg', 'audio/wav', 'audio/ogg',
        // Video
        'video/mp4', 'video/webm', 'video/ogg',
    ];

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!allowedTypes.includes(file.type)) {
            toast.error('File type not supported');
            return;
        }

        // Validate file size (25MB)
        const maxSize = 25 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('File size must be less than 25MB');
            return;
        }

        setSelectedFile(file);
        setShowUploadArea(true);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('userId', userId);
            formData.append('conversationType', conversationType);
            formData.append('conversationId', conversationId);

            const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
            const response = await fetch(`${socketUrl}/upload-message-file`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Upload failed');
            }

            const result = await response.json();

            onFileUploaded({
                fileUrl: result.fileUrl,
                fileName: result.fileName,
                fileSize: result.fileSize,
                mimetype: result.mimetype,
            });

            toast.success('File uploaded successfully');
            setSelectedFile(null);
            setShowUploadArea(false);

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Failed to upload file');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancel = () => {
        setSelectedFile(null);
        setShowUploadArea(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="relative flex-shrink-0">
            {/* File Upload Trigger Button */}
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="h-12 w-12 p-0 hover:bg-muted/50 rounded-xl transition-colors flex-shrink-0"
                title="Attach file"
            >
                <Paperclip className="w-5 h-5" />
            </Button>

            {/* Hidden File Input */}
            <Input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept={allowedTypes.join(',')}
            />

            {/* Upload Area */}
            {showUploadArea && selectedFile && (
                <div className="absolute bottom-14 left-0 right-0 bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-lg z-30">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 p-2 bg-muted/50 rounded-lg">
                            {getFileIcon(selectedFile.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                                {selectedFile.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatFileSize(selectedFile.size)}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                onClick={handleUpload}
                                disabled={isUploading}
                                className="gap-2"
                            >
                                {isUploading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}

                            </Button>

                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancel}
                                disabled={isUploading}
                                className="h-8 w-8 p-0"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
