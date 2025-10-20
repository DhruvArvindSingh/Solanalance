import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMessagingStore } from '@/stores/messagingStore';
import { MessageBubble } from './MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, ArrowLeft, MessageCircle } from 'lucide-react';
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
        <div className="flex flex-col h-full min-h-0 w-full">
            {/* Chat Header */}
            <div className="p-4 border-b border-border/30 bg-gradient-to-r from-background to-muted/10 flex items-center gap-4 flex-shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectConversation('')}
                    className="h-10 w-10 p-0 hover:bg-muted/50 rounded-xl transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative">
                        <Avatar className="w-10 h-10">
                            <AvatarImage src={activeConversation.otherUser.avatar || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                                {activeConversation.otherUser.name?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        {activeConversation.otherUser.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full"></div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate text-base">
                            {activeConversation.otherUser.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                            {activeConversation.jobTitle}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 min-h-0 bg-gradient-to-b from-background to-muted/5 w-full [&_[data-radix-scroll-area-viewport]]:max-w-none" ref={scrollRef}>
                <div className="p-6 space-y-6 max-w-full w-full">
                    {activeMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="p-4 bg-muted/20 rounded-full mb-4">
                                <MessageCircle className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-medium text-foreground mb-2">Start the conversation</h3>
                            <p className="text-sm text-muted-foreground max-w-xs">
                                Send a message to discuss your project with {activeConversation.otherUser.name}
                            </p>
                        </div>
                    ) : (
                        activeMessages.map((message) => (
                            <MessageBubble key={message.id} message={message} />
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Typing Indicator */}
            {activeTypingUsers.length > 0 && (
                <div className="px-6 py-3 bg-muted/10 border-t border-border/30 flex-shrink-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        {activeTypingUsers.length === 1 ? 'Typing...' : `${activeTypingUsers.length} people are typing...`}
                    </div>
                </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t border-border/30 bg-background/80 flex-shrink-0">
                <form onSubmit={handleSend} className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Input
                            type="text"
                            placeholder={`Message ${activeConversation.otherUser.name}...`}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="h-12 pl-4 pr-4 bg-background/90 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-2xl text-sm placeholder:text-muted-foreground/70"
                        />
                    </div>
                    <Button
                        type="submit"
                        size="sm"
                        disabled={isSending || !newMessage.trim()}
                        className="h-12 w-12 p-0 bg-primary hover:bg-primary/90 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                    >
                        {isSending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
};
