import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Eye,
  Check,
  X,
  AlertTriangle,
  Edit,
  HelpCircle,
  Sparkles,
  GripVertical,
  Bot,
  User,
  Brain,
  Code,
  Plus,
  Trash2,
  BarChart3,
  RefreshCw,
  Edit3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { StagedChanges } from "@/pages/Dashboard";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FileUploadZone } from "@/components/FileUploadZone";
import { useTheme } from "@/contexts/ThemeContext";
import {
  FMECAAgent,
  AgentMessage,
  AgentResponse,
  FunctionCall,
} from "@/services/fmecaAgent";
import { useProject } from "@/contexts/ProjectContext";

interface AIChatPanelProps {
  className?: string;
  fmecaData?: any[];
  columns?: string[];
  onDataUpdate?: (data: any[]) => void;
  onStageChanges: (updatedData: any[], diff: StagedChanges) => void;
  onAcceptChanges: () => void;
  onRevertChanges: () => void;
  hasStagedChanges: boolean;
  onResize?: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
  initialWidth?: number;
}

// Enhanced Welcome Message Component with modern design
const WelcomeMessage: React.FC<{
  onPromptClick: (prompt: string) => void;
}> = ({ onPromptClick }) => {
  const { resolvedTheme } = useTheme();
  const prompts = [
    "Show me all high-risk items with severity level 4 or 5",
    "Add a new pump failure analysis for centrifugal pump bearing failure",
    "Update the severity level for conveyor belt motor to 3",
    "Analyze the data for completeness issues",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      {/* Opsage Logo */}
      <div className="mb-6">
        <img
          src="/lovable-uploads/caa3f40a-df45-455e-80e0-33cf0c534203.png"
          alt="Opsage Logo"
          className="w-16 h-16 object-contain"
        />
      </div>

      {/* Modern Typography */}
      <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
        Opsage Assistant
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm leading-relaxed">
        I can help you analyze, modify, and gain insights from your FMECA data
        with AI-powered assistance.
      </p>

      {/* Modern Prompt Cards */}
      <div className="space-y-3 w-full max-w-sm">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onPromptClick(prompt)}
            className="w-full p-4 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all duration-200 group"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {prompt}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Thinking Process Display Component
const ThinkingDisplay: React.FC<{ thinking: string[] }> = ({ thinking }) => {
  if (thinking.length === 0) return null;

  return (
    <Card className="mb-4 bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          Agent Thinking Process
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {thinking.map((thought, index) => (
            <div
              key={index}
              className="text-xs text-gray-600 dark:text-gray-400 font-mono"
            >
              {thought}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Function Call Display Component
const FunctionCallDisplay: React.FC<{ functionCall: FunctionCall }> = ({
  functionCall,
}) => {
  const getFunctionColor = (functionName: string): string => {
    switch (functionName) {
      case "view_fmeca_data":
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20";
      case "edit_fmeca_cell":
        return "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20";
      case "add_fmeca_row":
        return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20";
      case "remove_fmeca_row":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20";
      case "bulk_edit_fmeca":
        return "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20";
      case "analyze_fmeca_data":
        return "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20";
      default:
        return "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800";
    }
  };

  const getFunctionIcon = (functionName: string) => {
    switch (functionName) {
      case "view_fmeca_data":
        return <Eye className="h-4 w-4" />;
      case "edit_fmeca_cell":
        return <Edit3 className="h-4 w-4" />;
      case "add_fmeca_row":
        return <Plus className="h-4 w-4" />;
      case "remove_fmeca_row":
        return <Trash2 className="h-4 w-4" />;
      case "bulk_edit_fmeca":
        return <RefreshCw className="h-4 w-4" />;
      case "analyze_fmeca_data":
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <Code className="h-4 w-4" />;
    }
  };

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
              <pre className="text-xs bg-white/50 dark:bg-gray-800/50 p-2 rounded mt-1 overflow-x-auto">
                {JSON.stringify(functionCall.arguments, null, 2)}
              </pre>
            </div>
          )}

          {functionCall.result && (
            <div>
              <span className="text-xs font-medium">Result:</span>
              <pre className="text-xs bg-white/50 dark:bg-gray-800/50 p-2 rounded mt-1 overflow-x-auto max-h-32">
                {JSON.stringify(functionCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Mock asset list for demo
const mockAssets = [
  { id: "1", name: "Pump 101" },
  { id: "2", name: "Compressor A" },
  { id: "3", name: "Conveyor Belt 5" },
];

export function AIChatPanel({
  className,
  fmecaData,
  columns,
  onDataUpdate,
  onStageChanges,
  onAcceptChanges,
  onRevertChanges,
  hasStagedChanges,
  onResize,
  minWidth = 320,
  maxWidth = 600,
  initialWidth = 380,
}: AIChatPanelProps) {
  // Function to calculate the diff between original and updated data
  const calculateDataDiff = (
    originalData: any[],
    updatedData: any[]
  ): StagedChanges => {
    const added: any[] = [];
    const modified: {
      rowIndex: number;
      columnId: string;
      oldValue: any;
      newValue: any;
    }[] = [];
    const deleted: any[] = [];

    console.log("Calculating diff:", {
      originalLength: originalData.length,
      updatedLength: updatedData.length,
      originalSample: originalData[0],
      updatedSample: updatedData[0],
    });

    // Create a more robust matching function
    const findMatchingRow = (targetRow: any, searchArray: any[]) => {
      return searchArray.findIndex((row) => {
        // First try exact match
        if (JSON.stringify(row) === JSON.stringify(targetRow)) {
          return true;
        }

        // Then try key field matching with all three fields
        const keyFields = ["FLOC", "Asset Type", "Component"];
        const allKeyFieldsMatch = keyFields.every(
          (field) =>
            row[field] && targetRow[field] && row[field] === targetRow[field]
        );

        return allKeyFieldsMatch;
      });
    };

    // Find added rows (exist in updated but not in original)
    updatedData.forEach((updatedRow) => {
      const matchIndex = findMatchingRow(updatedRow, originalData);
      if (matchIndex === -1) {
        // This is a completely new row
        added.push(updatedRow);
        console.log("Found added row:", updatedRow);
      }
    });

    // Find deleted rows (exist in original but not in updated)
    originalData.forEach((originalRow) => {
      const matchIndex = findMatchingRow(originalRow, updatedData);
      if (matchIndex === -1) {
        // This row was deleted
        deleted.push(originalRow);
        console.log("Found deleted row:", originalRow);
      }
    });

    // Find modified cells (only check rows that exist in both)
    originalData.forEach((originalRow, originalIndex) => {
      const updatedRowIndex = findMatchingRow(originalRow, updatedData);

      if (updatedRowIndex !== -1) {
        const updatedRow = updatedData[updatedRowIndex];

        // Only check for modifications if it's not an exact match
        if (JSON.stringify(originalRow) !== JSON.stringify(updatedRow)) {
          Object.keys(originalRow).forEach((columnId) => {
            if (originalRow[columnId] !== updatedRow[columnId]) {
              modified.push({
                rowIndex: originalIndex,
                columnId,
                oldValue: originalRow[columnId],
                newValue: updatedRow[columnId],
              });
              console.log("Found modified cell:", {
                rowIndex: originalIndex,
                columnId,
                oldValue: originalRow[columnId],
                newValue: updatedRow[columnId],
              });
            }
          });
        }
      }
    });

    console.log("Diff calculation result:", {
      added: added.length,
      modified: modified.length,
      deleted: deleted.length,
    });

    return {
      added,
      modified,
      deleted,
    };
  };
  const [chatMode, setChatMode] = useState<"edit" | "ask">("edit");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedAsset, setSelectedAsset] = useState(mockAssets[0].id);
  const [docDescription, setDocDescription] = useState("");
  const [isDocProcessing, setIsDocProcessing] = useState(false);
  const { resolvedTheme } = useTheme();
  const { currentProject } = useProject();

  // Initialize AI Agent - will be created when we have a project
  const [agent, setAgent] = useState<FMECAAgent | null>(null);

  // Update agent when project changes
  useEffect(() => {
    if (currentProject?.id) {
      setAgent(new FMECAAgent(currentProject.id));
    } else {
      setAgent(null);
    }
  }, [currentProject?.id]);

  // Resizing functionality
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(clampedWidth);
      onResize?.(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, onResize]);

  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      scrollToBottom("auto");
      return;
    }

    const isScrolledToBottom =
      viewport.scrollHeight - viewport.clientHeight <= viewport.scrollTop + 10; // 10px buffer

    if (isScrolledToBottom) {
      scrollToBottom("smooth");
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || hasStagedChanges || isLoading) return;

    const userMessage: AgentMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
      functionCalls: [],
      thinking: [],
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);
    scrollToBottom("smooth");

    try {
      console.log(
        `Sending message to AI Agent in ${chatMode} mode:`,
        inputValue
      );
      console.log("Current FMECA data rows:", fmecaData?.length || 0);

      let response: AgentResponse;

      if (chatMode === "ask") {
        // For ask mode, create a simple response without data modification
        response = {
          response: `I understand you want to know: "${inputValue}"\n\nI can analyze your FMECA data to provide insights. However, for the most comprehensive analysis, I recommend switching to Edit mode where I can perform detailed data operations and provide more specific answers.`,
          functionCalls: [],
          dataChanged: false,
          thinking: [
            `Received question: "${inputValue}"`,
            "Operating in Ask mode - providing informational response",
          ],
        };
      } else if (agent) {
        // For edit mode, use the full AI agent capabilities
        response = await agent.processRequest(
          inputValue,
          fmecaData || [],
          columns || []
        );
      } else {
        // Edit mode but no agent available (no project selected)
        response = {
          response:
            "Please select a project first to use the AI Agent for FMECA operations.",
          functionCalls: [],
          dataChanged: false,
          thinking: [
            "❌ No project selected - cannot perform FMECA operations",
          ],
        };
      }

      console.log("AI Agent result received:", {
        hasResponse: !!response.response,
        dataChanged: response.dataChanged,
        functionCallsCount: response.functionCalls.length,
        thinkingSteps: response.thinking.length,
      });

      const aiMessage: AgentMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
        functionCalls: response.functionCalls,
        thinking: response.thinking,
      };

      setMessages([...updatedMessages, aiMessage]);

      // Handle data changes for edit mode
      if (response.dataChanged && chatMode === "edit" && response.updatedData) {
        console.log(
          "Data was changed by AI Agent - staging changes for review"
        );

        // Stage the changes for user review instead of applying immediately
        const diff = calculateDataDiff(fmecaData || [], response.updatedData);
        onStageChanges(response.updatedData, diff);

        toast(
          "Changes proposed by AI! Please review and accept or reject the changes.",
          {
            description: `${diff.added.length} added, ${diff.modified.length} modified, ${diff.deleted.length} deleted`,
          }
        );
      }
    } catch (error) {
      console.error("Error sending message to AI Agent:", error);
      const errorMessage: AgentMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I encountered an error while processing your request: ${
          error instanceof Error ? error.message : "Unknown error"
        }. Please try again.`,
        timestamp: new Date(),
        functionCalls: [],
        thinking: [
          `❌ Error occurred: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        ],
      };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      // Accept the changes in the parent component
      onAcceptChanges();
      setMessages(messages.map((msg) => ({ ...msg, isStaging: false })));

      toast("Changes accepted and saved to database!");
    } catch (error) {
      console.error("Error accepting changes:", error);
      toast("Failed to save changes to database");
    }
  };

  const handleRevert = () => {
    onRevertChanges();
    setMessages(messages.map((msg) => ({ ...msg, isStaging: false })));
    toast("Changes reverted!");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleDocUpload = (file: File) => {
    setUploadedFile(file);
  };

  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDocProcessing(true);
    setTimeout(() => {
      setIsDocProcessing(false);
      setShowDocModal(false);
      setUploadedFile(null);
      setDocDescription("");
      toast("Document processed successfully!");
    }, 2000);
  };

  return (
    <div className={cn("relative h-full flex", className)} style={{ width }}>
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize group hover:bg-blue-500 transition-colors z-10",
          isResizing && "bg-blue-500"
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 h-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border-l border-gray-200 dark:border-gray-700 shadow-xl flex flex-col">
        {/* Chat Messages Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {messages.length === 0 ? (
            <WelcomeMessage onPromptClick={handlePromptClick} />
          ) : (
            <ScrollArea
              className="flex-1 px-4 scrollbar-thin"
              ref={viewportRef}
            >
              <div className="space-y-4 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Avatar */}
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}

                    {/* Message Content */}
                    <div
                      className={cn(
                        "flex-1 max-w-[80%]",
                        message.role === "user" && "text-right"
                      )}
                    >
                      <div
                        className={cn(
                          "inline-block p-3 rounded-2xl shadow-sm",
                          message.role === "user"
                            ? "btn-primary rounded-br-md"
                            : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-md"
                        )}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>

                      {/* Thinking Process Display */}
                      {message.role === "assistant" &&
                        message.thinking &&
                        message.thinking.length > 0 && (
                          <div className="mt-3">
                            <ThinkingDisplay thinking={message.thinking} />
                          </div>
                        )}

                      {/* Function Calls Display */}
                      {message.role === "assistant" &&
                        message.functionCalls &&
                        message.functionCalls.length > 0 && (
                          <div className="mt-3">
                            <div className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Code className="h-4 w-4" />
                              Functions Executed ({message.functionCalls.length}
                              )
                            </div>
                            {message.functionCalls.map((call, index) => (
                              <FunctionCallDisplay
                                key={index}
                                functionCall={call}
                              />
                            ))}
                          </div>
                        )}

                      <div className="text-xs text-gray-500 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>

                    {/* User Avatar */}
                    {message.role === "user" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Enhanced Loading Indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="ml-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <div
                          className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"
                          style={{ animationDelay: "0.4s" }}
                        ></div>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                          AI is thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}

          {/* Enhanced Staged Changes Alert */}
          {hasStagedChanges && (
            <div className="flex-shrink-0 mx-4 mb-3">
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                  <div className="flex items-center justify-between">
                    <span>
                      You have pending changes. Accept or revert them before
                      making new requests.
                    </span>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={handleAccept}
                        className="h-7 px-3 bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRevert}
                        className="h-7 px-3 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Enhanced Input Section */}
          <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            {/* Input Row */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    hasStagedChanges
                      ? "Accept or revert changes to continue..."
                      : chatMode === "edit"
                      ? "Describe the changes you want to make..."
                      : "Ask a question about your FMECA data..."
                  }
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || hasStagedChanges}
                  className="pr-12 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading || hasStagedChanges}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 btn-primary rounded-lg shadow-sm"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-3">
              {/* Enhanced Mode Toggle */}
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 flex">
                <button
                  type="button"
                  onClick={() => setChatMode("edit")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                    chatMode === "edit"
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  )}
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setChatMode("ask")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                    chatMode === "ask"
                      ? "bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  )}
                >
                  <HelpCircle className="h-3 w-3" />
                  Ask
                </button>
              </div>

              {/* Enhanced Upload Button */}
              <Button
                variant="outline"
                onClick={() => setShowDocModal(true)}
                className="flex-1 h-10 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl text-gray-700 dark:text-gray-300"
              >
                <svg
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                  />
                </svg>
                Upload Document
              </Button>
            </div>
          </div>
        </div>

        {/* Document Upload Modal */}
        {showDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                onClick={() => {
                  setShowDocModal(false);
                  setUploadedFile(null);
                  setDocDescription("");
                }}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold mb-4">Upload Any File</h2>
              {!uploadedFile ? (
                <FileUploadZone
                  onFileUpload={handleDocUpload}
                  isProcessing={isDocProcessing}
                  accept="*"
                  label="Choose a file to upload"
                  description="You can upload images (JPG, PNG), Excel, PDF, or any other file type."
                />
              ) : (
                <form onSubmit={handleDocSubmit} className="space-y-4">
                  <div>
                    <div className="font-medium mb-1">
                      File: {uploadedFile.name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Select Asset
                    </label>
                    <select
                      className="border rounded px-3 py-2 w-full"
                      value={selectedAsset}
                      onChange={(e) => setSelectedAsset(e.target.value)}
                    >
                      {mockAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description
                    </label>
                    <Input
                      placeholder="Short description for AI context..."
                      value={docDescription}
                      onChange={(e) => setDocDescription(e.target.value)}
                      maxLength={120}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isDocProcessing}
                  >
                    {isDocProcessing ? "Linking..." : "Link Document"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
