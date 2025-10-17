import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMessagingStore } from '@/stores/messagingStore';

export const MessagingInitializer = () => {
    const { user } = useAuth();
    const { initializeSocket, disconnectSocket, loadConversations } = useMessagingStore();

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

    return null;
};
