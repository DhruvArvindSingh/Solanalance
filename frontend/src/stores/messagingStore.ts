import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { apiClient } from '@/integrations/apiClient/client';
import io, { Socket } from 'socket.io-client';

export interface ConversationSummary {
    projectId: string;
    jobTitle: string;
    otherUser: {
        id: string;
        name: string;
        avatar: string | null;
        isOnline: boolean;
    };
    lastMessage: {
        content: string;
        timestamp: Date;
        isRead: boolean;
        senderId: string;
    } | null;
    unreadCount: number;
}

export interface Message {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender: {
        full_name: string;
        avatar_url: string | null;
    } | null;
    messageType?: string;
    isRead?: boolean;
}

interface MessagingState {
    // UI State
    isCollapsed: boolean;
    selectedProjectId: string | null;
    searchQuery: string;

    // Data
    conversations: ConversationSummary[];
    messages: Record<string, Message[]>;
    unreadCounts: Record<string, number>;
    typingUsers: Record<string, string[]>; // projectId -> userIds[]
    onlineUsers: Set<string>;

    // Socket
    socket: Socket | null;

    // Computed
    unreadTotal: number;

    // Actions
    toggleCollapse: () => void;
    setSearchQuery: (query: string) => void;
    selectConversation: (projectId: string) => void;
    loadConversations: () => Promise<void>;
    loadMessages: (projectId: string) => Promise<void>;
    sendMessage: (projectId: string, content: string, recipientId?: string) => Promise<void>;
    markAsRead: (projectId: string) => Promise<void>;

    // Socket actions
    initializeSocket: (userId: string, token: string) => void;
    disconnectSocket: () => void;
    handleNewMessage: (message: Message) => void;
    handleTyping: (projectId: string, userId: string, isTyping: boolean) => void;
    handleUserOnline: (userId: string, isOnline: boolean) => void;
}

