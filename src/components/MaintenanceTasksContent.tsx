import { useState, useEffect } from "react";
import {
  Bot,
  Save,
  FolderOpen,
  Plus,
  Settings,
  Download,
  Upload,
  Wrench,
} from "lucide-react";
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
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { sendMessage } = useAIChat();

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

  const saveTasksToDatabase = async () => {
    if (!currentProject || maintenanceTasksData.length === 0) {
      toast("No tasks to save", {
        description: "Generate some maintenance tasks first.",
      });
      return;
    }

    try {
      setIsSaving(true);

      await saveMaintenanceTasks(
        currentProject.id,
        maintenanceTasksData,
        tasksColumns
      );

      toast("Tasks saved successfully!", {
        description: `Saved ${maintenanceTasksData.length} maintenance tasks to the database.`,
      });
    } catch (error) {
      console.error("Failed to save tasks:", error);
      toast("Failed to save tasks", {
        description: "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateTasks = async () => {
    console.log("Generating AI tasks from FMECA data:", fmecaData);

    try {
      setIsGenerating(true);

      // Create the AI message to generate maintenance tasks
      const messages = [
        {
          id: "1",
          type: "user" as const,
          content:
            "Create a completely new table of maintenance tasks based on the FMECA data. Generate preventive maintenance tasks for each asset/component combination. Each row should be a specific maintenance task with these exact columns: Asset, Component, Task Description, Frequency, Maintenance Type, Failure Mode. Do not copy the original FMECA data - create new maintenance task records. For example, if FMECA shows 'Belt Conveyor - Idlers', create tasks like 'Inspect idler alignment', 'Lubricate idler bearings', etc. Make the frequency realistic (Daily, Weekly, Monthly, Quarterly, Annually) and maintenance type should be Preventive, Predictive, or Corrective.",
          timestamp: new Date(),
        },
      ];

      console.log("Sending AI request to generate maintenance tasks");
      const result = await sendMessage(
        messages,
        fmecaData,
        Object.keys(fmecaData[0] || {})
      );

      console.log("AI result received for maintenance tasks:", {
        hasResponse: !!result.response,
        hasUpdatedData: !!result.updatedData,
        updatedDataLength: result.updatedData?.length || 0,
      });

      // Debug: Compare original FMECA vs generated tasks
      console.log("=== COMPARISON DEBUG ===");
      console.log("Original FMECA data sample:", fmecaData[0]);
      console.log("AI Generated data sample:", result.updatedData?.[0]);
      console.log(
        "Are they the same?",
        JSON.stringify(fmecaData[0]) === JSON.stringify(result.updatedData?.[0])
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
              generatedColumns
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
                  AI-generated maintenance tasks based on FMECA analysis
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
              <Button
                variant="outline"
                onClick={handleGenerateTasks}
                disabled={!hasFMECAData || isGenerating || !currentProject}
                className="h-11"
              >
                <Bot className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating..." : "Generate Tasks"}
              </Button>

              {maintenanceTasksData.length > 0 && (
                <Button
                  onClick={saveTasksToDatabase}
                  disabled={isSaving || !currentProject}
                  className="h-11 btn-primary"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Tasks"}
                </Button>
              )}

              <Dialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
              >
                <DialogTrigger asChild>
                  <Button variant="destructive" className="h-11 ml-2">
                    Delete Table
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
                            tasksColumns
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-8">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  AI-Powered Task Generation
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Ready to generate maintenance tasks from your FMECA analysis
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
                <div className="flex items-start gap-3">
                  <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Ready for Task Generation
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Your FMECA analysis contains {fmecaData.length} entries
                      that can be processed by the AI assistant to generate
                      targeted maintenance tasks.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <Button
                  onClick={handleGenerateTasks}
                  disabled={isGenerating || !currentProject}
                  className="btn-primary px-8 py-3 text-lg font-medium"
                  size="lg"
                >
                  <Bot className="h-5 w-5 mr-2" />
                  {isGenerating
                    ? "Generating Tasks..."
                    : "Generate Tasks with AI"}
                </Button>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  AI will analyze your FMECA data to create preventive,
                  predictive, and corrective maintenance tasks
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
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
