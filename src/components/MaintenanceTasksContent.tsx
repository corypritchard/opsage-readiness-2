import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  FolderOpen,
  Plus,
  Settings,
  Download,
  Upload,
  Wrench,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TanStackFMECATable } from "./TanStackFMECATable";
import { toast } from "@/components/ui/sonner";
import { useAIChat } from "@/hooks/useAIChat";
import { useProject } from "@/contexts/ProjectContext";
import { ColumnDef } from "@tanstack/react-table";
import {
  createFMECAProject,
  getFMECAProjects,
  saveFMECAData,
  getFMECAData,
  saveMaintenanceTasks,
  getMaintenanceTasks,
} from "@/integrations/supabase/maintenance-tasks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateMaintenanceTasksWithAI } from "@/services/maintenanceTaskAI";
import { getAssets, type Asset } from "@/integrations/supabase/assets";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronsUpDown } from "lucide-react";

interface MaintenanceTasksContentProps {
  fmecaData: any[];
  selectedFile?: File | null;
  addChatMessage?: ((message: any) => void) | null;
}

type FMECAProject = {
  id: string;
  name: string;
  description: string | null;
  file_name: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
};

export function MaintenanceTasksContent({
  fmecaData,
  selectedFile,
  addChatMessage,
}: MaintenanceTasksContentProps) {
  const { currentProject } = useProject();
  const hasFMECAData = fmecaData.length > 0;
  const [maintenanceTasksData, setMaintenanceTasksData] = useState<any[]>([]);
  const [tasksColumns, setTasksColumns] = useState<ColumnDef<any>[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState({
    Corrective: true,
    Preventive: true,
    Predictive: true,
  });

  const { sendMessage } = useAIChat();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  // Load real assets from database
  useEffect(() => {
    const loadAssets = async () => {
      if (!currentProject?.id) {
        setAssets([]);
        setSelectedAssets([]);
        return;
      }
      setAssetsLoading(true);
      try {
        const { data } = await getAssets(currentProject.id);
        setAssets(data);
        setSelectedAssets(data.map((a: Asset) => a.name));
      } catch (e) {
        setAssets([]);
        setSelectedAssets([]);
      } finally {
        setAssetsLoading(false);
      }
    };
    loadAssets();
  }, [currentProject?.id]);

  const handleAssetToggle = (assetName: string) => {
    setSelectedAssets((prev) =>
      prev.includes(assetName)
        ? prev.filter((a) => a !== assetName)
        : [...prev, assetName]
    );
  };

  // Load maintenance tasks when project changes
  useEffect(() => {
    // Always clear data first when project changes
    setMaintenanceTasksData([]);
    setTasksColumns([]);

    if (currentProject) {
      loadMaintenanceTasks();
    }
  }, [currentProject]);

  const loadMaintenanceTasks = async () => {
    if (!currentProject) return;

    try {
      setIsLoading(true);
      const { tasks, columns } = await getMaintenanceTasks(currentProject.id);

      if (tasks.length > 0) {
        setMaintenanceTasksData(tasks);
        setTasksColumns(columns);
      }
      // Data is already cleared in useEffect, so empty projects stay empty
    } catch (error) {
      console.error("Failed to load maintenance tasks:", error);
      toast("Failed to load maintenance tasks", {
        description: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeChange = (type: string) => {
    setSelectedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleGenerateTasks = async () => {
    console.log("Generating AI tasks from FMECA data:", fmecaData);

    // Match by exact name or by keyword (first token) to account for codes like "Conveyor CVR001"
    const selectedKeywords = selectedAssets.map((n) => n.split(" ")[0]);
    const filteredFmecaData = fmecaData.filter((row) =>
      selectedAssets.includes(row["Asset Type"]) ||
      selectedKeywords.includes(String(row["Asset Type"]))
    );
    if (filteredFmecaData.length === 0) {
      toast("No assets selected", {
        description: "Please select at least one asset.",
      });
      return;
    }

    // Build prompt based on selected types
    const selected = Object.entries(selectedTypes)
      .filter(([_, v]) => v)
      .map(([k]) => k);
    let customPrompt = "";
    if (selected.length === 0 || selected.length === 3) {
      customPrompt =
        "Create a completely new table of maintenance tasks based on the FMECA data. Generate preventive, predictive, and corrective maintenance tasks for each asset/component combination. Each row should be a specific maintenance task with these exact columns: Asset, Component, Task Description, Frequency, Maintenance Type, Failure Mode. Do not copy the original FMECA data - create new maintenance task records. For example, if FMECA shows 'Belt Conveyor - Idlers', create tasks like 'Inspect idler alignment', 'Lubricate idler bearings', etc. Make the frequency realistic (Daily, Weekly, Monthly, Quarterly, Annually) and maintenance type should be Preventive, Predictive, or Corrective.";
    } else {
      customPrompt = `Create a completely new table of maintenance tasks based on the FMECA data. Only generate ${selected.join(
        ", "
      )} maintenance tasks for each asset/component combination. Each row should be a specific maintenance task with these exact columns: Asset, Component, Task Description, Frequency, Maintenance Type, Failure Mode. Do not copy the original FMECA data - create new maintenance task records. For example, if FMECA shows 'Belt Conveyor - Idlers', create tasks like 'Inspect idler alignment', 'Lubricate idler bearings', etc. Make the frequency realistic (Daily, Weekly, Monthly, Quarterly, Annually) and maintenance type should be ${selected.join(
        ", "
      )}.`;
    }

    try {
      setIsGenerating(true);
      const result = await generateMaintenanceTasksWithAI(
        filteredFmecaData,
        Object.keys(filteredFmecaData[0] || {}),
        customPrompt
      );

      console.log("AI result received for maintenance tasks:", {
        hasResponse: !!result.response,
        hasUpdatedData: !!result.updatedData,
        updatedDataLength: result.updatedData?.length || 0,
      });

      // Debug: Compare original FMECA vs generated tasks
      console.log("=== COMPARISON DEBUG ===");
      console.log("Original FMECA data sample:", filteredFmecaData[0]);
      console.log("AI Generated data sample:", result.updatedData?.[0]);
      console.log(
        "Are they the same?",
        JSON.stringify(filteredFmecaData[0]) ===
          JSON.stringify(result.updatedData?.[0])
      );
      console.log("========================");

      if (result.updatedData && result.updatedData.length > 0) {
        // Extract columns from the first row of generated data
        const generatedColumnNames = Object.keys(result.updatedData[0]);

        // Convert column names to proper TanStack Table column definitions
        const generatedColumns = generatedColumnNames.map((columnName) => ({
          id: columnName,
          header: columnName,
          accessorKey: columnName,
        }));

        setMaintenanceTasksData(result.updatedData);
        setTasksColumns(generatedColumns);

        toast("Maintenance tasks generated successfully!", {
          description: `Generated ${result.updatedData.length} maintenance tasks based on your FMECA analysis`,
        });

        // Add message to AI chat
        if (addChatMessage) {
          addChatMessage({
            id: Date.now().toString(),
            role: "assistant" as const,
            content: `I've generated ${result.updatedData.length} maintenance tasks based on your FMECA analysis. The tasks include preventive, predictive, and corrective maintenance activities tailored to the failure modes identified in your data.`,
            timestamp: new Date(),
            functionCalls: [],
            thinking: [],
          });
        }

        // Auto-save to database if we have a current project
        if (currentProject) {
          try {
            console.log(
              "Attempting to auto-save tasks for project:",
              currentProject.id
            );
            console.log("Generated columns:", generatedColumns);
            console.log("Generated tasks sample:", result.updatedData[0]);

            await saveMaintenanceTasks(
              currentProject.id,
              result.updatedData,
              generatedColumns.filter(isColumnShape)
            );
            toast("Tasks auto-saved to database!", {
              description:
                "Your generated tasks have been automatically saved.",
            });
          } catch (error) {
            console.error("Failed to auto-save tasks:", error);
            toast("Failed to auto-save tasks", {
              description: `Error: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            });
          }
        }
      } else {
        // If no structured data was returned, show error
        toast("Failed to generate structured tasks", {
          description:
            "The AI didn't return properly formatted maintenance tasks. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error generating tasks:", error);
      toast("Failed to generate tasks", {
        description:
          "There was an error generating maintenance tasks. Please try again.",
      });
    } finally {
      setIsGenerating(false);
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
        setIsGenerating(true); // Reuse the loading state

        console.log("Processing maintenance tasks file:", file.name);

        const { data, columns: parsedColumns } = await parseExcelFile(file);

        console.log("Setting parsed maintenance tasks data:", {
          dataLength: data.length,
          columnsLength: parsedColumns.length,
          sampleColumns: parsedColumns.slice(0, 5),
        });

        // Convert column names to proper TanStack Table column definitions
        const columnDefinitions = parsedColumns.map((columnName) => ({
          id: columnName,
          header: columnName,
          accessorKey: columnName,
        }));

        setMaintenanceTasksData(data);
        setTasksColumns(columnDefinitions);

        // Auto-save to database after successful parsing
        await saveMaintenanceTasks(currentProject.id, data, columnDefinitions);

        toast("Maintenance tasks file uploaded and processed successfully!", {
          description: `Loaded ${data.length} entries with ${parsedColumns.length} columns`,
        });
      } catch (error) {
        console.error("Error processing maintenance tasks file:", error);
        toast("Failed to process file", {
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [currentProject]
  );

  const handleExport = useCallback(() => {
    if (!maintenanceTasksData.length || !tasksColumns.length) {
      toast("No data to export", {
        description: "Please load or generate maintenance tasks first",
      });
      return;
    }

    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Convert data to worksheet format
      const worksheet = XLSX.utils.json_to_sheet(maintenanceTasksData);

      // Add the worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Maintenance Tasks");

      // Generate filename
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      const filename = `Maintenance_Tasks_Export_${timestamp}.xlsx`;

      // Write the file
      XLSX.writeFile(workbook, filename);

      toast("Maintenance tasks exported successfully!", {
        description: `File saved as ${filename}`,
      });
    } catch (error) {
      console.error("Error exporting maintenance tasks data:", error);
      toast("Failed to export data", {
        description: "Please try again",
      });
    }
  }, [maintenanceTasksData, tasksColumns]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset the input value so the same file can be selected again
    e.target.value = "";
  };

  // Add a type guard for column shape
  function isColumnShape(
    col: any
  ): col is { id: string; header: string; accessorKey: string } {
    return (
      typeof col === "object" &&
      typeof col.id === "string" &&
      typeof col.header === "string" &&
      typeof col.accessorKey === "string"
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50/50 dark:bg-gray-900/50">
      <div className="h-full flex flex-col w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl icon-primary">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Maintenance Tasks
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Automatically generate maintenance tasks based on FMECA
                </p>
              </div>
              {maintenanceTasksData.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Settings className="h-3 w-3" />
                  {maintenanceTasksData.length} tasks
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center h-11 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                <Upload className="h-4 w-4 mr-2" />
                Import
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileInputChange}
                  disabled={isGenerating}
                />
              </label>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={!maintenanceTasksData.length || !tasksColumns.length}
                className="h-11"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>

              <Dialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
              >
                <DialogTrigger asChild>
                  <Button variant="destructive" className="h-11 ml-2">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Entire Table?</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    Are you sure you want to delete all maintenance tasks? This
                    cannot be undone.
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        setMaintenanceTasksData([]);
                        setShowDeleteDialog(false);
                        if (currentProject) {
                          await saveMaintenanceTasks(
                            currentProject.id,
                            [],
                            tasksColumns.filter(isColumnShape)
                          );
                        }
                        toast("Maintenance tasks table deleted and saved.");
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {!currentProject ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-center py-16 text-center">
              <div>
                <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Project Selected
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                  Select a project from the header to view and manage
                  maintenance tasks.
                </p>
              </div>
            </div>
          </div>
        ) : !hasFMECAData && maintenanceTasksData.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-gray-100 dark:bg-gray-700 p-6 mb-6">
                <Bot className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No FMECA Data Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                To generate maintenance tasks, you need to first upload and
                analyze your FMECA data in the FMECA tab.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Switch to the <strong>FMECA</strong> tab to get started.
              </p>
            </div>
          </div>
        ) : currentProject &&
          hasFMECAData &&
          maintenanceTasksData.length === 0 &&
          !isLoading ? (
          <Card className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <CardHeader className="text-center space-y-0 pb-4">
              <h3 className="text-2xl font-bold">Automated Task Generation</h3>
              <p className="text-muted-foreground text-sm">
                Choose assets and maintenance types, then let the assistant
                create your task list
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Asset selection */}
              <div className="space-y-2 text-center">
                <h4 className="text-sm font-medium">Assets</h4>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-64 justify-between"
                      disabled={assetsLoading || assets.length === 0}
                    >
                      {selectedAssets.length > 0
                        ? `${selectedAssets.length} selected`
                        : "Select assets"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search assets…" />
                      <CommandEmpty>No asset found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {assets.map((asset) => {
                            const selected = selectedAssets.includes(
                              asset.name
                            );
                            return (
                              <CommandItem
                                key={asset.id}
                                onSelect={() => handleAssetToggle(asset.name)}
                                className="cursor-pointer"
                              >
                                <Checkbox
                                  checked={selected}
                                  className="mr-2"
                                  aria-hidden="true"
                                />
                                <span>{asset.name}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedAssets.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 justify-center">
                    {selectedAssets.slice(0, 4).map((name) => (
                      <span
                        key={name}
                        className="text-xs bg-muted px-2 py-0.5 rounded-full"
                      >
                        {name}
                      </span>
                    ))}
                    {selectedAssets.length > 4 && (
                      <span className="text-xs text-muted-foreground">
                        +{selectedAssets.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Maintenance type selection */}
              <div className="space-y-2 text-center">
                <h4 className="text-sm font-medium">Maintenance Types</h4>
                <div className="flex flex-wrap justify-center gap-2">
                  {(["Corrective", "Preventive", "Predictive"] as const).map(
                    (type) => {
                      const selected = selectedTypes[type];
                      return (
                        <label
                          key={type}
                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs border cursor-pointer transition-colors ${
                            selected
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-accent"
                          }`}
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => handleTypeChange(type)}
                            className="h-4 w-4"
                          />
                          <span>{type}</span>
                        </label>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Generate button */}
              <div className="text-center pt-2">
                <Button
                  onClick={handleGenerateTasks}
                  disabled={
                    isGenerating ||
                    !currentProject ||
                    selectedAssets.length === 0 ||
                    assets.length === 0
                  }
                  size="lg"
                  className="px-8"
                >
                  <Bot className="h-5 w-5 mr-2" />
                  {isGenerating ? "Generating…" : "Generate Tasks"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden text-sm">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Loading maintenance tasks...
                  </p>
                </div>
              </div>
            ) : (
              <TanStackFMECATable
                data={maintenanceTasksData}
                columns={tasksColumns}
                onDataChange={setMaintenanceTasksData}
                stagedChanges={null}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
