import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { toast } from "sonner";
import {
  Bot,
  Loader2,
  UserCircle,
  Briefcase,
  GraduationCap,
  TrendingUp,
  FileText,
  Target,
} from "lucide-react";

const QUICK_PROMPTS = [
  { icon: Briefcase, text: "How do I transition to a new career?", color: "text-cyan" },
  { icon: FileText, text: "How can I improve my resume?", color: "text-emerald-400" },
  { icon: Target, text: "What skills should I develop for a senior role?", color: "text-violet" },
  { icon: TrendingUp, text: "How do I negotiate a better salary?", color: "text-amber-400" },
  { icon: GraduationCap, text: "What certifications should I pursue?", color: "text-pink" },
];

const WELCOME_MESSAGE = `Hi! I'm your AI Career Coach. I can help you with:\n\n- **Resume optimization** tips and strategies\n- **Career transition** advice\n- **Skill development** roadmaps\n- **Interview preparation** guidance\n- **Salary negotiation** strategies\n\nWhat would you like to discuss today?`;

export default function CareerCoach() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME_MESSAGE },
  ]);

  const chatMutation = trpc.careerCoach.sendMessage.useMutation({
    onError: (err: any) => {
      toast.error(err.message || "Failed to get response.");
    },
  });

  const historyQuery = trpc.careerCoach.getHistory.useQuery();

  // Load chat history on mount
  useEffect(() => {
    if (historyQuery.data && historyQuery.data.length > 0) {
      const loadedMessages: Message[] = historyQuery.data.map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));
      if (loadedMessages.length > 0) {
        setMessages(loadedMessages);
      }
    }
  }, [historyQuery.data]);

  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);

    chatMutation.mutate(
      { message: content },
      {
        onSuccess: (data: any) => {
          const assistantMessage: Message = {
            role: "assistant",
            content: data.reply,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        },
      }
    );
  }, [chatMutation]);

  const handleQuickPrompt = (text: string) => {
    handleSendMessage(text);
  };

  const clearMutation = trpc.careerCoach.clearHistory.useMutation({
    onSuccess: () => {
      setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
      toast.success("Chat cleared. Start a new conversation!");
    },
    onError: () => {
      toast.error("Failed to clear chat history.");
    },
  });

  const handleClearChat = () => {
    clearMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink/15 border border-pink/20 flex items-center justify-center">
            <Bot className="h-6 w-6 text-pink" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Career Coach</h1>
            <p className="text-sm text-muted-foreground">
              Get personalized career advice and placement guidance
            </p>
          </div>
        </div>
        <button
          onClick={handleClearChat}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-accent/50"
        >
          Clear Chat
        </button>
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Quick Topics</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleQuickPrompt(prompt.text)}
                className="glass-card p-3 flex items-center gap-3 text-left hover:border-cyan/30 transition-all group"
              >
                <prompt.icon className={`h-4 w-4 ${prompt.color} shrink-0`} />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  {prompt.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <Card className="glass-card border-0 overflow-hidden">
        <CardContent className="p-0">
          <AIChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={chatMutation.isPending}
            placeholder="Ask me anything about your career..."
            height={500}
            className="rounded-none"
          />
        </CardContent>
      </Card>

      {/* Context Info */}
      <Card className="glass-card border-0 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <UserCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">
                Your profile context is automatically shared with the AI coach for personalized advice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
