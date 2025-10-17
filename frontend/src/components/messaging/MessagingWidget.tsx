import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMessagingStore } from '@/stores/messagingStore';
import { ConversationList } from './ConversationList';
import { ActiveChat } from './ActiveChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    MessageCircle,
    ChevronUp,
    ChevronDown,
    Minus,
    X,
    Search
} from 'lucide-react';

export const MessagingWidget = () => {
    const { user } = useAuth();
    const [isMinimized, setIsMinimized] = useState(false);

    const {
        isCollapsed,
        selectedProjectId,
        searchQuery,
        unreadTotal,
        conversations,
        toggleCollapse,
        setSearchQuery,
        loadConversations,
        initializeSocket,
        disconnectSocket
    } = useMessagingStore();

    // Initialize messaging when user is available
    useEffect(() => {
        if (user) {
            const token = localStorage.getItem('token');
            if (token) {
                initializeSocket(user.id, token);
                loadConversations();
            }
        }

        return () => {
            disconnectSocket();
        };
    }, [user, initializeSocket, disconnectSocket, loadConversations]);

    // Don't render if no user
    if (!user) return null;

    return (
        <div className="fixed bottom-0 right-5 z-50">
            {isCollapsed ? (
                /* Collapsed State - Messenger Button */
                <Button
                    onClick={toggleCollapse}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-t-lg shadow-lg flex items-center gap-2 transition-all duration-200"
                >
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-medium">Messaging</span>
                    {unreadTotal > 0 && (
                        <Badge variant="destructive" className="ml-1 px-2 py-1 text-xs">
                            {unreadTotal > 99 ? '99+' : unreadTotal}
                        </Badge>
                    )}
                    <ChevronUp className="w-4 h-4" />
                </Button>
            ) : (
                /* Expanded State - Messaging Panel */
                <div
                    className={`bg-background border border-border rounded-t-lg shadow-2xl transition-all duration-300 ${isMinimized ? 'h-12' : 'h-[500px]'
                        } w-[360px] flex flex-col overflow-hidden`}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-border flex justify-between items-center bg-muted/50">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold text-foreground">Messaging</h3>
                            {unreadTotal > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                    {unreadTotal}
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="h-8 w-8 p-0"
                            >
                                <Minus className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleCollapse}
                                className="h-8 w-8 p-0"
                            >
                                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleCollapse}
                                className="h-8 w-8 p-0"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Content - Only show when not minimized */}
                    {!isMinimized && (
                        <>
                            {/* Search Bar */}
                            <div className="p-3 border-b border-border">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search messages or people"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 h-9 bg-background"
                                    />
                                </div>
                            </div>

                            {/* Main Content Area */}
                            <div className="flex-1 flex overflow-hidden">
                                {selectedProjectId ? (
                                    /* Split View - Conversation List + Active Chat */
                                    <>
                                        <div className="w-2/5 border-r border-border">
                                            <ConversationList />
                                        </div>
                                        <div className="flex-1">
                                            <ActiveChat />
                                        </div>
                                    </>
                                ) : (
                                    /* Full Width - Conversation List Only */
                                    <div className="flex-1">
                                        <ConversationList />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
