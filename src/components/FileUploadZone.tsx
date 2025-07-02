import { useCallback } from "react";
import { Upload, FileSpreadsheet, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";

interface FileUploadZoneProps {
  onFileUpload: (file: File) => void;
  onLoadSampleData?: () => void;
  isProcessing: boolean;
  accept?: string;
  label?: string;
  description?: string;
}

export function FileUploadZone({
  onFileUpload,
  onLoadSampleData,
  isProcessing,
  accept = ".xlsx,.xls",
  label = "Upload your FMECA spreadsheet",
  description = "Drag and drop your Excel file here, or click to browse",
}: FileUploadZoneProps) {
  const validateFile = (file: File): boolean => {
    console.log("Validating file:", file.name, file.type, file.size);

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast("File too large", {
        description: "Please upload a file smaller than 10MB.",
      });
      return false;
    }

    // Check file type for Excel files if using default accept
    if (accept === ".xlsx,.xls") {
      const validTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel.sheet.macroEnabled.12",
      ];

      const hasValidExtension =
        file.name.toLowerCase().endsWith(".xlsx") ||
        file.name.toLowerCase().endsWith(".xls");

      if (!validTypes.includes(file.type) && !hasValidExtension) {
        toast("Invalid file type", {
          description: "Please upload an Excel file (.xlsx or .xls).",
        });
        return false;
      }
    }

    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      try {
        const files = e.dataTransfer.files;
        console.log("Files dropped:", files.length);

        if (files.length === 0) {
          toast("No files found", {
            description: "Please try dropping the file again.",
          });
          return;
        }

        const file = files[0];
        console.log("Processing dropped file:", file);

        if (validateFile(file)) {
          onFileUpload(file);
        }
      } catch (error) {
        console.error("Error handling drop:", error);
        toast("Upload failed", {
          description:
            "There was an error processing your file. Please try again.",
        });
      }
    },
    [onFileUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        const files = e.target.files;
        console.log("Files selected:", files?.length);

        if (files && files.length > 0) {
          const file = files[0];
          console.log("Processing selected file:", file);

          if (validateFile(file)) {
            onFileUpload(file);
          }
        }

        // Reset the input value so the same file can be selected again
        e.target.value = "";
      } catch (error) {
        console.error("Error handling file select:", error);
        toast("Upload failed", {
          description:
            "There was an error processing your file. Please try again.",
        });
      }
    },
    [onFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div className="p-8">
      <div
        className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12 text-center transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 group"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-blue-900/10 dark:via-purple-900/5 dark:to-pink-900/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Content */}
        <div className="relative z-10">
          {/* Enhanced Icon */}
          <div className="mx-auto w-20 h-20 icon-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative">
            <FileSpreadsheet className="h-10 w-10 text-white" />
            <div className="absolute -top-1 -right-1 w-6 h-6 icon-warning rounded-full flex items-center justify-center shadow-md transform scale-100">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Modern Typography */}
          <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
            {label}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
            {description}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <label
              className={`inline-flex items-center px-6 py-3 btn-primary rounded-xl font-medium transform hover:scale-105 cursor-pointer ${
                isProcessing ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Upload className="h-5 w-5 mr-2" />
              {isProcessing ? "Processing..." : "Choose File"}
              <input
                type="file"
                className="hidden"
                accept={accept}
                onChange={handleFileSelect}
                disabled={isProcessing}
              />
            </label>

            {onLoadSampleData && (
              <button
                onClick={onLoadSampleData}
                className="inline-flex items-center px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 text-gray-700 dark:text-gray-300 rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105"
                disabled={isProcessing}
              >
                <FileSpreadsheet className="h-5 w-5 mr-2" />
                Load Sample Data
              </button>
            )}
          </div>

          {/* Support Info */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Supports Excel files (.xlsx, .xls) up to 10MB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
