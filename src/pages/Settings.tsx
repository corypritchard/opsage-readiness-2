import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Bot,
  Download,
  Trash2,
  Save,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  createFMECAProject,
  updateFMECAProject,
} from "@/integrations/supabase/maintenance-tasks";

export default function SettingsPage() {
  const { user } = useAuth();
  const { currentProject, projects, loadProjects } = useProject();
  const { theme, setTheme } = useTheme();

  // Settings state
  const [userSettings, setUserSettings] = useState({
    displayName: user?.email?.split("@")[0] || "",
    email: user?.email || "",
    company: "",
    timezone: "UTC",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    taskReminders: true,
    projectUpdates: false,
    weeklyReports: true,
  });

  const [aiSettings, setAiSettings] = useState({
    aiModel: "gpt-4",
    confidence: "medium",
    autoSave: true,
    suggestTasks: true,
  });

  const [exportSettings, setExportSettings] = useState({
    defaultFormat: "excel",
    includeCharts: true,
    includeMetadata: true,
    compression: false,
  });

  const [projectSettings, setProjectSettings] = useState({
    name: currentProject?.name || "",
    description: currentProject?.description || "",
  });

  const handleSaveSettings = () => {
    toast("Settings saved successfully!", {
      description: "Your preferences have been updated.",
    });
  };

  const handleClearCache = () => {
    toast("Cache cleared!", {
      description: "Application cache has been cleared.",
    });
  };

  const handleSaveProject = async () => {
    if (!currentProject) {
      toast("No project selected", {
        description: "Please select a project to update.",
      });
      return;
    }

    if (!projectSettings.name.trim()) {
      toast("Project name required", {
        description: "Please enter a project name before saving.",
      });
      return;
    }

    try {
      await updateFMECAProject(currentProject.id, {
        name: projectSettings.name.trim(),
        description: projectSettings.description.trim(),
      });

      // Refresh project data to reflect the changes
      await loadProjects();

      toast("Project updated successfully!", {
        description: "Your project details have been saved.",
      });
    } catch (error) {
      console.error("Failed to update project:", error);
      toast("Failed to update project", {
        description: "There was an error saving your project details.",
      });
    }
  };

  // Update project settings when current project changes
  useEffect(() => {
    if (currentProject) {
      setProjectSettings({
        name: currentProject.name || "",
        description: currentProject.description || "",
      });
    }
  }, [currentProject]);

  return (
    <div className="h-screen overflow-hidden bg-gray-50/50 dark:bg-gray-900/50">
      <div className="h-full flex flex-col mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl icon-primary">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Settings
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage your account, preferences, and platform configuration
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSaveSettings} className="btn-primary">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 min-h-0">
          <Tabs defaultValue="account" className="h-full">
            <TabsList className="grid w-full grid-cols-7 mb-6">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="project">Project</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="ai">AI & Analysis</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <div className="h-full overflow-y-auto">
              {/* Account Settings */}
              <TabsContent value="account" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Profile Information
                    </CardTitle>
                    <CardDescription>
                      Update your personal information and account details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          value={userSettings.displayName}
                          onChange={(e) =>
                            setUserSettings((prev) => ({
                              ...prev,
                              displayName: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          value={userSettings.email}
                          disabled
                          className="bg-gray-50 dark:bg-gray-800"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          value={userSettings.company}
                          onChange={(e) =>
                            setUserSettings((prev) => ({
                              ...prev,
                              company: e.target.value,
                            }))
                          }
                          placeholder="Your organization"
                        />
                      </div>
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select
                          value={userSettings.timezone}
                          onValueChange={(value) =>
                            setUserSettings((prev) => ({
                              ...prev,
                              timezone: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="EST">Eastern Time</SelectItem>
                            <SelectItem value="PST">Pacific Time</SelectItem>
                            <SelectItem value="GMT">
                              Greenwich Mean Time
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Current Project</CardTitle>
                    <CardDescription>
                      Your active project and usage statistics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {currentProject ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {currentProject.name}
                          </span>
                          <Badge className="bg-green-50 text-green-700 ring-green-600/20">
                            Active
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Created:{" "}
                          {new Date(
                            currentProject.created_at
                          ).toLocaleDateString()}
                        </div>
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {projects.length}
                            </div>
                            <div className="text-sm text-gray-500">
                              Total Projects
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              0
                            </div>
                            <div className="text-sm text-gray-500">
                              FMECA Analyses
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              0
                            </div>
                            <div className="text-sm text-gray-500">
                              Generated Tasks
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">
                        No active project selected
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Project Settings */}
              <TabsContent value="project" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      Project Information
                    </CardTitle>
                    <CardDescription>
                      Update your project title and description
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentProject ? (
                      <>
                        <div>
                          <Label htmlFor="projectName">Project Title</Label>
                          <Input
                            id="projectName"
                            value={projectSettings.name}
                            onChange={(e) =>
                              setProjectSettings((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            placeholder="Enter project title"
                          />
                        </div>
                        <div>
                          <Label htmlFor="projectDescription">
                            Project Description
                          </Label>
                          <Textarea
                            id="projectDescription"
                            value={projectSettings.description}
                            onChange={(e) =>
                              setProjectSettings((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Describe your project, its scope, and objectives"
                            rows={4}
                          />
                        </div>
                        <div className="flex justify-end pt-4">
                          <Button
                            onClick={handleSaveProject}
                            className="btn-primary"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Project Details
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          No Project Selected
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Please create or select a project to edit its details.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {currentProject && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Statistics</CardTitle>
                      <CardDescription>
                        Overview of your project activity and progress
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {new Date(
                              currentProject.created_at
                            ).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Created Date
                          </div>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            Active
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Project Status
                          </div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            0
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            FMECA Files
                          </div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            0
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Tasks Generated
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Notification Settings */}
              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Preferences
                    </CardTitle>
                    <CardDescription>
                      Configure how and when you receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Receive updates via email
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.emailNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            emailNotifications: checked,
                          }))
                        }
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Task Reminders</Label>
                        <p className="text-sm text-gray-500">
                          Get reminded about pending maintenance tasks
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.taskReminders}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            taskReminders: checked,
                          }))
                        }
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Project Updates</Label>
                        <p className="text-sm text-gray-500">
                          Notifications when project data changes
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.projectUpdates}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            projectUpdates: checked,
                          }))
                        }
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Weekly Reports</Label>
                        <p className="text-sm text-gray-500">
                          Summary of your reliability analysis progress
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.weeklyReports}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            weeklyReports: checked,
                          }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Appearance Settings */}
              <TabsContent value="appearance" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Appearance & Theme
                    </CardTitle>
                    <CardDescription>
                      Customize the look and feel of your workspace
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>Theme</Label>
                      <p className="text-sm text-gray-500 mb-3">
                        Choose your preferred color scheme
                      </p>
                      <Select value={theme} onValueChange={setTheme}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div>
                      <Label>Interface Density</Label>
                      <p className="text-sm text-gray-500 mb-3">
                        Adjust the spacing and size of UI elements
                      </p>
                      <Select defaultValue="comfortable">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">Compact</SelectItem>
                          <SelectItem value="comfortable">
                            Comfortable
                          </SelectItem>
                          <SelectItem value="spacious">Spacious</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AI Settings */}
              <TabsContent value="ai" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      AI Analysis Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure AI-powered FMECA analysis and task generation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>AI Model</Label>
                      <p className="text-sm text-gray-500 mb-3">
                        Select the AI model for analysis
                      </p>
                      <Select
                        value={aiSettings.aiModel}
                        onValueChange={(value) =>
                          setAiSettings((prev) => ({ ...prev, aiModel: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4">
                            GPT-4 (Recommended)
                          </SelectItem>
                          <SelectItem value="gpt-3.5">GPT-3.5 Turbo</SelectItem>
                          <SelectItem value="claude">Claude 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Confidence Level</Label>
                      <p className="text-sm text-gray-500 mb-3">
                        Minimum confidence for AI suggestions
                      </p>
                      <Select
                        value={aiSettings.confidence}
                        onValueChange={(value) =>
                          setAiSettings((prev) => ({
                            ...prev,
                            confidence: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low (60%)</SelectItem>
                          <SelectItem value="medium">Medium (75%)</SelectItem>
                          <SelectItem value="high">High (90%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-save AI Results</Label>
                        <p className="text-sm text-gray-500">
                          Automatically save AI-generated tasks
                        </p>
                      </div>
                      <Switch
                        checked={aiSettings.autoSave}
                        onCheckedChange={(checked) =>
                          setAiSettings((prev) => ({
                            ...prev,
                            autoSave: checked,
                          }))
                        }
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Smart Task Suggestions</Label>
                        <p className="text-sm text-gray-500">
                          Get proactive maintenance task recommendations
                        </p>
                      </div>
                      <Switch
                        checked={aiSettings.suggestTasks}
                        onCheckedChange={(checked) =>
                          setAiSettings((prev) => ({
                            ...prev,
                            suggestTasks: checked,
                          }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Export Settings */}
              <TabsContent value="export" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Export & Reporting
                    </CardTitle>
                    <CardDescription>
                      Configure default export settings and report formats
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>Default Export Format</Label>
                      <p className="text-sm text-gray-500 mb-3">
                        Preferred format for exporting data
                      </p>
                      <Select
                        value={exportSettings.defaultFormat}
                        onValueChange={(value) =>
                          setExportSettings((prev) => ({
                            ...prev,
                            defaultFormat: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="pdf">PDF Report</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Include Charts</Label>
                        <p className="text-sm text-gray-500">
                          Add visual charts to exports
                        </p>
                      </div>
                      <Switch
                        checked={exportSettings.includeCharts}
                        onCheckedChange={(checked) =>
                          setExportSettings((prev) => ({
                            ...prev,
                            includeCharts: checked,
                          }))
                        }
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Include Metadata</Label>
                        <p className="text-sm text-gray-500">
                          Export timestamps and project information
                        </p>
                      </div>
                      <Switch
                        checked={exportSettings.includeMetadata}
                        onCheckedChange={(checked) =>
                          setExportSettings((prev) => ({
                            ...prev,
                            includeMetadata: checked,
                          }))
                        }
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Compression</Label>
                        <p className="text-sm text-gray-500">
                          Compress large exports to ZIP files
                        </p>
                      </div>
                      <Switch
                        checked={exportSettings.compression}
                        onCheckedChange={(checked) =>
                          setExportSettings((prev) => ({
                            ...prev,
                            compression: checked,
                          }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Advanced Settings */}
              <TabsContent value="advanced" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Advanced Configuration
                    </CardTitle>
                    <CardDescription>
                      System settings and data management options
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Button onClick={handleClearCache} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Clear Cache
                      </Button>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export All Data
                      </Button>
                    </div>
                    <Separator />
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
                        Danger Zone
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                        These actions are permanent and cannot be undone.
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will
                              permanently delete your account and remove all
                              your data from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                              Delete Account
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
