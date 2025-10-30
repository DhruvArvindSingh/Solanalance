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
    updated_at?: string;
    sender: {
        full_name: string;
        avatar_url: string | null;
    } | null;
    messageType?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileMimetype?: string;
    isRead?: boolean;
    isDeleted?: boolean;
}

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
}

interface MessagingState {
    // UI State
    isCollapsed: boolean;
    selectedProjectId: string | null;
    selectedDirectMessageUserId: string | null;
    activeTab: 'projects' | 'people';
    searchQuery: string;
    isSearchExpanded: boolean;

    // Data
    conversations: ConversationSummary[];
    directMessages: Record<string, Message[]>; // userId -> messages[]
    directMessageUsers: Array<{
        id: string;
        name: string;
        avatar: string | null;
        isOnline: boolean;
        lastMessage?: {
            content: string;
            timestamp: Date;
            isRead: boolean;
            senderId: string;
        };
        unreadCount: number;
    }>;
    messages: Record<string, Message[]>;
    messagePagination: Record<string, PaginationInfo>;
    unreadCounts: Record<string, number>;
    typingUsers: Record<string, string[]>; // projectId -> userIds[]
    onlineUsers: Set<string>;

    // Socket
    socket: Socket | null;

    // Computed
    unreadTotal: number;

    // Actions
    toggleCollapse: () => void;
    setActiveTab: (tab: 'projects' | 'people') => void;
    toggleSearchExpanded: () => void;
    setSearchQuery: (query: string) => void;
    selectConversation: (projectId: string) => void;
    selectDirectMessage: (userId: string) => void;
    loadConversations: () => Promise<void>;
    loadDirectMessageUsers: () => Promise<void>;
    searchUserById: (userId: string) => Promise<void>;
    loadMessages: (projectId: string, page?: number) => Promise<void>;
    loadDirectMessages: (userId: string, page?: number) => Promise<void>;
    loadMoreMessages: (projectId: string) => Promise<void>;
    sendMessage: (projectId: string, content: string, recipientId?: string, fileInfo?: { fileUrl: string; fileName: string; fileSize: number }) => Promise<void>;
    sendDirectMessage: (recipientId: string, content: string, fileInfo?: { fileUrl: string; fileName: string; fileSize: number }) => Promise<void>;
    editMessage: (projectId: string, messageId: string, content: string) => Promise<void>;
    deleteMessage: (projectId: string, messageId: string) => Promise<void>;
    markAsRead: (projectId: string) => Promise<void>;

    // Socket actions
    initializeSocket: (userId: string, token: string) => void;
    disconnectSocket: () => void;
    handleNewMessage: (message: Message) => void;
    handleMessageEdited: (message: Message) => void;
    handleMessageDeleted: (data: { messageId: string; projectId: string }) => void;
    handleTyping: (projectId: string, userId: string, isTyping: boolean) => void;
    handleUserOnline: (userId: string, isOnline: boolean) => void;
}

