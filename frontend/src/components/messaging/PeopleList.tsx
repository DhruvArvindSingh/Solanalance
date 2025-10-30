import { useState, useMemo } from 'react';
import { useMessagingStore } from '@/stores/messagingStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Search, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

interface PeopleListProps {
    isCompact?: boolean;
}

export const PeopleList = ({ isCompact = false }: PeopleListProps) => {
    const {
        directMessageUsers,
        searchQuery,
        selectedDirectMessageUserId,
        selectDirectMessage,
        searchUserById
    } = useMessagingStore();

    const [isSearching, setIsSearching] = useState(false);

    // Filter direct message users based on search query
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return directMessageUsers;

        const query = searchQuery.toLowerCase();
        return directMessageUsers.filter(user =>
            user.name.toLowerCase().includes(query) ||
            user.id.toLowerCase().includes(query)
        );
    }, [directMessageUsers, searchQuery]);

    const handleSearchUser = async () => {
        if (!searchQuery.trim()) {
            toast.error('Please enter a user ID');
            return;
        }

        // Basic UUID format validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(searchQuery.trim())) {
            toast.error('Please enter a valid user ID (UUID format)');
            return;
        }

        setIsSearching(true);
        try {
            await searchUserById(searchQuery.trim());
            toast.success('User found and added to your contacts');
        } catch (error: any) {
            const errorMessage = error?.message || 'User not found or error occurred';
            toast.error(errorMessage);
        } finally {
            setIsSearching(false);
        }
    };

    // Compact view - show only avatars
    if (isCompact) {
        return (
            <div className="h-full flex flex-col w-full">
                <ScrollArea className="flex-1 w-full">
                    <div className="p-2 space-y-2 w-full">
                        {filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                onClick={() => selectDirectMessage(user.id)}
                                className={`relative cursor-pointer transition-all duration-200 hover:scale-110 ${selectedDirectMessageUserId === user.id
                                    ? 'ring-2 ring-primary shadow-lg'
                                    : 'hover:shadow-md'
                                    }`}
                                title={`${user.name} - Direct Message`}
                            >
                                <Avatar className="w-12 h-12 ring-2 ring-background shadow-sm">
                                    <AvatarImage src={user.avatar || undefined} />
                                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
                                        {user.name?.charAt(0).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>

                                {/* Online Status */}
                                {user.isOnline && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full shadow-sm">
                                        <div className="w-full h-full bg-green-400 rounded-full animate-ping"></div>
                                    </div>
                                )}

                                {/* Unread Badge */}
                                {user.unreadCount > 0 && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-background rounded-full flex items-center justify-center shadow-sm">
                                        <span className="text-[10px] font-bold text-white">
                                            {user.unreadCount > 9 ? '9+' : user.unreadCount}
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

    if (directMessageUsers.length === 0 && !searchQuery) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="p-6 bg-muted/20 rounded-2xl mb-6">
                    <Users className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-3 text-lg">No direct messages yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-4">
                    Use the search feature to find users by their ID and start direct messaging. User IDs are UUIDs that can be found in user profiles.
                </p>
                <Button
                    onClick={() => useMessagingStore.getState().toggleSearchExpanded()}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                >
                    <Search className="w-4 h-4" />
                    Search Users
                </Button>
            </div>
        );
    }

    if (filteredUsers.length === 0 && searchQuery) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageCircle className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                    No users match your search
                </p>
                <Button
                    onClick={handleSearchUser}
                    disabled={isSearching}
                    size="sm"
                    className="gap-2"
                >
                    <UserPlus className="w-4 h-4" />
                    {isSearching ? 'Searching...' : 'Add User by ID'}
                </Button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col w-full">
            <ScrollArea className="flex-1 w-full">
                <div className="divide-y divide-border/30 w-full">
                    {filteredUsers.map((user) => (
                        <div
                            key={user.id}
                            onClick={() => selectDirectMessage(user.id)}
                            className={`p-4 hover:bg-muted/30 cursor-pointer transition-all duration-200 hover:shadow-sm ${selectedDirectMessageUserId === user.id
                                ? 'bg-primary/5 border-r-3 border-primary shadow-sm'
                                : 'hover:bg-muted/20'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                {/* Avatar with Online Status */}
                                <div className="relative flex-shrink-0">
                                    <Avatar className="w-12 h-12 ring-2 ring-background shadow-sm">
                                        <AvatarImage src={user.avatar || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
                                            {user.name?.charAt(0).toUpperCase() || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    {user.isOnline && (
                                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full shadow-sm animate-pulse">
                                            <div className="w-full h-full bg-green-400 rounded-full animate-ping"></div>
                                        </div>
                                    )}
                                </div>

                                {/* User Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-semibold text-foreground truncate text-base">
                                            {user.name}
                                        </span>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {user.lastMessage && (
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(user.lastMessage.timestamp, { addSuffix: true })}
                                                </span>
                                            )}
                                            {/* Unread Badge */}
                                            {user.unreadCount > 0 && (
                                                <Badge variant="destructive" className="text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm animate-pulse">
                                                    {user.unreadCount > 99 ? '99+' : user.unreadCount}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-xs text-muted-foreground/70 mb-2 font-mono">
                                        ID: {user.id}
                                    </p>

                                    {user.lastMessage && (
                                        <p className={`text-sm truncate leading-relaxed ${user.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                                            }`}>
                                            {user.lastMessage.content}
                                        </p>
                                    )}

                                    {/* Show if no messages yet */}
                                    {!user.lastMessage && (
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
