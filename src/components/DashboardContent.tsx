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
import { getAssets } from "@/integrations/supabase/assets";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
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
    } else {
      // Clear everything when no project is selected
      setStats({
        equipmentCount: 0,
        fmecaRowsCount: 0,
        maintenanceTasksCount: 0,
        documentsCount: 0,
      });
      setRecentActions([]);
    }
  }, [currentProject]);

  const loadProjectStats = async () => {
    if (!currentProject || !user) return;

    try {
      setLoading(true);

      // Get real assets count from assets table
      const { data: assetsData } = await getAssets(currentProject.id);
      const equipmentCount = assetsData.length;

      // Get FMECA data to count rows
      const fmecaResult = await getFMECAData(currentProject.id);
      const fmecaRowsCount = fmecaResult.data.length;

      // Get maintenance tasks count
      const { tasks } = await getMaintenanceTasks(currentProject.id);
      const maintenanceTasksCount = tasks.length;

      // Get real documents count from database
      const { data: documentsData, error: documentsError } = await supabase
        .from("documents")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .eq("project_id", currentProject.id);

      if (documentsError) {
        console.error("Failed to fetch documents count:", documentsError);
      }

      const documentsCount = documentsData?.length || 0;

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

  const loadRecentActions = async () => {
    if (!currentProject) {
      setRecentActions([]);
      return;
    }

    // For now, show empty recent actions for new projects
    // In a real implementation, this would query an activity log table by project ID
    setRecentActions([]);

    // TODO: Implement real activity log loading
    // const actions = await getProjectActivityLog(currentProject.id);
    // setRecentActions(actions);
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
      <div className="w-full p-6 space-y-8">
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
              <p className="text-xs text-muted-foreground">Assets in project</p>
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
