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
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/sonner";
import { useAIChat } from "@/hooks/useAIChat";
import { cn } from "@/lib/utils";
import { StagedChanges } from "@/pages/Dashboard";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FileUploadZone } from "@/components/FileUploadZone";
import { useTheme } from "@/contexts/ThemeContext";

interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  previewData?: any[];
  validation?: {
    isValid: boolean;
    warnings: string[];
  };
  isStaging?: boolean;
}

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
    "Remove all Conveyor rows from the table.",
    "What are the highest risk items? Show me the top 3.",
    "Update the severity for all 'Pump' asset types to 5.",
    "Add a new failure mode for the elevator component.",
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
        {prompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onPromptClick(prompt)}
            className="group w-full text-left p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 icon-primary rounded-full mt-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors leading-relaxed">
                {prompt}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
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
  const [chatMode, setChatMode] = useState<"edit" | "ask">("edit");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<any[] | null>(null);
  const { sendMessage, isLoading } = useAIChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedAsset, setSelectedAsset] = useState(mockAssets[0].id);
  const [docDescription, setDocDescription] = useState("");
  const [isDocProcessing, setIsDocProcessing] = useState(false);
  const { resolvedTheme } = useTheme();

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
    if (!inputValue.trim() || hasStagedChanges) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    scrollToBottom("smooth");

    // Check if user wants preview mode (only relevant in 'edit' mode)
    const wantsPreview =
      chatMode === "edit" &&
      (inputValue.toLowerCase().includes("preview") || previewMode);
    setPreviewMode(wantsPreview);

    try {
      console.log(`Sending message to AI in ${chatMode} mode:`, inputValue);
      console.log("Current FMECA data rows:", fmecaData?.length || 0);
      const result = await sendMessage(
        updatedMessages,
        fmecaData,
        columns,
        chatMode, // Pass the current mode to the hook
        wantsPreview
      );

      console.log("AI result received:", {
        hasResponse: !!result.response,
        hasUpdatedData: !!result.updatedData,
        updatedDataLength: result.updatedData?.length || 0,
        validation: result.validation,
      });

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: result.response,
        timestamp: new Date(),
        previewData: result.updatedData,
        validation: result.validation,
        isStaging: !!result.updatedData && chatMode === "edit",
      };

      setMessages([...updatedMessages, aiMessage]);

      // Handle staging for edit mode
      if (result.updatedData && chatMode === "edit") {
        console.log("Staging changes...", result.diff);
        onStageChanges(
          result.updatedData,
          result.diff || {
            added: [],
            modified: [],
            deleted: [],
          }
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content:
          "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages([...updatedMessages, errorMessage]);
    }
  };

  const handleAccept = () => {
    onAcceptChanges();
    setMessages(messages.map((msg) => ({ ...msg, isStaging: false })));
    toast("Changes accepted successfully!");
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
                      message.type === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Message Content */}
                    <div
                      className={cn(
                        "max-w-full rounded-2xl px-4 py-3 shadow-sm",
                        message.type === "user"
                          ? "btn-primary rounded-br-md"
                          : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-md"
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                      </p>

                      {/* Enhanced Validation Warnings */}
                      {message.validation?.warnings?.length > 0 && (
                        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">
                                Validation Warnings
                              </p>
                              <ul className="space-y-1">
                                {message.validation.warnings.map(
                                  (warning, index) => (
                                    <li
                                      key={index}
                                      className="text-xs text-amber-700 dark:text-amber-300"
                                    >
                                      • {warning}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Enhanced Preview Summary */}
                      {message.previewData && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                              Preview: {message.previewData.length} entries
                              ready to apply
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Enhanced Action Buttons */}
                      {message.isStaging && hasStagedChanges && (
                        <div className="mt-4 flex gap-2">
                          <Button
                            onClick={handleAccept}
                            size="sm"
                            className="btn-success shadow-sm"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Accept
                          </Button>
                          <Button
                            onClick={handleRevert}
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Revert
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Enhanced Loading Indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
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
                  You have pending changes. Accept or revert them before making
                  new requests.
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
