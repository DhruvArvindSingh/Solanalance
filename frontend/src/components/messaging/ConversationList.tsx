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
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="p-6 bg-muted/20 rounded-2xl mb-6">
                    <MessageCircle className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-3 text-lg">No conversations yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    Conversations will appear here when you get selected for projects and start chatting with clients
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
        <div className="h-full flex flex-col w-full">
            <ScrollArea className="flex-1 w-full">
                <div className="divide-y divide-border/30 w-full">
                    {filteredConversations.map((conversation) => (
                        <div
                            key={conversation.projectId}
                            onClick={() => selectConversation(conversation.projectId)}
                            className={`p-4 hover:bg-muted/30 cursor-pointer transition-all duration-200 hover:shadow-sm ${selectedProjectId === conversation.projectId
                                ? 'bg-primary/5 border-r-3 border-primary shadow-sm'
                                : 'hover:bg-muted/20'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                {/* Avatar with Online Status */}
                                <div className="relative flex-shrink-0">
                                    <Avatar className="w-12 h-12 ring-2 ring-background shadow-sm">
                                        <AvatarImage src={conversation.otherUser.avatar || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
                                            {conversation.otherUser.name?.charAt(0).toUpperCase() || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    {conversation.otherUser.isOnline && (
                                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full shadow-sm animate-pulse">
                                            <div className="w-full h-full bg-green-400 rounded-full animate-ping"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Conversation Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-semibold text-foreground truncate text-base">
                                            {conversation.otherUser.name}
                                        </span>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {conversation.lastMessage && (
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(conversation.lastMessage.timestamp, { addSuffix: true })}
                                                </span>
                                            )}
                                            {/* Unread Badge */}
                                            {conversation.unreadCount > 0 && (
                                                <Badge variant="destructive" className="text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm animate-pulse">
                                                    {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground truncate mb-2 font-medium">
                                        {conversation.jobTitle}
                                    </p>

                                    {conversation.lastMessage && (
                                        <p className={`text-sm truncate leading-relaxed ${conversation.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                            {conversation.lastMessage.content}
                                        </p>
                                    )}

                                    {/* Show if no messages yet */}
                                    {!conversation.lastMessage && (
                                        <p className="text-xs text-muted-foreground/60 italic">
                                            No messages yet
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};
