import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  User,
  Send,
  Loader2,
  Brain,
  CheckCircle,
  AlertCircle,
  Code,
  Eye,
  Edit,
  Plus,
  Trash2,
  BarChart3,
} from "lucide-react";
import {
  AgentMessage,
  AgentResponse,
  FunctionCall,
} from "@/services/fmecaAgent";
import { cn } from "@/lib/utils";

interface FMECAAgentChatProps {
  fmecaData: any[];
  onDataChange: (data: any[]) => void;
  projectId: string;
  className?: string;
}

const getFunctionIcon = (functionName: string) => {
  switch (functionName) {
    case "view_fmeca_data":
      return <Eye className="h-4 w-4" />;
    case "edit_fmeca_cell":
      return <Edit className="h-4 w-4" />;
    case "add_fmeca_row":
      return <Plus className="h-4 w-4" />;
    case "remove_fmeca_row":
      return <Trash2 className="h-4 w-4" />;
    case "bulk_edit_fmeca":
      return <Edit className="h-4 w-4" />;
    case "analyze_fmeca_patterns":
      return <BarChart3 className="h-4 w-4" />;
    default:
      return <Code className="h-4 w-4" />;
  }
};

const getFunctionColor = (functionName: string) => {
  switch (functionName) {
    case "view_fmeca_data":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "edit_fmeca_cell":
    case "bulk_edit_fmeca":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "add_fmeca_row":
      return "bg-green-50 text-green-700 border-green-200";
    case "remove_fmeca_row":
      return "bg-red-50 text-red-700 border-red-200";
    case "analyze_fmeca_patterns":
      return "bg-purple-50 text-purple-700 border-purple-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

function ThinkingDisplay({ thinking }: { thinking: string[] }) {
  if (thinking.length === 0) return null;

  return (
    <Card className="mb-4 bg-gray-50/50 border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-gray-600" />
          Agent Thinking Process
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {thinking.map((thought, index) => (
            <div key={index} className="text-xs text-gray-600 font-mono">
              {thought}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FunctionCallDisplay({ functionCall }: { functionCall: FunctionCall }) {
  return (
    <Card className={cn("mb-2 border", getFunctionColor(functionCall.name))}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {getFunctionIcon(functionCall.name)}
          {functionCall.name.replace(/_/g, " ").toUpperCase()}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div>
            <span className="text-xs font-medium">Reasoning:</span>
            <p className="text-sm mt-1">{functionCall.reasoning}</p>
          </div>

          {Object.keys(functionCall.arguments).length > 0 && (
            <div>
              <span className="text-xs font-medium">Parameters:</span>
              <pre className="text-xs bg-white/50 p-2 rounded mt-1 overflow-x-auto">
                {JSON.stringify(functionCall.arguments, null, 2)}
              </pre>
            </div>
          )}

          {functionCall.result && (
            <div>
              <span className="text-xs font-medium">Result:</span>
              <pre className="text-xs bg-white/50 p-2 rounded mt-1 overflow-x-auto max-h-32">
                {JSON.stringify(functionCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MessageDisplay({ message }: { message: AgentMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 mb-6", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("flex-1 max-w-[80%]", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block p-3 rounded-lg",
            isUser
              ? "bg-blue-500 text-white"
              : "bg-white border border-gray-200"
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {!isUser && message.thinking && message.thinking.length > 0 && (
          <div className="mt-3">
            <ThinkingDisplay thinking={message.thinking} />
          </div>
        )}

        {!isUser &&
          message.functionCalls &&
          message.functionCalls.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <Code className="h-4 w-4" />
                Functions Executed ({message.functionCalls.length})
              </div>
              {message.functionCalls.map((call, index) => (
                <FunctionCallDisplay key={index} functionCall={call} />
              ))}
            </div>
          )}

        <div className="text-xs text-gray-500 mt-2">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

export function FMECAAgentChat({
  fmecaData,
  onDataChange,
  projectId,
  className,
}: FMECAAgentChatProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hello! I'm your FMECA analysis assistant. I can help you view, edit, add, and analyze your FMECA data using natural language commands.

**What I can do:**
• View and filter FMECA data
• Edit individual cells or perform bulk edits
• Add new rows with proper FMECA structure
• Remove unnecessary rows
• Analyze patterns and provide insights
• Check data completeness and quality

**Example commands:**
• "Show me all conveyor belt failures"
• "Change the severity level of row 5 to high"
• "Add a new pump impeller failure entry"
• "Remove all entries with empty failure modes"
• "Analyze risk patterns in elevator components"

Currently viewing ${fmecaData.length} FMECA entries. What would you like me to help you with?`,
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: AgentMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    try {
      // For now, simulate the agent response
      // TODO: Replace with actual FMECAAgent integration
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate processing time

      const agentResponse: AgentMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I understand you want to: "${userMessage.content}"\n\nThe OpenAI agent is currently being implemented and will be available soon with full FMECA editing capabilities. Once ready, I'll be able to:\n\n• Analyze your request in detail\n• Execute the appropriate functions\n• Provide step-by-step feedback\n• Update your FMECA data as needed\n\nStay tuned for the complete implementation!`,
        timestamp: new Date(),
        thinking: [
          '🤔 Received user request: "' + userMessage.content + '"',
          "🤔 Current FMECA data contains " + fmecaData.length + " rows",
          "🤔 Agent implementation in progress...",
        ],
        functionCalls: [],
      };

      setMessages((prev) => [...prev, agentResponse]);
    } catch (error) {
      console.error("Agent request failed:", error);

      const errorMessage: AgentMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I encountered an error while processing your request. Please try again or rephrase your request.`,
        timestamp: new Date(),
        thinking: [
          '🤔 Received user request: "' + userMessage.content + '"',
          "❌ Error occurred: " +
            (error instanceof Error ? error.message : "Unknown error"),
        ],
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const exampleCommands = [
    "Show me all high severity failures",
    "Add a new conveyor belt entry",
    "Change row 3 severity to level 4",
    "Analyze failure patterns",
    "Remove incomplete entries",
  ];

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                FMECA AI Assistant
              </h2>
              <p className="text-sm text-gray-600">
                {fmecaData.length} entries • Ready to help
              </p>
            </div>
          </div>

          <Badge variant="secondary" className="bg-green-50 text-green-700">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Online
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageDisplay key={message.id} message={message} />
          ))}

          {isProcessing && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="inline-block p-3 rounded-lg bg-white border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing your request...
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Commands */}
      <div className="flex-shrink-0 p-4 border-t bg-gray-50">
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-700 mb-2">
            Quick Commands:
          </p>
          <div className="flex flex-wrap gap-2">
            {exampleCommands.map((command, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setInput(command)}
                disabled={isProcessing}
              >
                {command}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t bg-white">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to edit your FMECA data... (Press Enter to send, Shift+Enter for new line)"
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isProcessing}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="self-end"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          The AI agent can view, edit, add, remove, and analyze your FMECA data
          using natural language.
        </div>
      </div>
    </div>
  );
}
