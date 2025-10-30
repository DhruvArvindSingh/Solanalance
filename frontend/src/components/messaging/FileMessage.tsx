import {
    File,
    Image,
    FileText,
    Music,
    Video,
    Archive,
    Download,
    ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileMessageProps {
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimetype: string;
    isOwnMessage: boolean;
}

const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (mimetype.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (mimetype.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (mimetype.includes('pdf') || mimetype.includes('document') || mimetype.includes('text'))
        return <FileText className="w-5 h-5" />;
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('7z'))
        return <Archive className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileTypeColor = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return 'text-blue-600 dark:text-blue-400';
    if (mimetype.startsWith('audio/')) return 'text-purple-600 dark:text-purple-400';
    if (mimetype.startsWith('video/')) return 'text-red-600 dark:text-red-400';
    if (mimetype.includes('pdf') || mimetype.includes('document') || mimetype.includes('text'))
        return 'text-green-600 dark:text-green-400';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('7z'))
        return 'text-orange-600 dark:text-orange-400';
    return 'text-gray-600 dark:text-gray-400';
};

export const FileMessage = ({
    fileUrl,
    fileName,
    fileSize,
    mimetype,
    isOwnMessage
}: FileMessageProps) => {
    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePreview = () => {
        window.open(fileUrl, '_blank');
    };

    const isImage = mimetype.startsWith('image/');
    const isPreviewable = isImage || mimetype === 'application/pdf';

    return (
        <div className={`max-w-sm ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}>
            {/* Image Preview */}
            {isImage && (
                <div className="mb-2 rounded-lg overflow-hidden border border-border/30">
                    <img
                        src={fileUrl}
                        alt={fileName}
                        className="w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={handlePreview}
                        loading="lazy"
                    />
                </div>
            )}

            {/* File Info Card */}
            <div className={`
                p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/20
                ${isOwnMessage
                    ? 'bg-primary/10 border-primary/20 hover:bg-primary/15'
                    : 'bg-muted/50 border-border/30 hover:bg-muted/70'
                }
            `}>
                <div className="flex items-center gap-3">
                    {/* File Icon */}
                    <div className={`flex-shrink-0 ${getFileTypeColor(mimetype)}`}>
                        {getFileIcon(mimetype)}
                    </div>

                    {/* File Details */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate" title={fileName}>
                            {fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {formatFileSize(fileSize)}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                        {isPreviewable && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handlePreview}
                                className="h-8 w-8 p-0 hover:bg-background/50"
                                title="Preview"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </Button>
                        )}

                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleDownload}
                            className="h-8 w-8 p-0 hover:bg-background/50"
                            title="Download"
                        >
                            <Download className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