export const useMessagingStore = create<MessagingState>()(
    subscribeWithSelector((set, get) => ({
        // Initial state
        isCollapsed: true,
        selectedProjectId: null,
        selectedDirectMessageUserId: null,
        activeTab: 'projects',
        searchQuery: '',
        isSearchExpanded: false,
        conversations: [],
        directMessages: {},
        directMessageUsers: [],
        messages: {},
        messagePagination: {},
        unreadCounts: {},
        typingUsers: {},
        onlineUsers: new Set(),
        socket: null,
        unreadTotal: 0,

        // Actions
        toggleCollapse: () => {
            set((state) => ({ isCollapsed: !state.isCollapsed }));
        },

        setActiveTab: (tab: 'projects' | 'people') => {
            set({
                activeTab: tab,
                selectedProjectId: null,
                selectedDirectMessageUserId: null,
                searchQuery: ''
            });
        },

        toggleSearchExpanded: () => {
            set((state) => ({ isSearchExpanded: !state.isSearchExpanded }));
        },

        setSearchQuery: (query: string) => {
            set({ searchQuery: query });
        },

        selectConversation: (projectId: string) => {
            const state = get();
            set({
                selectedProjectId: projectId || null,
                selectedDirectMessageUserId: null,
                activeTab: 'projects'
            });

            // Load messages if not loaded and projectId is valid
            if (projectId && !state.messages[projectId]) {
                get().loadMessages(projectId);
            }

            // Mark as read if projectId is valid
            if (projectId) {
                get().markAsRead(projectId);
            }
        },

        selectDirectMessage: (userId: string) => {
            const state = get();
            set({
                selectedDirectMessageUserId: userId || null,
                selectedProjectId: null,
                activeTab: 'people'
            });

            // Load direct messages if not loaded and userId is valid
            if (userId && !state.directMessages[userId]) {
                get().loadDirectMessages(userId);
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

        loadDirectMessageUsers: async () => {
            try {
                const { data, error } = await apiClient.request('/direct-messages/users', {
                    method: 'GET'
                });

                if (error) throw new Error(error);

                const directMessageUsers = data.map((user: any) => ({
                    id: user.id,
                    name: user.full_name,
                    avatar: user.avatar_url,
                    isOnline: get().onlineUsers.has(user.id),
                    lastMessage: user.lastMessage ? {
                        content: user.lastMessage.content,
                        timestamp: new Date(user.lastMessage.created_at),
                        isRead: user.lastMessage.isRead,
                        senderId: user.lastMessage.sender_id
                    } : undefined,
                    unreadCount: user.unreadCount || 0
                }));

                set({ directMessageUsers });

            } catch (error) {
                console.error('Error loading direct message users:', error);
            }
        },

        searchUserById: async (userId: string) => {
            try {
                const { data, error } = await apiClient.request(`/profile/${userId}`, {
                    method: 'GET'
                });

                if (error) throw new Error(error);

                const user = {
                    id: data.id,
                    name: data.full_name,
                    avatar: data.avatar_url,
                    isOnline: get().onlineUsers.has(data.id),
                    unreadCount: 0
                };

                // Add to direct message users if not already present
                set((state) => {
                    const existingUser = state.directMessageUsers.find(u => u.id === userId);
                    if (!existingUser) {
                        return {
                            directMessageUsers: [...state.directMessageUsers, user]
                        };
                    }
                    return state;
                });

            } catch (error) {
                console.error('Error searching user by ID:', error);
                throw error;
            }
        },

        loadMessages: async (projectId: string, page: number = 1) => {
            try {
                const { data, error } = await apiClient.request(`/conversations/${projectId}/messages?page=${page}&limit=50`, {
                    method: 'GET'
                });

                if (error) throw new Error(error);

                set((state) => ({
                    messages: {
                        ...state.messages,
                        [projectId]: data.messages || []
                    },
                    messagePagination: {
                        ...state.messagePagination,
                        [projectId]: data.pagination
                    }
                }));

            } catch (error) {
                console.error('Error loading messages:', error);
            }
        },

        loadDirectMessages: async (userId: string, page: number = 1) => {
            try {
                const { data, error } = await apiClient.request(`/direct-messages/${userId}?page=${page}&limit=50`, {
                    method: 'GET'
                });

                if (error) throw new Error(error);

                set((state) => ({
                    directMessages: {
                        ...state.directMessages,
                        [userId]: data.messages || []
                    }
                }));

            } catch (error) {
                console.error('Error loading direct messages:', error);
            }
        },

        loadMoreMessages: async (projectId: string) => {
            const state = get();
            const pagination = state.messagePagination[projectId];

            if (!pagination || !pagination.hasMore) {
                return;
            }

            const nextPage = pagination.page + 1;

            try {
                const { data, error } = await apiClient.request(`/conversations/${projectId}/messages?page=${nextPage}&limit=50`, {
                    method: 'GET'
                });

                if (error) throw new Error(error);

                set((state) => ({
                    messages: {
                        ...state.messages,
                        [projectId]: [...data.messages, ...(state.messages[projectId] || [])]
                    },
                    messagePagination: {
                        ...state.messagePagination,
                        [projectId]: data.pagination
                    }
                }));

            } catch (error) {
                console.error('Error loading more messages:', error);
            }
        },

        sendMessage: async (projectId: string, content: string, recipientId?: string, fileInfo?: { fileUrl: string; fileName: string; fileSize: number }) => {
            const state = get();
            const socket = state.socket;

            if (socket && socket.connected) {
                // Send via Socket.IO for real-time delivery
                socket.emit('send-message', {
                    projectId,
                    content: content.trim(),
                    messageType: fileInfo ? 'file' : 'text',
                    recipientId,
                    fileUrl: fileInfo?.fileUrl,
                    fileName: fileInfo?.fileName,
                    fileSize: fileInfo?.fileSize
                });
            } else {
                // Fallback to REST API
                try {
                    const body: any = {
                        content: content.trim(),
                        messageType: fileInfo ? 'file' : 'text'
                    };

                    if (fileInfo) {
                        body.fileUrl = fileInfo.fileUrl;
                        body.fileName = fileInfo.fileName;
                        body.fileSize = fileInfo.fileSize;
                    }

                    const { error } = await apiClient.request(`/conversations/${projectId}/messages`, {
                        method: 'POST',
                        body: JSON.stringify(body)
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

        sendDirectMessage: async (recipientId: string, content: string, fileInfo?: { fileUrl: string; fileName: string; fileSize: number }) => {
            const state = get();
            const socket = state.socket;

            if (socket && socket.connected) {
                // Send via Socket.IO for real-time delivery
                socket.emit('send-direct-message', {
                    recipientId,
                    content: content.trim(),
                    messageType: fileInfo ? 'file' : 'text',
                    fileUrl: fileInfo?.fileUrl,
                    fileName: fileInfo?.fileName,
                    fileSize: fileInfo?.fileSize
                });
            } else {
                // Fallback to REST API
                try {
                    const body: any = {
                        content: content.trim(),
                        messageType: fileInfo ? 'file' : 'text'
                    };

                    if (fileInfo) {
                        body.fileUrl = fileInfo.fileUrl;
                        body.fileName = fileInfo.fileName;
                        body.fileSize = fileInfo.fileSize;
                    }

                    const { error } = await apiClient.request(`/direct-messages/${recipientId}`, {
                        method: 'POST',
                        body: JSON.stringify(body)
                    });

                    if (error) throw new Error(error);

                    // Reload direct messages to show the new message
                    await get().loadDirectMessages(recipientId);

                } catch (error) {
                    console.error('Error sending direct message:', error);
                    throw error;
                }
            }
        },

        editMessage: async (projectId: string, messageId: string, content: string) => {
            const state = get();
            const socket = state.socket;

            if (socket && socket.connected) {
                // Send via Socket.IO
                socket.emit('edit-message', {
                    messageId,
                    content: content.trim()
                });
            } else {
                // Fallback to REST API
                try {
                    const { data, error } = await apiClient.request(`/conversations/${projectId}/messages/${messageId}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ content: content.trim() })
                    });

                    if (error) throw new Error(error);

                    // Update local state
                    set((state) => ({
                        messages: {
                            ...state.messages,
                            [projectId]: state.messages[projectId]?.map(msg =>
                                msg.id === messageId ? { ...msg, content: content.trim(), updated_at: data.updated_at } : msg
                            ) || []
                        }
                    }));

                } catch (error) {
                    console.error('Error editing message:', error);
                    throw error;
                }
            }
        },

        deleteMessage: async (projectId: string, messageId: string) => {
            const state = get();
            const socket = state.socket;

            if (socket && socket.connected) {
                // Send via Socket.IO
                socket.emit('delete-message', {
                    messageId
                });
            } else {
                // Fallback to REST API
                try {
                    const { error } = await apiClient.request(`/conversations/${projectId}/messages/${messageId}`, {
                        method: 'DELETE'
                    });

                    if (error) throw new Error(error);

                    // Update local state - mark as deleted
                    set((state) => ({
                        messages: {
                            ...state.messages,
                            [projectId]: state.messages[projectId]?.map(msg =>
                                msg.id === messageId
                                    ? { ...msg, content: 'This message has been deleted', isDeleted: true }
                                    : msg
                            ) || []
                        }
                    }));

                } catch (error) {
                    console.error('Error deleting message:', error);
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

            socket.on('message-sent', (message: Message) => {
                get().handleNewMessage(message);
            });

            socket.on('direct-message-sent', (message: Message) => {
                get().handleNewMessage(message);
            });

            socket.on('new-direct-message', (message: Message) => {
                get().handleNewMessage(message);
            });

            socket.on('message-edited', (message: Message) => {
                get().handleMessageEdited(message);
            });

            socket.on('message-deleted', (data: { messageId: string; projectId: string }) => {
                get().handleMessageDeleted(data);
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
                const directMessageUserId = message.directMessageUserId;

                // Handle direct messages
                if (directMessageUserId) {
                    const currentMessages = state.directMessages[directMessageUserId] || [];
                    const messageExists = currentMessages.some(m => m.id === message.id);

                    const updatedDirectMessages = {
                        ...state.directMessages,
                        [directMessageUserId]: messageExists
                            ? currentMessages
                            : [...currentMessages, message]
                    };

                    // Update direct message user's last message
                    const updatedDirectMessageUsers = state.directMessageUsers.map(user => {
                        if (user.id === directMessageUserId) {
                            return {
                                ...user,
                                lastMessage: {
                                    content: message.content,
                                    timestamp: new Date(message.created_at),
                                    isRead: message.sender_id === localStorage.getItem('userId'),
                                    senderId: message.sender_id
                                }
                            };
                        }
                        return user;
                    });

                    return {
                        ...state,
                        directMessages: updatedDirectMessages,
                        directMessageUsers: updatedDirectMessageUsers
                    };
                }

                // Handle project messages
                if (!projectId) return state;

                // If the conversation doesn't exist, reload conversations
                if (!state.conversations.some(c => c.projectId === projectId)) {
                    get().loadConversations();
                }

                // Add message to the project's message list (avoid duplicates)
                const currentMessages = state.messages[projectId] || [];
                const messageExists = currentMessages.some(m => m.id === message.id);

                const updatedMessages = {
                    ...state.messages,
                    [projectId]: messageExists
                        ? currentMessages
                        : [...currentMessages, message]
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

        handleMessageEdited: (message: any) => {
            set((state) => {
                const projectId = message.projectId;
                if (!projectId) return state;

                const updatedMessages = {
                    ...state.messages,
                    [projectId]: state.messages[projectId]?.map(msg =>
                        msg.id === message.id ? { ...msg, ...message } : msg
                    ) || []
                };

                return {
                    ...state,
                    messages: updatedMessages
                };
            });
        },

        handleMessageDeleted: (data: { messageId: string; projectId: string }) => {
            set((state) => {
                const { messageId, projectId } = data;

                const updatedMessages = {
                    ...state.messages,
                    [projectId]: state.messages[projectId]?.map(msg =>
                        msg.id === messageId
                            ? { ...msg, content: 'This message has been deleted', isDeleted: true }
                            : msg
                    ) || []
                };

                return {
                    ...state,
                    messages: updatedMessages
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
