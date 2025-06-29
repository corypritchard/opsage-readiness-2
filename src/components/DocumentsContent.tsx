import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Mock asset and document data
const mockAssets = [
  { id: "1", name: "Pump 101" },
  { id: "2", name: "Compressor A" },
  { id: "3", name: "Conveyor Belt 5" },
];

interface Document {
  id: string;
  assetId: string;
  name: string;
  type: string;
  description: string;
  status: "Active" | "Pending" | "Archived";
  uploadDate: string;
  size: string;
}

const mockDocuments: Document[] = [
  {
    id: "a1",
    assetId: "1",
    name: "Pump_Manual.pdf",
    type: "PDF",
    description: "Official pump operation manual.",
    status: "Active",
    uploadDate: "2024-01-15",
    size: "2.4 MB",
  },
  {
    id: "a2",
    assetId: "2",
    name: "Compressor_Specs.xlsx",
    type: "Excel",
    description: "Compressor technical specifications.",
    status: "Pending",
    uploadDate: "2024-01-16",
    size: "1.8 MB",
  },
  {
    id: "a3",
    assetId: "3",
    name: "Conveyor_Photo.png",
    type: "Image",
    description: "Photo of conveyor belt installation.",
    status: "Active",
    uploadDate: "2024-01-17",
    size: "3.2 MB",
  },
  {
    id: "a4",
    assetId: "1",
    name: "Maintenance_Schedule.pdf",
    type: "PDF",
    description: "Monthly maintenance schedule and procedures.",
    status: "Archived",
    uploadDate: "2024-01-10",
    size: "956 KB",
  },
];

export function DocumentsContent({ className }: { className?: string }) {
  const [documents, setDocuments] = useState(mockDocuments);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleDelete = (id: string) => {
    setDocuments((docs) => docs.filter((doc) => doc.id !== id));
  };

  const getAssetName = (assetId: string) =>
    mockAssets.find((a) => a.id === assetId)?.name || "Unknown";

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
    switch (type.toLowerCase()) {
      case "pdf":
        return File;
      case "excel":
      case "xlsx":
        return File;
      case "image":
      case "png":
      case "jpg":
      case "jpeg":
        return FileImage;
      default:
        return FileText;
    }
  };

  const getStatusCount = (status: string) => {
    if (status === "all") return documents.length;
    return documents.filter((doc) => doc.status.toLowerCase() === status)
      .length;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl icon-primary">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Documents
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage and organize your asset documentation
                </p>
              </div>
            </div>

            <Button className="h-11 btn-primary">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

        {/* Documents Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm || selectedStatus !== "all"
                  ? "No documents found"
                  : "No documents yet"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                {searchTerm || selectedStatus !== "all"
                  ? "Try adjusting your search terms or filters"
                  : "Get started by uploading your first document"}
              </p>
              {!searchTerm && selectedStatus === "all" && (
                <Button className="btn-primary">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First Document
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Document
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
                                {doc.type} • {doc.size}
                              </p>
                            </div>
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
          )}
        </div>

        {/* Results Summary */}
        {filteredDocuments.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
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
