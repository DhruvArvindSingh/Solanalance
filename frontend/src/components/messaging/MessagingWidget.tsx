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
    Search,
    Users,
    Briefcase
} from 'lucide-react';

export const MessagingWidget = () => {
    const { user } = useAuth();
    const [isMinimized, setIsMinimized] = useState(false);

    const {
        isCollapsed,
        selectedProjectId,
        selectedDirectMessageUserId,
        activeTab,
        searchQuery,
        isSearchExpanded,
        unreadTotal,
        conversations,
        directMessageUsers,
        toggleCollapse,
        setActiveTab,
        toggleSearchExpanded,
        setSearchQuery,
        loadConversations,
        loadDirectMessageUsers,
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
                loadDirectMessageUsers();
            }
        }

        return () => {
            disconnectSocket();
        };
    }, [user, initializeSocket, disconnectSocket, loadConversations]);

    // Don't render if no user
    if (!user) return null;

    return (
        <div className="fixed bottom-0 right-6 z-50">
            {isCollapsed ? (
                /* Collapsed State - Messenger Button */
                <Button
                    onClick={toggleCollapse}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground px-6 py-4 rounded-t-xl shadow-xl flex items-center gap-3 transition-all duration-300 hover:scale-105 border border-primary/20"
                >
                    <div className="relative">
                        <MessageCircle className="w-6 h-6" />
                        {unreadTotal > 0 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-background rounded-full flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white">
                                    {unreadTotal > 99 ? '99+' : unreadTotal}
                                </span>
                            </div>
                        )}
                    </div>
                    <span className="font-semibold text-sm">Messages</span>
                    <ChevronUp className="w-5 h-5" />
                </Button>
            ) : (
                /* Expanded State - Messaging Panel */
                <div
                    className={`bg-background/95 backdrop-blur-xl border border-border/50 rounded-t-2xl shadow-2xl transition-all duration-500 ease-out ${isMinimized ? 'h-14' : 'h-[700px]'
                        } w-[520px] flex flex-col overflow-hidden ring-1 ring-black/5`}
                >
                    {/* Header */}
                    <div className="p-5 border-b border-border/50 flex justify-between items-center bg-gradient-to-r from-muted/30 to-muted/10 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <MessageCircle className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground text-lg">Messages</h3>
                                {unreadTotal > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        {unreadTotal} unread message{unreadTotal !== 1 ? 's' : ''}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="h-9 w-9 p-0 hover:bg-muted/50 rounded-lg transition-colors"
                            >
                                <Minus className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleCollapse}
                                className="h-9 w-9 p-0 hover:bg-muted/50 rounded-lg transition-colors"
                            >
                                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleCollapse}
                                className="h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Content - Only show when not minimized */}
                    {!isMinimized && (
                        <>
                            {/* Tabs */}
                            <div className="flex border-b border-border/30 bg-muted/10">
                                <button
                                    onClick={() => setActiveTab('projects')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'projects'
                                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                                        }`}
                                >
                                    <Briefcase className="w-4 h-4" />
                                    Projects
                                </button>
                                <button
                                    onClick={() => setActiveTab('people')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'people'
                                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                                        }`}
                                >
                                    <Users className="w-4 h-4" />
                                    People
                                </button>

                                {/* Search Toggle Button */}
                                <div className="flex items-center px-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggleSearchExpanded}
                                        className={`h-8 w-8 p-0 rounded-lg transition-colors ${isSearchExpanded ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                                            }`}
                                    >
                                        <Search className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Collapsible Search Bar */}
                            {isSearchExpanded && (
                                <div className="p-4 border-b border-border/30 bg-muted/20">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder={activeTab === 'projects' ? "Search conversations..." : "Enter user ID to find user..."}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-12 h-11 bg-background/80 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl text-sm placeholder:text-muted-foreground/70"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Main Content Area */}
                            <div className="flex-1 flex overflow-hidden bg-background/50 min-h-0">
                                {selectedProjectId || selectedDirectMessageUserId ? (
                                    /* Chat View - Compact Sidebar + Large Chat Area */
                                    <>
                                        <div className="w-20 border-r border-border/30 bg-muted/10 flex flex-col">
                                            <ConversationList isCompact={true} />
                                        </div>
                                        <div className="flex-1 bg-background/80 flex flex-col">
                                            <ActiveChat />
                                        </div>
                                    </>
                                ) : (
                                    /* Full Width - Conversation List Only */
                                    <div className="flex-1 bg-muted/5 flex flex-col">
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
