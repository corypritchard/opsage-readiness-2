import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { useDocumentProcessor } from "@/hooks/useDocumentProcessor";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { getAssets } from "@/integrations/supabase/assets";
import {
  MoreHorizontal,
  X,
  Edit,
  Download,
  Eye,
  FileText,
  Search,
  Filter,
  Upload,
  File,
  FileImage,
  Calendar,
  Activity,
  FileSpreadsheet,
  FileType,
  FileCode,
  FileArchive,
  FileAudio,
  FileVideo,
  Book,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";

interface Asset {
  id: string;
  name: string;
  type: string;
  location?: string | null;
  specifications?: any; // JSON field containing description and tags
}

interface Document {
  id: string;
  assetId: string;
  name: string;
  type: string;
  description: string;
  status: "Active" | "Pending" | "Archived";
  uploadDate: string;
  size: string;
  file?: File;
}

const mockDocuments: Document[] = [];

// Supported file types
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

export function DocumentsContent({ className }: { className?: string }) {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const { processFile, isProcessing, processingResults, clearResults } =
    useDocumentProcessor();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);

  // Upload form state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadAssetId, setUploadAssetId] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");

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

  // Load documents from database
  const loadDocuments = async () => {
    if (!user?.id) return;

    try {
      setIsLoadingDocuments(true);

      // Get documents for the current user
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: userDocs, error } = await supabase
        .from("documents")
        .select(
          `
          *,
          document_processing_jobs (
            status,
            error_message,
            created_at
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Convert database documents to UI format
      const formattedDocs: Document[] = (userDocs || []).map((doc) => ({
        id: doc.id,
        assetId: doc.asset_id || "",
        name: doc.name,
        type: doc.file_type || doc.type || "unknown",
        description: doc.description || "",
        status:
          doc.status === "processed"
            ? "Active"
            : doc.status === "pending"
            ? "Pending"
            : "Active",
        uploadDate: new Date(doc.created_at).toISOString().split("T")[0],
        size: formatFileSize(doc.file_size || doc.size || 0),
      }));

      setDocuments(formattedDocs);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast("Error loading documents", {
        description: "Failed to load documents from database.",
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Load documents when component mounts or user changes
  useEffect(() => {
    loadDocuments();
  }, [user?.id]);

  // Load assets when project changes
  useEffect(() => {
    loadAssets();
  }, [currentProject?.id]);

  const validateFile = (file: File): string | null => {
    if (!SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES]) {
      return `File type ${file.type} is not supported. Please upload PDF, Excel, Word documents, or images.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`;
    }
    return null;
  };

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const errors: string[] = [];

      fileArray.forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      });

      if (errors.length > 0) {
        toast(`Upload validation failed`, {
          description: errors.join("\n"),
        });
      }

      if (validFiles.length > 0) {
        setUploadFiles((prev) => [...prev, ...validFiles]);
        if (!showUploadDialog) {
          setShowUploadDialog(true);
        }
      }
    },
    [showUploadDialog]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const removeUploadFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      toast("No files selected", {
        description: "Please select files to upload.",
      });
      return;
    }

    if (!uploadAssetId) {
      toast("Asset required", {
        description: "Please select an asset for the documents.",
      });
      return;
    }

    if (!user?.id || !currentProject?.id) {
      toast("Authentication error", {
        description: "Please log in and select a project.",
      });
      return;
    }

    try {
      // Clear previous processing results
      clearResults();

      // Process each file
      for (const file of uploadFiles) {
        await processFile(file, uploadAssetId, uploadDescription);
      }

      toast("Upload started!", {
        description: `Processing ${uploadFiles.length} document${
          uploadFiles.length > 1 ? "s" : ""
        }. Check the progress below.`,
      });

      // Reset form
      setShowUploadDialog(false);
      setUploadFiles([]);
      setUploadAssetId("");
      setUploadDescription("");

      // Reload documents after upload
      setTimeout(() => {
        loadDocuments();
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      toast("Upload failed", {
        description:
          "There was an error uploading your documents. Please try again.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      console.log("🗑️ Starting document deletion for ID:", id);

      const { supabase } = await import("@/integrations/supabase/client");

      // First, get document info for logging
      const { data: docInfo } = await supabase
        .from("documents")
        .select("file_name, name")
        .eq("id", id)
        .single();

      console.log("📄 Deleting document:", docInfo?.file_name || docInfo?.name);

      // Step 1: Delete all document chunks (includes embeddings)
      const { error: chunksError } = await supabase
        .from("document_chunks")
        .delete()
        .eq("document_id", id);

      if (chunksError) {
        console.error("❌ Error deleting chunks:", chunksError);
        throw new Error(
          `Failed to delete document chunks: ${chunksError.message}`
        );
      }

      console.log("✅ Document chunks deleted");

      // Step 2: Delete processing jobs
      const { error: jobsError } = await supabase
        .from("document_processing_jobs")
        .delete()
        .eq("document_id", id);

      if (jobsError) {
        console.error("❌ Error deleting processing jobs:", jobsError);
        throw new Error(
          `Failed to delete processing jobs: ${jobsError.message}`
        );
      }

      console.log("✅ Processing jobs deleted");

      // Step 3: Delete the document record
      const { error: docError } = await supabase
        .from("documents")
        .delete()
        .eq("id", id);

      if (docError) {
        console.error("❌ Error deleting document:", docError);
        throw new Error(`Failed to delete document: ${docError.message}`);
      }

      console.log("✅ Document record deleted");

      // Step 4: Update UI state
      setDocuments((docs) => docs.filter((doc) => doc.id !== id));

      toast("Document deleted completely", {
        description:
          "Document and all associated data have been removed successfully.",
      });
    } catch (error) {
      console.error("❌ Document deletion failed:", error);
      toast("Delete failed", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete document completely.",
      });
    }
  };

  const getAssetName = (assetId: string) =>
    assets.find((a) => a.id === assetId)?.name || "Unknown";

  const handleEditStart = (id: string, current: string) => {
    setEditingId(id);
    setEditValue(current);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleEditSave = (id: string) => {
    setDocuments((docs) =>
      docs.map((doc) =>
        doc.id === id ? { ...doc, description: editValue } : doc
      )
    );
    setEditingId(null);
    setEditValue("");
    toast("Description updated", {
      description: "Document description has been updated successfully.",
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleEditKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    id: string
  ) => {
    if (e.key === "Enter") {
      handleEditSave(id);
    } else if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  // Filter documents based on search and status
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getAssetName(doc.assetId)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || doc.status.toLowerCase() === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusStyles = (status: Document["status"]) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20";
      case "Pending":
        return "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/20";
      case "Archived":
        return "bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-400/10 dark:text-gray-400 dark:ring-gray-400/20";
      default:
        return "bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-400/10 dark:text-gray-400 dark:ring-gray-400/20";
    }
  };

  const getFileIcon = (type: string) => {
    const fileType = SUPPORTED_FILE_TYPES[type.toLowerCase()];
    return fileType ? fileType.icon : FileType;
  };

  const getFileTypeLabel = (type: string) => {
    const fileType = SUPPORTED_FILE_TYPES[type.toLowerCase()];
    return fileType ? fileType.type : "Other";
  };

  return (
    <div
      className={cn(
        "h-screen overflow-hidden bg-gray-50/50 dark:bg-gray-900/50",
        className
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragActive && (
        <div className="fixed inset-0 z-50 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border-2 border-dashed border-blue-500 text-center">
            <Upload className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Drop files to upload
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Release to upload your documents
            </p>
          </div>
        </div>
      )}

      <div className="h-full flex flex-col w-full px-4 py-8 sm:px-6 lg:px-8">
        {isLoadingDocuments ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                Loading documents...
              </p>
            </div>
          </div>
        ) : filteredDocuments.length > 0 ? (
          <>
            {/* Header Section */}
            <div className="mb-8 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl icon-primary">
                    <Book className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                      Knowledge Base
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      Centralize and manage all knowledge around your project
                      assets
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {documents.length} documents
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Dialog
                    open={showUploadDialog}
                    onOpenChange={setShowUploadDialog}
                  >
                    <DialogTrigger asChild>
                      <Button className="h-11 btn-primary">
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
                              Supports PDF, Excel, Word documents, and images
                              (max 10MB each)
                            </p>
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp"
                              onChange={handleFileInput}
                              className="hidden"
                              id="file-upload"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                document.getElementById("file-upload")?.click()
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
                                    <FileIcon
                                      className={cn(
                                        "h-5 w-5",
                                        fileType?.color || "text-gray-500"
                                      )}
                                    />
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
                            onChange={(e) =>
                              setUploadDescription(e.target.value)
                            }
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

            {/* Search and Filter Bar */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
              <div className="flex flex-1 gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="h-11 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Documents Table - Takes remaining height */}
            <div className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto h-full">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        File Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Asset
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Uploaded
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {filteredDocuments.map((doc) => {
                      const FileIcon = getFileIcon(doc.type);
                      const fileTypeLabel = getFileTypeLabel(doc.type);
                      return (
                        <tr
                          key={doc.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg icon-primary">
                                <FileIcon className="h-5 w-5 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                  {doc.name}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {doc.size}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <FileIcon className="h-4 w-4" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {fileTypeLabel}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {getAssetName(doc.assetId)}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getStatusStyles(
                                doc.status
                              )}`}
                            >
                              {doc.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {editingId === doc.id ? (
                              <input
                                type="text"
                                className="w-full p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-background text-foreground"
                                value={editValue}
                                onChange={handleEditChange}
                                onBlur={() => handleEditSave(doc.id)}
                                onKeyDown={(e) => handleEditKeyDown(e, doc.id)}
                                autoFocus
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:underline text-sm text-gray-600 dark:text-gray-400"
                                onClick={() =>
                                  handleEditStart(doc.id, doc.description)
                                }
                                title="Click to edit description"
                              >
                                {doc.description || (
                                  <span className="text-muted-foreground italic">
                                    (No description)
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(doc.uploadDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Document
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleEditStart(doc.id, doc.description)
                                  }
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Description
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(doc.id)}
                                  className="text-red-600 focus:text-red-600 dark:text-red-400"
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header Section for Empty State */}
            <div className="mb-8 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl icon-primary">
                    <Book className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                      Knowledge Base
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      Centralize and manage all knowledge around your project
                      assets
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Dialog
                    open={showUploadDialog}
                    onOpenChange={setShowUploadDialog}
                  >
                    <DialogTrigger asChild>
                      <Button className="h-11 btn-primary">
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
                              Supports PDF, Excel, Word documents, and images
                              (max 10MB each)
                            </p>
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp"
                              onChange={handleFileInput}
                              className="hidden"
                              id="file-upload-empty"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                document
                                  .getElementById("file-upload-empty")
                                  ?.click()
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
                                    <FileIcon
                                      className={cn(
                                        "h-5 w-5",
                                        fileType?.color || "text-gray-500"
                                      )}
                                    />
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
                            onChange={(e) =>
                              setUploadDescription(e.target.value)
                            }
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

            {/* Upload Zone */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-16 text-center transition-colors m-8",
                  dragActive
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-6">
                  <FileText className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No documents yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  Get started by uploading your first document. Drag and drop
                  files here or click the button below.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload-main"
                  />
                  <Button
                    className="btn-primary"
                    onClick={() =>
                      document.getElementById("file-upload-main")?.click()
                    }
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Your First Document
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Browse Files
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                  Supports PDF, Excel, Word documents, and images (max 10MB
                  each)
                </p>
              </div>
            </div>
          </>
        )}

        {/* Processing Status */}
        {processingResults.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Document Processing Status
            </h3>
            <div className="space-y-3">
              {processingResults.map((result) => (
                <div
                  key={result.documentId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {result.status === "completed" ? (
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      ) : result.status === "error" ? (
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                          <X className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {result.fileName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {result.status === "extracting" &&
                          "Extracting text content..."}
                        {result.status === "uploading" &&
                          "Uploading to storage..."}
                        {result.status === "chunking" &&
                          "Breaking into chunks..."}
                        {result.status === "embedding" &&
                          "Generating embeddings..."}
                        {result.status === "completed" &&
                          `Completed - ${result.chunkCount} chunks processed`}
                        {result.status === "error" && `Error: ${result.error}`}
                      </p>
                    </div>
                  </div>
                  {result.progress !== undefined &&
                    result.status !== "error" &&
                    result.status !== "completed" && (
                      <div className="w-24">
                        <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${result.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                          {result.progress}%
                        </p>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Summary */}
        {filteredDocuments.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
            <p>
              Showing {filteredDocuments.length} of {documents.length} documents
            </p>
            <div className="flex items-center gap-2">
              <span>Total: {documents.length} documents</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
