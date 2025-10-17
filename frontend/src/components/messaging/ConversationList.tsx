import { useMemo } from 'react';
import { useMessagingStore } from '@/stores/messagingStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle } from 'lucide-react';

export const ConversationList = () => {
    const {
        conversations,
        searchQuery,
        selectedProjectId,
        selectConversation
    } = useMessagingStore();

    // Filter conversations based on search query
    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return conversations;

        const query = searchQuery.toLowerCase();
        return conversations.filter(conv =>
            conv.otherUser.name.toLowerCase().includes(query) ||
            conv.jobTitle.toLowerCase().includes(query) ||
            conv.lastMessage?.content.toLowerCase().includes(query)
        );
    }, [conversations, searchQuery]);

    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">No conversations yet</h3>
                <p className="text-sm text-muted-foreground">
                    Start a conversation when you get selected for a project
                </p>
            </div>
        );
    }

    if (filteredConversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageCircle className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                    No conversations match your search
                </p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full">
            <div className="divide-y divide-border">
                {filteredConversations.map((conversation) => (
                    <div
                        key={conversation.projectId}
                        onClick={() => selectConversation(conversation.projectId)}
                        className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${selectedProjectId === conversation.projectId
                            ? 'bg-muted border-r-2 border-primary'
                            : ''
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            {/* Avatar with Online Status */}
                            <div className="relative">
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={conversation.otherUser.avatar || undefined} />
                                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                                        {conversation.otherUser.name?.charAt(0).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                {conversation.otherUser.isOnline && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                                )}
                            </div>

                            {/* Conversation Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-foreground truncate">
                                        {conversation.otherUser.name}
                                    </span>
                                    {conversation.lastMessage && (
                                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                            {formatDistanceToNow(conversation.lastMessage.timestamp, { addSuffix: true })}
                                        </span>
                                    )}
                                </div>

                                <p className="text-xs text-muted-foreground truncate mb-1">
                                    Project: {conversation.jobTitle}
                                </p>

                                {conversation.lastMessage && (
                                    <p className="text-sm text-muted-foreground truncate">
                                        {conversation.lastMessage.content}
                                    </p>
                                )}
                            </div>

                            {/* Unread Badge */}
                            {conversation.unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs px-2 py-1 ml-2">
                                    {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                </Badge>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
};
