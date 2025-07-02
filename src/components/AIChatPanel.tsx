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
  Upload,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDocumentProcessor } from "@/hooks/useDocumentProcessor";
import { useAuth } from "@/contexts/AuthContext";
import { getAssets } from "@/integrations/supabase/assets";
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  FileAudio,
  FileVideo,
} from "lucide-react";
import {
  AgentMessage,
  AgentResponse,
  FunctionCall,
} from "@/services/fmecaAgent";
import { useProject } from "@/contexts/ProjectContext";
import { useAIChat } from "@/hooks/useAIChat";
import ReactMarkdown from "react-markdown";

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
  onChatRef?: (addMessage: (message: AgentMessage) => void) => void;
}

// Enhanced Welcome Message Component with modern design
const WelcomeMessage: React.FC<{
  onPromptClick: (prompt: string) => void;
}> = ({ onPromptClick }) => {
  const { resolvedTheme } = useTheme();
  const prompts = [
    "Add rows to my FMECA based on the documentation provided for Pump PPC001",
    "Update all financial risk severity at a level 5 to a level 4",
    "What are the components of CVR001 that I should capture failure modes for?",
    "What maintenance tasks should I prioritize based on my current FMECA data?",
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
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Opsage Assistant
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md leading-relaxed">
        Opsage Assistant helps you build and refine your operational readiness
        data. Upload documents, generate FMECA tables, create maintenance tasks,
        and streamline the entire process with guided support.
      </p>

      {/* Modern Prompt Cards */}
      <div className="space-y-4 w-full max-w-md">
        {/* Edit Mode Examples */}
        <div>
          <h3 className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
            <Edit className="h-3 w-3" />
            EDIT MODE
          </h3>
          <div className="space-y-2">
            {prompts.slice(0, 2).map((prompt, index) => (
              <button
                key={index}
                onClick={() => onPromptClick(prompt)}
                className="w-full p-3 text-left bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-lg hover:border-green-300 dark:hover:border-green-600 hover:shadow-sm transition-all duration-200 group"
              >
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {prompt}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Ask Mode Examples */}
        <div>
          <h3 className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1">
            <HelpCircle className="h-3 w-3" />
            ASK MODE
          </h3>
          <div className="space-y-2">
            {prompts.slice(2, 4).map((prompt, index) => (
              <button
                key={index + 2}
                onClick={() => onPromptClick(prompt)}
                className="w-full p-3 text-left bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-700 rounded-lg hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-sm transition-all duration-200 group"
              >
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {prompt}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
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

// Supported file types (same as Knowledge Base)
const SUPPORTED_FILE_TYPES = {
  "application/pdf": { type: "PDF", icon: FileText, color: "text-red-600" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    type: "Excel",
    icon: FileSpreadsheet,
    color: "text-green-600",
  },
  "application/vnd.ms-excel": {
    type: "Excel",
    icon: FileSpreadsheet,
    color: "text-green-600",
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    type: "Word",
    icon: FileText,
    color: "text-blue-600",
  },
  "application/msword": {
    type: "Word",
    icon: FileText,
    color: "text-blue-600",
  },
  "image/png": { type: "Image", icon: FileImage, color: "text-purple-600" },
  "image/jpeg": { type: "Image", icon: FileImage, color: "text-purple-600" },
  "image/jpg": { type: "Image", icon: FileImage, color: "text-purple-600" },
  "image/gif": { type: "Image", icon: FileImage, color: "text-purple-600" },
  "image/webp": { type: "Image", icon: FileImage, color: "text-purple-600" },
  "text/plain": { type: "Text", icon: FileText, color: "text-gray-600" },
  "application/zip": {
    type: "Archive",
    icon: FileArchive,
    color: "text-yellow-600",
  },
  "application/x-zip-compressed": {
    type: "Archive",
    icon: FileArchive,
    color: "text-yellow-600",
  },
  "audio/mpeg": { type: "Audio", icon: FileAudio, color: "text-pink-600" },
  "audio/wav": { type: "Audio", icon: FileAudio, color: "text-pink-600" },
  "video/mp4": { type: "Video", icon: FileVideo, color: "text-indigo-600" },
  "text/csv": { type: "CSV", icon: FileSpreadsheet, color: "text-green-600" },
  "application/json": { type: "JSON", icon: FileCode, color: "text-gray-600" },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface Asset {
  id: string;
  name: string;
  type: string;
  location?: string | null;
  specifications?: any;
}

// Custom paragraph renderer to tighten spacing
const MarkdownParagraph: React.FC<any> = ({ node, ...props }) => (
  <p className="mb-2 last:mb-0" {...props} />
);

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
  onChatRef,
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
  const { user } = useAuth();
  const { currentProject } = useProject();
  const { processFile, isProcessing, processingResults, clearResults } =
    useDocumentProcessor();

  const [chatMode, setChatMode] = useState<"edit" | "ask">("edit");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Upload dialog state (matching Knowledge Base)
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadAssetId, setUploadAssetId] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);

  const { resolvedTheme } = useTheme();
  const { sendMessage } = useAIChat();

  // Function to add a message from external components
  const addMessage = (message: AgentMessage) => {
    setMessages((prev) => [...prev, message]);
    scrollToBottom("smooth");
  };

  // Expose addMessage function to parent component
  useEffect(() => {
    if (onChatRef) {
      onChatRef(addMessage);
    }
  }, [onChatRef]);

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

  // Auto-resize textarea functionality
  useEffect(() => {
    const textarea = document.querySelector("textarea");
    if (textarea) {
      const adjustHeight = () => {
        textarea.style.height = "60px"; // Reset to minimum height
        const scrollHeight = Math.min(textarea.scrollHeight, 120); // Max height of 120px
        textarea.style.height = scrollHeight + "px";
      };

      textarea.addEventListener("input", adjustHeight);
      adjustHeight(); // Initial adjustment

      return () => {
        textarea.removeEventListener("input", adjustHeight);
      };
    }
  }, [inputValue]);

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
        // For ask mode, use the AI chat hook with vector search
        const messages = [
          ...updatedMessages,
          { type: "user" as const, content: inputValue },
        ];

        const aiResponse = await sendMessage(
          messages,
          fmecaData,
          columns,
          "ask"
        );

        response = {
          response: aiResponse.response, // Extract just the response text
          functionCalls: [],
          dataChanged: false,
          thinking: [
            `Received question: "${inputValue}"`,
            "Performed vector search and consulted AI model",
          ],
        };
      } else if (chatMode === "edit") {
        // For edit mode, use the AI chat hook with vector search
        const messages = [
          ...updatedMessages,
          { type: "user" as const, content: inputValue },
        ];

        const aiResponse = await sendMessage(
          messages,
          fmecaData,
          columns,
          "edit"
        );

        response = {
          response: aiResponse.response,
          functionCalls: [],
          dataChanged: !!aiResponse.updatedData,
          updatedData: aiResponse.updatedData,
          thinking: [
            `Received edit request: "${inputValue}"`,
            "Performed vector search and consulted AI model",
            aiResponse.updatedData
              ? "Generated updated FMECA data"
              : "No data changes required",
          ],
        };
      } else {
        // No valid mode or agent available
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

  // Upload functionality (same as Knowledge Base)
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Load assets from database
  const loadAssets = async () => {
    if (!currentProject?.id) {
      setAssets([]);
      setIsLoadingAssets(false);
      return;
    }

    try {
      setIsLoadingAssets(true);
      const { data: assetsData } = await getAssets(currentProject.id);
      setAssets(assetsData);
    } catch (error) {
      console.error("Error loading assets:", error);
      toast("Error loading assets", {
        description: "Failed to load assets from database.",
      });
      setAssets([]);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  // Load assets when component mounts or project changes
  useEffect(() => {
    loadAssets();
  }, [currentProject?.id]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${
        file.name
      }" is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`;
    }
    return null;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    droppedFiles.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      toast("Some files were rejected", {
        description: errors.join(" "),
      });
    }

    if (validFiles.length > 0) {
      setUploadFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const errors: string[] = [];

    selectedFiles.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      toast("Some files were rejected", {
        description: errors.join(" "),
      });
    }

    if (validFiles.length > 0) {
      setUploadFiles((prev) => [...prev, ...validFiles]);
    }

    // Reset the input
    e.target.value = "";
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0 || !uploadAssetId || !user?.id) return;

    try {
      for (const file of uploadFiles) {
        const result = await processFile(
          file,
          uploadAssetId,
          uploadDescription,
          user.id
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to process file");
        }
      }

      toast("Documents uploaded successfully!", {
        description: `${uploadFiles.length} file(s) processed and indexed.`,
      });

      // Reset form
      setUploadFiles([]);
      setUploadAssetId("");
      setUploadDescription("");
      setShowUploadDialog(false);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast("Upload failed", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const getFileIconBgColor = (type: string) => {
    const fileType =
      SUPPORTED_FILE_TYPES[type as keyof typeof SUPPORTED_FILE_TYPES];
    if (!fileType) return "bg-gray-500";

    switch (fileType.type) {
      case "PDF":
        return "bg-red-500";
      case "Excel":
      case "CSV":
        return "bg-green-500";
      case "Word":
      case "Text":
        return "bg-blue-500";
      case "Image":
        return "bg-purple-500";
      case "Archive":
        return "bg-yellow-500";
      case "Audio":
        return "bg-pink-500";
      case "Video":
        return "bg-indigo-500";
      case "JSON":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
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
              <div className="space-y-4 pt-8 pb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Message Content */}
                    <div className="max-w-[85%]">
                      <div
                        className={cn(
                          "inline-block p-3 rounded-2xl shadow-sm",
                          message.role === "user"
                            ? "bg-slate-100 dark:bg-slate-200 border border-gray-200 dark:border-gray-700 text-black rounded-br-md"
                            : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-md"
                        )}
                      >
                        {message.role === "assistant" ? (
                          <div className="text-sm leading-relaxed break-words">
                            <ReactMarkdown
                              components={{ p: MarkdownParagraph }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed break-words">
                            {message.content}
                          </p>
                        )}
                      </div>

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
              <div className="flex-1">
                <textarea
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
                  rows={2}
                  className={cn(
                    "w-full py-3 px-4 border rounded-xl resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none transition-all duration-200",
                    hasStagedChanges
                      ? "border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      : chatMode === "edit"
                      ? "border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400 focus:ring-2 focus:ring-green-500/20"
                      : "border-orange-300 dark:border-orange-600 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                  )}
                  style={{
                    minHeight: "60px",
                    maxHeight: "120px",
                    boxShadow: hasStagedChanges
                      ? "none"
                      : chatMode === "edit"
                      ? "0 0 8px rgba(34, 197, 94, 0.15)"
                      : "0 0 8px rgba(249, 115, 22, 0.15)",
                  }}
                />
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
              <Dialog
                open={showUploadDialog}
                onOpenChange={setShowUploadDialog}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 h-10 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl text-gray-700 dark:text-gray-300"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Upload Documents</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* File Upload Zone */}
                    <div className="space-y-4">
                      <Label>Select Files</Label>
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                          dragActive
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                        )}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                      >
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          Drop files here or click to browse
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Supports PDF, Excel, Word documents, and images (max
                          10MB each)
                        </p>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp"
                          onChange={handleFileInput}
                          className="hidden"
                          id="file-upload-chat"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            document.getElementById("file-upload-chat")?.click()
                          }
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Choose Files
                        </Button>
                      </div>
                    </div>

                    {/* Selected Files */}
                    {uploadFiles.length > 0 && (
                      <div className="space-y-2">
                        <Label>Selected Files ({uploadFiles.length})</Label>
                        <div className="max-h-40 overflow-y-auto space-y-2">
                          {uploadFiles.map((file, index) => {
                            const fileType =
                              SUPPORTED_FILE_TYPES[
                                file.type as keyof typeof SUPPORTED_FILE_TYPES
                              ];
                            const FileIcon = fileType?.icon || FileText;
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                              >
                                <div
                                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${getFileIconBgColor(
                                    file.type
                                  )}`}
                                >
                                  <FileIcon className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {fileType?.type || "Unknown"} •{" "}
                                    {formatFileSize(file.size)}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeUploadFile(index)}
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Asset Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="asset">Associated Asset *</Label>
                      <Select
                        value={uploadAssetId}
                        onValueChange={setUploadAssetId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an asset" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingAssets ? (
                            <SelectItem value="" disabled>
                              Loading assets...
                            </SelectItem>
                          ) : assets.length === 0 ? (
                            <SelectItem value="" disabled>
                              No assets available
                            </SelectItem>
                          ) : (
                            assets.map((asset) => (
                              <SelectItem key={asset.id} value={asset.id}>
                                {asset.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description">
                        Description (Optional)
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Add a description for these documents..."
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* Upload Button */}
                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowUploadDialog(false)}
                        disabled={isProcessing}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpload}
                        disabled={
                          isProcessing ||
                          uploadFiles.length === 0 ||
                          !uploadAssetId
                        }
                        className="btn-primary"
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload {uploadFiles.length} File
                            {uploadFiles.length !== 1 ? "s" : ""}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
