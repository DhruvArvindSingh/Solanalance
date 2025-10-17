import { useAuth } from '@/hooks/useAuth';
import { Message } from '@/stores/messagingStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface MessageBubbleProps {
    message: Message;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
    const { user } = useAuth();
    const isOwnMessage = message.sender_id === user?.id;

    return (
        <div
            className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
        >
            <Avatar className="w-8 h-8">
                <AvatarImage src={message.sender?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-solana text-background text-xs">
                    {message.sender?.full_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
            </Avatar>
            <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                        {isOwnMessage ? 'You' : message.sender?.full_name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                </div>
                <div
                    className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${isOwnMessage
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted rounded-bl-none'
                        }`}
                >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                </div>
            </div>
        </div>
    );
};
