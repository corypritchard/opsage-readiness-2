import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Settings, FolderOpen, Plus, X, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";

const DashboardHeader = () => {
  const { user, signOut } = useAuth();
  const { resolvedTheme } = useTheme();
  const {
    projects,
    currentProject,
    setCurrentProject,
    createProject,
    deleteProject,
  } = useProject();
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast("Project name is required", {
        description: "Please enter a name for your project.",
      });
      return;
    }

    try {
      setIsCreating(true);
      await createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      });

      toast("Project created successfully!", {
        description: `Created project "${newProjectName}"`,
      });

      setShowProjectDialog(false);
      setNewProjectName("");
      setNewProjectDescription("");
    } catch (error) {
      console.error("Failed to create project:", error);
      toast("Failed to create project", {
        description: "Please try again.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!currentProject) return;

    try {
      setIsDeleting(true);
      await deleteProject(currentProject.id);

      toast("Project deleted successfully!", {
        description: `Deleted project "${currentProject.name}"`,
      });
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast("Failed to delete project", {
        description: "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-gradient-to-r from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-sm overflow-hidden">
      {/* Background Arcs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg
          className="absolute -top-16 left-1/4 w-48 h-48 text-foreground/5"
          style={{ transform: "rotate(45deg)" }}
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M180,100a80,80 0 1,1 -160,0"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="butt"
          />
        </svg>
        <svg
          className="absolute bottom-0 -right-10 w-40 h-40 text-foreground/5"
          style={{ transform: "rotate(-30deg)" }}
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M180,100a80,80 0 1,1 -160,0"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="butt"
          />
        </svg>
        <svg
          className="absolute -bottom-8 left-10 w-28 h-28 text-foreground/5"
          style={{ transform: "rotate(120deg)" }}
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M180,100a80,80 0 1,1 -160,0"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="butt"
          />
        </svg>
      </div>

      <div className="relative flex items-center justify-between px-6 py-3 z-10">
        {/* Left side - Logo and Project Info */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
          <img
            src={
              resolvedTheme === "dark"
                ? "/lovable-uploads/99e1c9c8-57aa-4386-91f7-9fba40624b01-white.png"
                : "/lovable-uploads/99e1c9c8-57aa-4386-91f7-9fba40624b01.png"
            }
            alt="Opsage Logo"
            className={`h-12 w-auto object-contain${
              resolvedTheme === "dark" ? " dark-logo-fallback" : ""
            }`}
            style={
              resolvedTheme === "dark"
                ? { filter: "brightness(0) invert(1)" }
                : undefined
            }
            onError={(e) => {
              if (resolvedTheme === "dark") {
                (e.currentTarget as HTMLImageElement).src =
                  "/lovable-uploads/99e1c9c8-57aa-4386-91f7-9fba40624b01.png";
                (e.currentTarget as HTMLImageElement).style.filter =
                  "brightness(0) invert(1)";
              }
            }}
          />
            <span className="bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/20 px-3 py-1 text-xs font-medium ring-1 ring-inset rounded-full font-mono">
              0.1.0-alpha
                    </span>
                  </div>

          {/* Project Selector */}
          {currentProject && (
            <div className="flex items-center gap-3">
              <Select
                value={currentProject.id}
                onValueChange={(value) => {
                  if (value === "new-project") {
                    setShowProjectDialog(true);
                  } else {
                    const project = projects.find((p) => p.id === value);
                    setCurrentProject(project || null);
                  }
                }}
              >
                <SelectTrigger className="w-48 h-9 text-sm">
                  <SelectValue placeholder="Switch project" />
                </SelectTrigger>
                <SelectContent>
                {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                  <SelectItem
                    value="new-project"
                    className="text-blue-600 dark:text-blue-400 font-medium"
                  >
                    <div className="flex items-center">
                      <Plus className="h-3 w-3 mr-2" />
                      Create New Project
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Dialog
                open={showProjectDialog}
                onOpenChange={setShowProjectDialog}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="project-name">Project Name *</Label>
                      <Input
                        id="project-name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Enter project name"
                        disabled={isCreating}
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-description">Description</Label>
                      <Textarea
                        id="project-description"
                        value={newProjectDescription}
                        onChange={(e) =>
                          setNewProjectDescription(e.target.value)
                        }
                        placeholder="Optional project description"
                        rows={3}
                        disabled={isCreating}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowProjectDialog(false)}
                        disabled={isCreating}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateProject}
                        disabled={isCreating}
                      >
                        {isCreating ? "Creating..." : "Create Project"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
          </div>
          )}
        </div>

        {/* Right side - User controls */}
        <div className="flex items-center gap-3">
            <ThemeToggle />

          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-sm bg-gray-100 dark:bg-gray-800">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">
              {user?.email}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-9 w-9"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
