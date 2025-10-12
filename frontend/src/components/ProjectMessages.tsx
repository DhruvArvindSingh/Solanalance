import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Message {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender: {
        full_name: string;
        avatar_url: string | null;
    };
}

interface ProjectMessagesProps {
    projectId: string;
    recipientId: string;
    recipientName: string;
}

export const ProjectMessages = ({ projectId, recipientId, recipientName }: ProjectMessagesProps) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchMessages();

        // Subscribe to new messages
        const subscription = supabase
            .channel(`project-${projectId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `project_id=eq.${projectId}`,
                },
                (payload) => {
                    fetchMessages();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [projectId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from("messages")
                .select(`
          id,
          sender_id,
          content,
          created_at,
          profiles!messages_sender_id_fkey (
            full_name,
            avatar_url
          )
        `)
                .eq("project_id", projectId)
                .order("created_at", { ascending: true })
                .limit(100);

            if (error) throw error;

            const transformedMessages = (data || []).map((m: any) => ({
                id: m.id,
                sender_id: m.sender_id,
                content: m.content,
                created_at: m.created_at,
                sender: {
                    full_name: m.profiles?.full_name || "Unknown",
                    avatar_url: m.profiles?.avatar_url,
                },
            }));

            setMessages(transformedMessages);
        } catch (error: any) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !newMessage.trim()) return;

        setSending(true);

        try {
            const { error } = await supabase.from("messages").insert({
                project_id: projectId,
                sender_id: user.id,
                message_type: "text",
                content: newMessage.trim(),
            });

            if (error) throw error;

            // Create notification for recipient
            await supabase.from("notifications").insert({
                user_id: recipientId,
                title: "New Message",
                message: "You have a new message in your project",
                type: "message",
                related_id: projectId,
            });

            setNewMessage("");
        } catch (error: any) {
            console.error("Error sending message:", error);
            toast.error("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    return (
        <Card className="glass border-white/10">
            <CardHeader>
                <CardTitle>Project Messages</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Messages Area */}
                    <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : messages.length > 0 ? (
                            <div className="space-y-4">
                                {messages.map((message) => {
                                    const isOwnMessage = message.sender_id === user?.id;

                                    return (
                                        <div
                                            key={message.id}
                                            className={`flex items-start space-x-3 ${isOwnMessage ? "flex-row-reverse space-x-reverse" : ""
                                                }`}
                                        >
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={message.sender.avatar_url || undefined} />
                                                <AvatarFallback className="bg-gradient-solana text-background text-xs">
                                                    {message.sender.full_name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div
                                                className={`flex-1 ${isOwnMessage ? "text-right" : ""
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <span className={`text-xs font-medium ${isOwnMessage ? "ml-auto" : ""}`}>
                                                        {isOwnMessage ? "You" : message.sender.full_name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(message.created_at), {
                                                            addSuffix: true,
                                                        })}
                                                    </span>
                                                </div>
                                                <div
                                                    className={`inline-block px-4 py-2 rounded-2xl ${isOwnMessage
                                                            ? "bg-gradient-solana text-background"
                                                            : "bg-muted"
                                                        }`}
                                                >
                                                    <p className="text-sm whitespace-pre-wrap break-words">
                                                        {message.content}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No messages yet. Start the conversation!</p>
                            </div>
                        )}
                    </ScrollArea>

                    {/* Message Input */}
                    <form onSubmit={handleSend} className="flex space-x-2">
                        <Input
                            placeholder={`Message ${recipientName}...`}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={sending}
                            maxLength={1000}
                        />
                        <Button
                            type="submit"
                            disabled={sending || !newMessage.trim()}
                            className="bg-gradient-solana"
                        >
                            {sending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    );
};

