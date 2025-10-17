import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMessagingStore } from '@/stores/messagingStore';
import { MessageBubble } from './MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export const ActiveChat = () => {
    const { user } = useAuth();
    const {
        selectedProjectId,
        conversations,
        messages,
        typingUsers,
        sendMessage,
        selectConversation
    } = useMessagingStore();

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const activeConversation = conversations.find(c => c.projectId === selectedProjectId);
    const activeMessages = messages[selectedProjectId!] || [];
    const activeTypingUsers = typingUsers[selectedProjectId!] || [];

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [activeMessages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedProjectId) return;

        setIsSending(true);
        try {
            await sendMessage(selectedProjectId, newMessage, activeConversation?.otherUser.id);
            setNewMessage('');
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    if (!activeConversation) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <p className="text-sm text-muted-foreground">Select a conversation to start chatting</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-3 border-b border-border flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectConversation('')}
                    className="h-8 w-8 p-0"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{activeConversation.otherUser.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                        Project: {activeConversation.jobTitle}
                    </p>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {activeMessages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))}
                </div>
            </ScrollArea>

            {/* Typing Indicator */}
            {activeTypingUsers.length > 0 && (
                <div className="px-4 pb-2 text-xs text-muted-foreground">
                    {activeTypingUsers.length === 1 ? 'Typing...' : `${activeTypingUsers.length} people are typing...`}
                </div>
            )}

            {/* Message Input */}
            <div className="p-3 border-t border-border">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <Input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="h-9"
                    />
                    <Button
                        type="submit"
                        size="sm"
                        disabled={isSending || !newMessage.trim()}
                        className="h-9 w-9 p-0"
                    >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </form>
            </div>
        </div>
    );
};