export const useMessagingStore = create<MessagingState>()(
    subscribeWithSelector((set, get) => ({
        // Initial state
        isCollapsed: true,
        selectedProjectId: null,
        searchQuery: '',
        conversations: [],
        messages: {},
        unreadCounts: {},
        typingUsers: {},
        onlineUsers: new Set(),
        socket: null,
        unreadTotal: 0,

        // Actions
        toggleCollapse: () => {
            set((state) => ({ isCollapsed: !state.isCollapsed }));
        },

        setSearchQuery: (query: string) => {
            set({ searchQuery: query });
        },

        selectConversation: (projectId: string) => {
            const state = get();
            set({ selectedProjectId: projectId || null });

            // Load messages if not loaded and projectId is valid
            if (projectId && !state.messages[projectId]) {
                get().loadMessages(projectId);
            }

            // Mark as read if projectId is valid
            if (projectId) {
                get().markAsRead(projectId);
            }
        },

        loadConversations: async () => {
            try {
                const { data, error } = await apiClient.request('/conversations', {
                    method: 'GET'
                });

                if (error) throw new Error(error);

                const conversations: ConversationSummary[] = data.map((conv: any) => ({
                    projectId: conv.id,
                    jobTitle: conv.job.title,
                    otherUser: {
                        id: conv.otherUser.id,
                        name: conv.otherUser.full_name,
                        avatar: conv.otherUser.avatar_url,
                        isOnline: get().onlineUsers.has(conv.otherUser.id)
                    },
                    lastMessage: conv.lastMessage ? {
                        content: conv.lastMessage.content,
                        timestamp: new Date(conv.lastMessage.created_at),
                        isRead: conv.lastMessage.isRead,
                        senderId: conv.lastMessage.sender_id
                    } : null,
                    unreadCount: conv.unreadCount || 0
                }));

                const unreadCounts = conversations.reduce((acc, conv) => {
                    acc[conv.projectId] = conv.unreadCount;
                    return acc;
                }, {} as Record<string, number>);

                const unreadTotal = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

                set({
                    conversations,
                    unreadCounts,
                    unreadTotal
                });

            } catch (error) {
                console.error('Error loading conversations:', error);
            }
        },

        loadMessages: async (projectId: string) => {
            try {
                const { data, error } = await apiClient.request(`/conversations/${projectId}/messages`, {
                    method: 'GET'
                });

                if (error) throw new Error(error);

                set((state) => ({
                    messages: {
                        ...state.messages,
                        [projectId]: data || []
                    }
                }));

            } catch (error) {
                console.error('Error loading messages:', error);
            }
        },

        sendMessage: async (projectId: string, content: string, recipientId?: string) => {
            const state = get();
            const socket = state.socket;

            if (socket && socket.connected) {
                // Send via Socket.IO for real-time delivery
                socket.emit('send-message', {
                    projectId,
                    content: content.trim(),
                    messageType: 'text',
                    recipientId
                });
            } else {
                // Fallback to REST API
                try {
                    const { error } = await apiClient.request(`/conversations/${projectId}/messages`, {
                        method: 'POST',
                        body: JSON.stringify({
                            content: content.trim(),
                            messageType: 'text'
                        })
                    });

                    if (error) throw new Error(error);

                    // Reload messages to show the new message
                    await get().loadMessages(projectId);

                } catch (error) {
                    console.error('Error sending message:', error);
                    throw error;
                }
            }
        },

        markAsRead: async (projectId: string) => {
            try {
                const { error } = await apiClient.request(`/conversations/${projectId}/read`, {
                    method: 'PATCH'
                });

                if (error) throw new Error(error);

                // Update local state
                set((state) => {
                    const newUnreadCounts = { ...state.unreadCounts };
                    newUnreadCounts[projectId] = 0;

                    const newUnreadTotal = Object.values(newUnreadCounts).reduce((sum, count) => sum + count, 0);

                    return {
                        unreadCounts: newUnreadCounts,
                        unreadTotal: newUnreadTotal
                    };
                });

            } catch (error) {
                console.error('Error marking as read:', error);
            }
        },

        initializeSocket: (userId: string, token: string) => {
            const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

            const socket = io(socketUrl, {
                auth: { token },
                transports: ['websocket', 'polling']
            });

            socket.on('connect', () => {
                console.log('Connected to messaging server');

                // Join all project rooms
                const state = get();
                const projectIds = state.conversations.map(conv => conv.projectId);
                if (projectIds.length > 0) {
                    socket.emit('join-projects', projectIds);
                }
            });

            socket.on('new-message', (message: Message) => {
                get().handleNewMessage(message);
            });

            socket.on('user-typing', (data: { projectId: string; userId: string }) => {
                get().handleTyping(data.projectId, data.userId, true);
            });

            socket.on('user-stopped-typing', (data: { projectId: string; userId: string }) => {
                get().handleTyping(data.projectId, data.userId, false);
            });

            socket.on('user:online', (data: { userId: string; status: string }) => {
                get().handleUserOnline(data.userId, data.status === 'online');
            });

            socket.on('error', (error: any) => {
                console.error('Socket error:', error);
            });

            set({ socket });
        },

        disconnectSocket: () => {
            const socket = get().socket;
            if (socket) {
                socket.disconnect();
                set({ socket: null });
            }
        },

        handleNewMessage: (message: any) => {
            set((state) => {
                const projectId = message.projectId;
                if (!projectId) return state;

                // If the conversation doesn't exist, reload conversations
                if (!state.conversations.some(c => c.projectId === projectId)) {
                    get().loadConversations();
                }

                // Add message to the project's message list
                const currentMessages = state.messages[projectId] || [];
                const updatedMessages = {
                    ...state.messages,
                    [projectId]: [...currentMessages, message]
                };

                // Update unread count if message is not from current user
                const currentUserId = localStorage.getItem('userId'); // You might want to pass this differently
                let updatedUnreadCounts = { ...state.unreadCounts };
                let updatedUnreadTotal = state.unreadTotal;

                if (message.sender_id !== currentUserId && state.selectedProjectId !== projectId) {
                    updatedUnreadCounts[projectId] = (updatedUnreadCounts[projectId] || 0) + 1;
                    updatedUnreadTotal += 1;
                }

                // Update conversation's last message
                const updatedConversations = state.conversations.map(conv => {
                    if (conv.projectId === projectId) {
                        return {
                            ...conv,
                            lastMessage: {
                                content: message.content,
                                timestamp: new Date(message.created_at),
                                isRead: message.sender_id === currentUserId,
                                senderId: message.sender_id
                            },
                            unreadCount: updatedUnreadCounts[projectId] || 0
                        };
                    }
                    return conv;
                });

                return {
                    ...state,
                    messages: updatedMessages,
                    conversations: updatedConversations,
                    unreadCounts: updatedUnreadCounts,
                    unreadTotal: updatedUnreadTotal
                };
            });
        },

        handleTyping: (projectId: string, userId: string, isTyping: boolean) => {
            set((state) => {
                const currentTyping = state.typingUsers[projectId] || [];
                let updatedTyping;

                if (isTyping) {
                    updatedTyping = currentTyping.includes(userId)
                        ? currentTyping
                        : [...currentTyping, userId];
                } else {
                    updatedTyping = currentTyping.filter(id => id !== userId);
                }

                return {
                    ...state,
                    typingUsers: {
                        ...state.typingUsers,
                        [projectId]: updatedTyping
                    }
                };
            });
        },

        handleUserOnline: (userId: string, isOnline: boolean) => {
            set((state) => {
                const newOnlineUsers = new Set(state.onlineUsers);

                if (isOnline) {
                    newOnlineUsers.add(userId);
                } else {
                    newOnlineUsers.delete(userId);
                }

                // Update conversations with online status
                const updatedConversations = state.conversations.map(conv => ({
                    ...conv,
                    otherUser: {
                        ...conv.otherUser,
                        isOnline: conv.otherUser.id === userId ? isOnline : conv.otherUser.isOnline
                    }
                }));

                return {
                    ...state,
                    onlineUsers: newOnlineUsers,
                    conversations: updatedConversations
                };
            });
        }
    }))
);
