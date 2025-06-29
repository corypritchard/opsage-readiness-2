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
  Plus,
  Edit,
  Check,
  X,
  Star,
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
  const {
    currentProject,
    projects,
    loadProjects,
    createProject,
    deleteProject,
    setCurrentProject,
  } = useProject();
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

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: "",
    description: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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

  const handleCreateProject = async () => {
    if (!newProjectForm.name.trim()) {
      toast("Project name required", {
        description: "Please enter a project name.",
      });
      return;
    }

    try {
      setIsCreating(true);
      await createProject({
        name: newProjectForm.name.trim(),
        description: newProjectForm.description.trim(),
      });

      setNewProjectForm({ name: "", description: "" });
      setShowAddProject(false);

      toast("Project created successfully!", {
        description: "Your new project has been created and selected.",
      });
    } catch (error) {
      console.error("Failed to create project:", error);
      toast("Failed to create project", {
        description: "There was an error creating your project.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (project: any) => {
    setEditingProjectId(project.id);
    setEditForm({
      name: project.name,
      description: project.description || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      toast("Project name required", {
        description: "Please enter a project name.",
      });
      return;
    }

    try {
      setIsUpdating(true);
      await updateFMECAProject(editingProjectId!, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
      });

      await loadProjects();
      setEditingProjectId(null);

      toast("Project updated successfully!", {
        description: "Your project details have been saved.",
      });
    } catch (error) {
      console.error("Failed to update project:", error);
      toast("Failed to update project", {
        description: "There was an error saving your changes.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
    setEditForm({ name: "", description: "" });
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setIsDeleting(projectId);
      await deleteProject(projectId);

      toast("Project deleted successfully!", {
        description: "The project and all its data have been removed.",
      });
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast("Failed to delete project", {
        description: "There was an error deleting the project.",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50/50 dark:bg-gray-900/50">
      <div className="h-full flex flex-col w-full px-4 py-8 sm:px-6 lg:px-8">
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
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FolderOpen className="h-5 w-5" />
                          Project Management
                        </CardTitle>
                        <CardDescription>
                          Manage your projects, edit details, or create new ones
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => setShowAddProject(true)}
                        className="btn-primary"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Project
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Add Project Form */}
                    {showAddProject && (
                      <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <h4 className="font-medium mb-4">Create New Project</h4>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="newProjectName">Project Name</Label>
                            <Input
                              id="newProjectName"
                              value={newProjectForm.name}
                              onChange={(e) =>
                                setNewProjectForm((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              placeholder="Enter project name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="newProjectDescription">
                              Description (Optional)
                            </Label>
                            <Textarea
                              id="newProjectDescription"
                              value={newProjectForm.description}
                              onChange={(e) =>
                                setNewProjectForm((prev) => ({
                                  ...prev,
                                  description: e.target.value,
                                }))
                              }
                              placeholder="Describe your project"
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleCreateProject}
                              disabled={
                                isCreating || !newProjectForm.name.trim()
                              }
                              className="btn-primary"
                            >
                              {isCreating ? "Creating..." : "Create Project"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowAddProject(false);
                                setNewProjectForm({
                                  name: "",
                                  description: "",
                                });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Projects List */}
                    <div className="space-y-4">
                      {projects.length === 0 ? (
                        <div className="text-center py-8">
                          <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            No Projects Yet
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Create your first project to get started with FMECA
                            analysis.
                          </p>
                          <Button
                            onClick={() => setShowAddProject(true)}
                            className="btn-primary"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Project
                          </Button>
                        </div>
                      ) : (
                        projects.map((project) => (
                          <div
                            key={project.id}
                            className={`p-4 border rounded-lg transition-colors ${
                              currentProject?.id === project.id
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            }`}
                          >
                            {editingProjectId === project.id ? (
                              // Edit Mode
                              <div className="space-y-4">
                                <div>
                                  <Label>Project Name</Label>
                                  <Input
                                    value={editForm.name}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                      }))
                                    }
                                    placeholder="Enter project name"
                                  />
                                </div>
                                <div>
                                  <Label>Description</Label>
                                  <Textarea
                                    value={editForm.description}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                      }))
                                    }
                                    placeholder="Project description"
                                    rows={3}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={handleSaveEdit}
                                    disabled={
                                      isUpdating || !editForm.name.trim()
                                    }
                                    size="sm"
                                    className="btn-primary"
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    {isUpdating ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                    size="sm"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // View Mode
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                      {project.name}
                                    </h4>
                                    {currentProject?.id === project.id && (
                                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        <Star className="h-3 w-3 mr-1" />
                                        Active
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {project.description || "No description"}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                    Created:{" "}
                                    {new Date(
                                      project.created_at
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  {currentProject?.id !== project.id && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCurrentProject(project)}
                                    >
                                      Select
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStartEdit(project)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Delete Project
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "
                                          {project.name}"? This will permanently
                                          remove the project and all associated
                                          data including FMECA analysis and
                                          maintenance tasks. This action cannot
                                          be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteProject(project.id)
                                          }
                                          disabled={isDeleting === project.id}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          {isDeleting === project.id
                                            ? "Deleting..."
                                            : "Delete Project"}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
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
