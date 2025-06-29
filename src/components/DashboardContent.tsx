import React, { useEffect, useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Wrench,
  Package,
  FileText,
  Clock,
  CheckCircle,
  User,
} from "lucide-react";
import {
  getFMECAData,
  getMaintenanceTasks,
} from "@/integrations/supabase/maintenance-tasks";

interface ProjectStats {
  equipmentCount: number;
  fmecaRowsCount: number;
  maintenanceTasksCount: number;
  documentsCount: number;
}

interface RecentAction {
  id: string;
  time: string;
  action: string;
  user: string;
  details: string;
  status: "complete" | "pending" | "error";
}

export function DashboardContent() {
  const { currentProject } = useProject();
  const [stats, setStats] = useState<ProjectStats>({
    equipmentCount: 0,
    fmecaRowsCount: 0,
    maintenanceTasksCount: 0,
    documentsCount: 0,
  });
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentProject) {
      loadProjectStats();
      loadRecentActions();
    }
  }, [currentProject]);

  const loadProjectStats = async () => {
    if (!currentProject) return;

    try {
      setLoading(true);

      // Get FMECA data to count rows and equipment
      const fmecaData = await getFMECAData(currentProject.id);
      const fmecaRowsCount = fmecaData.length;

      // Count unique equipment/assets from FMECA data
      const equipmentSet = new Set();
      fmecaData.forEach((row) => {
        if (row["Asset Type"]) equipmentSet.add(row["Asset Type"]);
        if (row["Component"]) equipmentSet.add(row["Component"]);
      });
      const equipmentCount = equipmentSet.size;

      // Get maintenance tasks count
      const { tasks } = await getMaintenanceTasks(currentProject.id);
      const maintenanceTasksCount = tasks.length;

      // For now, documents count = 1 if we have FMECA data, 0 if not
      const documentsCount = fmecaRowsCount > 0 ? 1 : 0;

      setStats({
        equipmentCount,
        fmecaRowsCount,
        maintenanceTasksCount,
        documentsCount,
      });
    } catch (error) {
      console.error("Failed to load project stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActions = () => {
    // For now, mock recent actions - in a real implementation, this would come from an activity log table
    const mockActions: RecentAction[] = [
      {
        id: "1",
        time: "2 hours ago",
        action: "FMECA Data Uploaded",
        user: "Current User",
        details: "Sample_FMECA_Data.xlsx (6 rows)",
        status: "complete",
      },
      {
        id: "2",
        time: "1 hour ago",
        action: "Maintenance Tasks Generated",
        user: "AI Assistant",
        details: "Generated from FMECA analysis",
        status: "complete",
      },
      {
        id: "3",
        time: "30 min ago",
        action: "Data Saved to Database",
        user: "System",
        details: "Project data synchronized",
        status: "complete",
      },
    ];
    setRecentActions(mockActions);
  };

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Package className="h-16 w-16 text-gray-400 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              No Project Selected
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Create or select a project to view the dashboard
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Project Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {currentProject.name}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {currentProject.description ||
              "Maintenance documentation analysis and task generation"}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Equipment</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stats.equipmentCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Unique assets & components
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stats.documentsCount}
              </div>
              <p className="text-xs text-muted-foreground">Files imported</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">FMECA Rows</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stats.fmecaRowsCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Failure modes analyzed
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Maintenance Tasks
              </CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stats.maintenanceTasksCount}
              </div>
              <p className="text-xs text-muted-foreground">Tasks generated</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Actions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Time
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Action
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      User
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Details
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentActions.length > 0 ? (
                    recentActions.map((action) => (
                      <tr
                        key={action.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {action.time}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                          {action.action}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {action.user}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {action.details}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              action.status === "complete"
                                ? "default"
                                : "secondary"
                            }
                            className={
                              action.status === "complete"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : ""
                            }
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {action.status === "complete"
                              ? "Complete"
                              : "Pending"}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        No recent actions to display
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
