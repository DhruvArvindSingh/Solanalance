import { useMemo } from 'react';
import { useMessagingStore } from '@/stores/messagingStore';
import { PeopleList } from './PeopleList';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle } from 'lucide-react';

interface ConversationListProps {
    isCompact?: boolean;
}

export const ConversationList = ({ isCompact = false }: ConversationListProps) => {
    const {
        activeTab,
        conversations,
        searchQuery,
        selectedProjectId,
        selectedDirectMessageUserId,
        selectConversation
    } = useMessagingStore();

    // Filter conversations based on search query (always call this hook)
    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return conversations;

        const query = searchQuery.toLowerCase();
        return conversations.filter(conv =>
            conv.otherUser.name.toLowerCase().includes(query) ||
            conv.jobTitle.toLowerCase().includes(query) ||
            conv.lastMessage?.content.toLowerCase().includes(query)
        );
    }, [conversations, searchQuery]);

    // If we're on the People tab, show the PeopleList component
    if (activeTab === 'people') {
        return <PeopleList isCompact={isCompact} />;
    }

    // Compact view - show only avatars
    if (isCompact) {
        return (
            <div className="h-full flex flex-col w-full">
                <ScrollArea className="flex-1 w-full">
                    <div className="p-2 space-y-3 w-full flex flex-col items-center">
                        {filteredConversations.map((conversation) => (
                            <div
                                key={conversation.projectId}
                                onClick={() => selectConversation(conversation.projectId)}
                                className={`relative cursor-pointer transition-all duration-200 hover:scale-110 ${selectedProjectId === conversation.projectId
                                    ? 'ring-2 ring-primary shadow-lg'
                                    : 'hover:shadow-md'
                                    }`}
                                title={`${conversation.otherUser.name} - ${conversation.jobTitle}`}
                            >
                                <Avatar className="w-14 h-14 ring-2 ring-background shadow-sm">
                                    <AvatarImage src={conversation.otherUser.avatar || undefined} />
                                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
                                        {conversation.otherUser.name?.charAt(0).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                
                                {/* Online Status */}
                                {conversation.otherUser.isOnline && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full shadow-sm">
                                        <div className="w-full h-full bg-green-400 rounded-full animate-ping"></div>
                                    </div>
                                )}
                                
                                {/* Unread Badge */}
                                {conversation.unreadCount > 0 && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-background rounded-full flex items-center justify-center shadow-sm">
                                        <span className="text-[10px] font-bold text-white">
                                            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        );
    }

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
                            className={`p-3 hover:bg-muted/30 cursor-pointer transition-all duration-200 hover:shadow-sm ${selectedProjectId === conversation.projectId
                                ? 'bg-primary/5 border-r-3 border-primary shadow-sm'
                                : 'hover:bg-muted/20'
                                }`}
                        >
                            <div className="flex items-start gap-3 w-full">
                                {/* Avatar with Online Status */}
                                <div className="relative flex-shrink-0">
                                    <Avatar className="w-11 h-11 ring-2 ring-background shadow-sm">
                                        <AvatarImage src={conversation.otherUser.avatar || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
                                            {conversation.otherUser.name?.charAt(0).toUpperCase() || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    {conversation.otherUser.isOnline && (
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full shadow-sm animate-pulse">
                                            <div className="w-full h-full bg-green-400 rounded-full animate-ping"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Conversation Info */}
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <div className="flex justify-between items-start mb-1.5">
                                        <span className="font-semibold text-foreground truncate text-sm pr-2">
                                            {conversation.otherUser.name}
                                        </span>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {conversation.lastMessage && (
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatDistanceToNow(conversation.lastMessage.timestamp, { addSuffix: true })}
                                                </span>
                                            )}
                                            {/* Unread Badge */}
                                            {conversation.unreadCount > 0 && (
                                                <Badge variant="destructive" className="text-xs px-1.5 py-0.5 rounded-full font-semibold shadow-sm animate-pulse min-w-[20px] h-5">
                                                    {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-xs text-muted-foreground truncate mb-1.5 font-medium">
                                        {conversation.jobTitle}
                                    </p>

                                    {conversation.lastMessage && (
                                        <p className={`text-xs truncate leading-relaxed ${conversation.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
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
