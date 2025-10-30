import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMessagingStore } from '@/stores/messagingStore';
import { MessageBubble } from './MessageBubble';
import { FileUpload } from './FileUpload';
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
        selectedDirectMessageUserId,
        activeTab,
        conversations,
        directMessageUsers,
        messages,
        directMessages,
        typingUsers,
        sendMessage,
        sendDirectMessage,
        selectConversation
    } = useMessagingStore();

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Determine active conversation and messages based on tab
    const activeConversation = activeTab === 'projects'
        ? conversations.find(c => c.projectId === selectedProjectId)
        : null;

    const activeDirectMessageUser = activeTab === 'people'
        ? directMessageUsers.find(u => u.id === selectedDirectMessageUserId)
        : null;

    const activeMessages = activeTab === 'projects'
        ? (messages[selectedProjectId!] || [])
        : (directMessages[selectedDirectMessageUserId!] || []);

    const activeTypingUsers = activeTab === 'projects'
        ? (typingUsers[selectedProjectId!] || [])
        : []; // Direct message typing indicators can be added later

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [activeMessages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        if (activeTab === 'projects' && !selectedProjectId) return;
        if (activeTab === 'people' && !selectedDirectMessageUserId) return;

        setIsSending(true);
        try {
            if (activeTab === 'projects') {
                await sendMessage(selectedProjectId!, newMessage, activeConversation?.otherUser.id);
            } else {
                await sendDirectMessage(selectedDirectMessageUserId!, newMessage);
            }
            setNewMessage('');
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    const handleFileUploaded = async (fileData: {
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimetype: string;
    }) => {
        try {
            if (activeTab === 'projects') {
                await sendMessage(selectedProjectId!, fileData.fileName, activeConversation?.otherUser.id, {
                    fileUrl: fileData.fileUrl,
                    fileName: fileData.fileName,
                    fileSize: fileData.fileSize
                });
            } else {
                await sendDirectMessage(selectedDirectMessageUserId!, fileData.fileName, {
                    fileUrl: fileData.fileUrl,
                    fileName: fileData.fileName,
                    fileSize: fileData.fileSize
                });
            }
        } catch (error) {
            toast.error('Failed to send file');
        }
    };

    if (!activeConversation && !activeDirectMessageUser) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <p className="text-sm text-muted-foreground">
                    Select a {activeTab === 'projects' ? 'conversation' : 'person'} to start chatting
                </p>
            </div>
        );
    }

    const currentUser = activeConversation?.otherUser || activeDirectMessageUser;
    const chatTitle = activeTab === 'projects'
        ? activeConversation?.jobTitle
        : 'Direct Message';

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
                            <AvatarImage src={currentUser?.avatar || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                                {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        {currentUser?.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full"></div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate text-base">
                            {currentUser?.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                            {chatTitle}
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
                                Send a message to {activeTab === 'projects' ? 'discuss your project with' : 'start chatting with'} {currentUser?.name}
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
            <div className="p-3 border-t border-border/30 bg-background/80 flex-shrink-0">
                <form onSubmit={handleSend} className="flex items-center gap-2 relative w-full">
                    <div className="flex-1 relative min-w-0">
                        <Input
                            type="text"
                            placeholder={`Message ${currentUser?.name}...`}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="h-12 pl-4 pr-4 bg-background/90 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-2xl text-sm placeholder:text-muted-foreground/70"
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* File Upload */}
                        <FileUpload
                            onFileUploaded={handleFileUploaded}
                            userId={user?.id || ''}
                            conversationType={activeTab === 'projects' ? 'project' : 'direct'}
                            conversationId={activeTab === 'projects' ? selectedProjectId! : selectedDirectMessageUserId!}
                            disabled={isSending}
                        />

                        <Button
                            type="submit"
                            size="sm"
                            disabled={isSending || !newMessage.trim()}
                            className="h-12 w-12 p-0 bg-primary hover:bg-primary/90 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:hover:scale-100 flex-shrink-0"
                        >
                            {isSending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
