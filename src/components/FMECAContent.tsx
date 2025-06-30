import { useState, useCallback, useEffect } from "react";
import {
  Upload,
  Download,
  Save,
  FileSpreadsheet,
  Shield,
  Table,
  Bot,
  TableProperties,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TanStackFMECATable } from "./TanStackFMECATable";
import { FileUploadZone } from "./FileUploadZone";
import { FMECAAgentChat } from "./FMECAAgentChat";
import { toast } from "@/components/ui/sonner";
import * as XLSX from "xlsx";
import { createSampleFMECAFile } from "@/utils/sampleFMECAData";
import { StagedChanges } from "@/pages/Dashboard";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import {
  saveFMECAData,
  getFMECAData,
} from "@/integrations/supabase/maintenance-tasks";

interface FMECAContentProps {
  className?: string;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  fmecaData: any[];
  setFmecaData: (data: any[]) => void;
  columns: string[];
  setColumns: (columns: string[]) => void;
  stagedChanges: StagedChanges | null;
}

export function FMECAContent({
  className,
  selectedFile,
  setSelectedFile,
  fmecaData,
  setFmecaData,
  columns,
  setColumns,
  stagedChanges,
}: FMECAContentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
  const [agentMode, setAgentMode] = useState(false);
  const { currentProject } = useProject();

  // Load FMECA data from database when project changes (but only if data is empty)
  useEffect(() => {
    if (currentProject) {
      // Only load if we don't already have data for this project
      if (fmecaData.length === 0) {
        loadFMECADataFromDatabase();
      }
    } else {
      // Clear data only when no project is selected
      setFmecaData([]);
      setColumns([]);
      setSelectedFile(null);
    }
  }, [
    currentProject,
    fmecaData.length,
    setFmecaData,
    setColumns,
    setSelectedFile,
  ]);

  const loadFMECADataFromDatabase = async () => {
    if (!currentProject) return;

    try {
      setIsLoading(true);
      console.log(
        "Loading FMECA data from database for project:",
        currentProject.id
      );

      const result = await getFMECAData(currentProject.id);

      if (result.data.length > 0) {
        console.log(
          "Loaded FMECA data from database:",
          result.data.length,
          "rows"
        );
        setFmecaData(result.data);
        setColumns(result.columns);

        toast("FMECA data loaded from database!", {
          description: `Loaded ${result.data.length} entries for project ${currentProject.name}`,
        });
      } else {
        console.log(
          "No FMECA data found in database for project:",
          currentProject.id
        );
        // Data is already cleared in useEffect, so no need to clear again
      }
    } catch (error) {
      console.error("Failed to load FMECA data from database:", error);
      toast("Failed to load FMECA data", {
        description: "Please try refreshing the page.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveFMECADataToDatabase = async (data: any[]) => {
    if (!currentProject || data.length === 0) {
      console.log("Save skipped - no project or no data:", {
        hasProject: !!currentProject,
        dataLength: data.length,
      });
      return;
    }

    try {
      setIsSaving(true);
      console.log(
        "Saving FMECA data to database for project:",
        currentProject.id
      );
      console.log("Data sample being saved:", data[0]);

      await saveFMECAData(currentProject.id, data, columns);

      console.log("Successfully saved FMECA data to database");
      toast("FMECA data saved to database!", {
        description: `Saved ${data.length} entries for project ${currentProject.name}`,
      });
    } catch (error) {
      console.error("Failed to save FMECA data to database:", error);
      console.error("Error details:", error);
      toast("Failed to save FMECA data", {
        description: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const parseExcelFile = async (
    file: File
  ): Promise<{ data: any[]; columns: string[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          // Get the first worksheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON with header row
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
            raw: false,
          });

          console.log("Raw Excel data:", jsonData);
          console.log("Total rows found:", jsonData.length);

          if (jsonData.length < 2) {
            throw new Error(
              "Excel file appears to be empty or has no data rows"
            );
          }

          // Get headers from first row - these will be our column names exactly as they appear
          const headers = jsonData[0] as string[];
          console.log("Headers found:", headers);

          // Convert rows to objects using exact header names
          const parsedData = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (row && row.some((cell) => cell !== "")) {
              // Skip empty rows
              const rowObject: any = {};

              // Map each cell to its corresponding header exactly
              headers.forEach((header, index) => {
                const cellValue = row[index] || "";
                rowObject[header] = cellValue;
              });

              parsedData.push(rowObject);
            }
          }

          console.log("Parsed data sample:", parsedData.slice(0, 3));
          console.log("Total parsed rows:", parsedData.length);

          resolve({ data: parsedData, columns: headers });
        } catch (error) {
          console.error("Error parsing Excel file:", error);
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = useCallback(
    async (file: File) => {
      console.log("File upload started:", file.name, file.size, file.type);

      try {
        setIsProcessing(true);
        setSelectedFile(file);

        // Add file validation
        if (!file) {
          throw new Error("No file provided");
        }

        if (file.size > 10 * 1024 * 1024) {
          // 10MB limit
          throw new Error(
            "File too large. Please upload a file smaller than 10MB."
          );
        }

        const validTypes = [
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel.sheet.macroEnabled.12",
        ];

        const hasValidExtension =
          file.name.toLowerCase().endsWith(".xlsx") ||
          file.name.toLowerCase().endsWith(".xls");

        if (!validTypes.includes(file.type) && !hasValidExtension) {
          throw new Error(
            "Invalid file type. Please upload an Excel file (.xlsx or .xls)"
          );
        }

        console.log("File validation passed");

        // Parse the actual Excel file
        const { data: parsedData, columns: excelColumns } =
          await parseExcelFile(file);

        console.log("Excel parsing completed:", parsedData.length, "rows");
        console.log("Excel columns:", excelColumns);

        setFmecaData(parsedData);
        setColumns(excelColumns);

        // Auto-save to database if we have a current project
        if (currentProject) {
          console.log(
            "Current project exists, attempting to save:",
            currentProject.id
          );
          console.log("Data to save:", parsedData.length, "rows");
          try {
            // Pass the columns directly to ensure they are saved in the correct order
            await saveFMECAData(currentProject.id, parsedData, excelColumns);
            console.log("Successfully saved FMECA data to database");
            toast("FMECA data saved to database!", {
              description: `Saved ${parsedData.length} entries for project ${currentProject.name}`,
            });
          } catch (saveError) {
            console.error("Failed to save FMECA data to database:", saveError);
            toast("Failed to save FMECA data", {
              description: `Error: ${
                saveError instanceof Error ? saveError.message : "Unknown error"
              }`,
            });
          }
        } else {
          console.log("No current project selected, skipping auto-save");
        }

        toast("File processed successfully!", {
          description: `Loaded ${parsedData.length} FMECA entries with ${excelColumns.length} columns from ${file.name}`,
        });
      } catch (error) {
        console.error("File upload error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to process file";
        // toast(`Upload failed: ${errorMessage}`, {
        //   description:
        //     "Please try again or contact support if the issue persists.",
        // });
        setSelectedFile(null);
        setFmecaData([]);
        setColumns([]);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      setSelectedFile,
      setFmecaData,
      setColumns,
      currentProject,
      saveFMECADataToDatabase,
      parseExcelFile,
    ]
  );

  const handleExport = useCallback(() => {
    if (!fmecaData.length || !columns.length) {
      // toast("No data to export", {
      //   description: "Please upload and process a file first.",
      // });
      return;
    }

    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Convert data to worksheet format
      const ws = XLSX.utils.json_to_sheet(fmecaData, {
        header: columns,
        skipHeader: false,
      });

      // Add the worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "FMECA Data");

      // Generate file name with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const fileName = `FMECA_Export_${timestamp}.xlsx`;

      // Write the file
      XLSX.writeFile(wb, fileName);

      // toast("Export successful!", {
      //   description: `Downloaded ${fileName} with ${fmecaData.length} rows`,
      // });
    } catch (error) {
      console.error("Export error:", error);
      // toast("Export failed", {
      //   description:
      //     "There was an error exporting your data. Please try again.",
      // });
    }
  }, [fmecaData, columns]);

  const handleLoadSampleData = useCallback(async () => {
    try {
      const sampleFile = createSampleFMECAFile();
      await handleFileUpload(sampleFile);
    } catch (error) {
      console.error("Failed to load sample data:", error);
      toast("Failed to load sample data", {
        description: "There was an error loading the sample data.",
      });
    }
  }, [handleFileUpload]);

  const handleManualSave = async () => {
    if (!currentProject) {
      toast("No project selected", {
        description: "Please select a project before saving.",
      });
      return;
    }

    if (fmecaData.length === 0) {
      toast("No data to save", {
        description: "Please upload FMECA data first.",
      });
      return;
    }

    await saveFMECADataToDatabase(fmecaData);
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50/50 dark:bg-gray-900/50">
      <div className="h-full flex flex-col w-full px-4 py-8 sm:px-6 lg:px-8">
        {fmecaData.length > 0 ? (
          <>
            {/* Header Section */}
            <div className="mb-8 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl icon-primary">
                    <Table className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                      FMECA Analysis
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedFile
                        ? `Analyzing ${selectedFile.name}`
                        : "Sample FMECA data analysis"}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <FileSpreadsheet className="h-3 w-3" />
                    {fmecaData.length} rows • {columns.length} columns
                  </div>
                  {stagedChanges && stagedChanges.totalChanges > 0 && (
                    <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/20 px-4 py-2 text-sm font-medium ring-1 ring-inset">
                      {stagedChanges.totalChanges} unsaved changes
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Mode Toggle */}
                  <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <Button
                      variant={!agentMode ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setAgentMode(false)}
                      className="h-9"
                    >
                      <TableProperties className="h-4 w-4 mr-2" />
                      Table View
                    </Button>
                    <Button
                      variant={agentMode ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setAgentMode(true)}
                      className="h-9"
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      AI Agent
                    </Button>
                  </div>

                  <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

                  <Button
                    variant="outline"
                    onClick={handleLoadSampleData}
                    className="h-11"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Load Sample
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={!fmecaData.length || !columns.length}
                    className="h-11"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    onClick={handleManualSave}
                    disabled={!fmecaData.length || !currentProject || isSaving}
                    className="h-11 btn-primary"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save to Database"}
                  </Button>
                </div>
              </div>
            </div>

            {/* FMECA Content - Table or Agent */}
            <div className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {agentMode ? (
                <FMECAAgentChat
                  fmecaData={fmecaData}
                  onDataChange={setFmecaData}
                  projectId={currentProject?.id || ""}
                />
              ) : (
                <TanStackFMECATable
                  data={fmecaData}
                  columns={columns.map((col) => ({
                    accessorKey: col,
                    header: col,
                  }))}
                  onDataChange={setFmecaData}
                  stagedChanges={stagedChanges}
                />
              )}
            </div>
          </>
        ) : (
          <>
            {/* Header Section for Empty State */}
            <div className="mb-8 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl icon-primary">
                    <Table className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                      FMECA Analysis
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      Failure Mode, Effects, and Criticality Analysis
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Mode Toggle */}
                  <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <Button
                      variant={!agentMode ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setAgentMode(false)}
                      className="h-9"
                    >
                      <TableProperties className="h-4 w-4 mr-2" />
                      Table View
                    </Button>
                    <Button
                      variant={agentMode ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setAgentMode(true)}
                      className="h-9"
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      AI Agent
                    </Button>
                  </div>

                  <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

                  <Button
                    variant="outline"
                    onClick={handleLoadSampleData}
                    className="h-11"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Load Sample
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={!fmecaData.length || !columns.length}
                    className="h-11"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    onClick={handleManualSave}
                    disabled={!fmecaData.length || !currentProject || isSaving}
                    className="h-11 btn-primary"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save to Database"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Content Area - Upload Zone or Agent Chat */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {agentMode ? (
                <FMECAAgentChat
                  fmecaData={fmecaData}
                  onDataChange={setFmecaData}
                  projectId={currentProject?.id || ""}
                />
              ) : (
                <FileUploadZone
                  onFileUpload={handleFileUpload}
                  onLoadSampleData={handleLoadSampleData}
                  isProcessing={isProcessing}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
