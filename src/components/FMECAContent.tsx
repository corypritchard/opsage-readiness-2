import { useState, useCallback, useEffect } from "react";
import { Upload, Download, Save, FileSpreadsheet, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TanStackFMECATable } from "./TanStackFMECATable";
import { FileUploadZone } from "./FileUploadZone";

import { toast } from "@/components/ui/sonner";
import * as XLSX from "xlsx";
import { sampleFMECAData } from "@/utils/sampleFMECAData";
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
  refreshTrigger?: number;
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
  refreshTrigger,
}: FMECAContentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);

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

  // Reload data when refreshTrigger changes (triggered by AI agent updates)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && currentProject) {
      console.log("Refreshing FMECA data due to AI agent update");
      loadFMECADataFromDatabase();
    }
  }, [refreshTrigger, currentProject]);

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

          console.log("Final parsed data sample:", parsedData[0]);
          console.log("Final parsed data count:", parsedData.length);

          if (parsedData.length === 0) {
            throw new Error("No valid data rows found in the Excel file");
          }

          resolve({ data: parsedData, columns: headers });
        } catch (error) {
          console.error("Error parsing Excel file:", error);
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read the file"));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!currentProject) {
        toast("Please select a project first", {
          description: "You need to select a project before uploading data.",
        });
        return;
      }

      try {
        setIsProcessing(true);
        setSelectedFile(file);

        console.log("Processing file:", file.name);

        const { data, columns: parsedColumns } = await parseExcelFile(file);

        console.log("Setting parsed data:", {
          dataLength: data.length,
          columnsLength: parsedColumns.length,
          sampleColumns: parsedColumns.slice(0, 5),
        });

        setFmecaData(data);
        setColumns(parsedColumns);

        // Auto-save to database after successful parsing
        await saveFMECADataToDatabase(data);

        toast("File uploaded and processed successfully!", {
          description: `Loaded ${data.length} entries with ${parsedColumns.length} columns`,
        });
      } catch (error) {
        console.error("Error processing file:", error);
        toast("Failed to process file", {
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
        setSelectedFile(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [currentProject, setSelectedFile, setFmecaData, setColumns]
  );

  const handleLoadSampleData = useCallback(async () => {
    if (!currentProject) {
      toast("Please select a project first", {
        description: "You need to select a project before loading sample data.",
      });
      return;
    }

    try {
      setIsProcessing(true);

      // Use the raw sample data directly
      const sampleColumns = Object.keys(sampleFMECAData[0]);

      console.log("Loading sample data:", {
        dataLength: sampleFMECAData.length,
        columnsLength: sampleColumns.length,
      });

      setFmecaData(sampleFMECAData);
      setColumns(sampleColumns);
      setSelectedFile(null);

      // Auto-save sample data to database
      await saveFMECADataToDatabase(sampleFMECAData);

      toast("Sample FMECA data loaded successfully!", {
        description: `Loaded ${sampleFMECAData.length} sample entries`,
      });
    } catch (error) {
      console.error("Error loading sample data:", error);
      toast("Failed to load sample data", {
        description: "Please try again",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentProject, setFmecaData, setColumns, setSelectedFile]);

  const handleExport = useCallback(() => {
    if (!fmecaData.length || !columns.length) {
      toast("No data to export", {
        description: "Please load or upload FMECA data first",
      });
      return;
    }

    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Convert data to worksheet format
      const worksheet = XLSX.utils.json_to_sheet(fmecaData);

      // Add the worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "FMECA Data");

      // Generate filename
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      const filename = `FMECA_Export_${timestamp}.xlsx`;

      // Write the file
      XLSX.writeFile(workbook, filename);

      toast("Data exported successfully!", {
        description: `File saved as ${filename}`,
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast("Failed to export data", {
        description: "Please try again",
      });
    }
  }, [fmecaData, columns]);

  const handleManualSave = async () => {
    if (!currentProject) {
      toast("No project selected", {
        description: "Please select a project first.",
      });
      return;
    }

    if (!fmecaData.length) {
      toast("No data to save", {
        description: "Please load or upload FMECA data first.",
      });
      return;
    }

    await saveFMECADataToDatabase(fmecaData);
  };

  if (isLoading) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading FMECA data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full p-6", className)}>
      <div className="flex-1 flex flex-col min-h-0">
        {fmecaData.length > 0 && columns.length > 0 ? (
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

            {/* FMECA Table */}
            <div className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <TanStackFMECATable
                data={fmecaData}
                columns={columns.map((col) => ({
                  accessorKey: col,
                  header: col,
                }))}
                onDataChange={setFmecaData}
                stagedChanges={stagedChanges}
              />
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

            {/* Upload Zone */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <FileUploadZone
                onFileUpload={handleFileUpload}
                onLoadSampleData={handleLoadSampleData}
                isProcessing={isProcessing}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
