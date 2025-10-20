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
            className={`flex items-end gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
        >
            <Avatar className={`w-8 h-8 ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                <AvatarImage src={message.sender?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-semibold">
                    {message.sender?.full_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
            </Avatar>
            <div className={`flex flex-col max-w-[280px] md:max-w-[320px] lg:max-w-[360px] ${isOwnMessage ? 'items-end order-1' : 'items-start order-2'}`}>
                <div className={`flex items-center gap-2 mb-1.5 px-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs font-semibold text-muted-foreground">
                        {isOwnMessage ? 'You' : message.sender?.full_name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                </div>
                <div
                    className={`px-4 py-3 shadow-sm ${isOwnMessage
                        ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-br-md'
                        : 'bg-muted/80 border border-border/30 rounded-2xl rounded-bl-md hover:bg-muted/90'
                        } transition-colors duration-200`}
                >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                </div>
            </div>
        </div>
    );
};
