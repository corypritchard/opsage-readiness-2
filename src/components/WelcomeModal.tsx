import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Rocket, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export function WelcomeModal() {
  const { showWelcomeModal, setShowWelcomeModal, createProject } = useProject();
  const { user } = useAuth();
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast("Project name is required", {
        description: "Please enter a name for your project.",
      });
      return;
    }

    if (!user) {
      toast("Authentication required", {
        description: "Please try logging out and back in.",
      });
      return;
    }

    try {
      setIsCreating(true);

      await createProject({
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
      });

      toast("Welcome to Opsage Readiness! 🎉", {
        description: `Your project "${projectName}" has been created successfully.`,
      });

      // Reset form
      setProjectName("");
      setProjectDescription("");
    } catch (error) {
      console.error("Failed to create project:", error);

      let errorDescription =
        "Please try again or contact support if the issue persists.";

      if (error instanceof Error) {
        if (error.message.includes("not authenticated")) {
          errorDescription = "Please try logging out and back in.";
        } else if (error.message.includes("network")) {
          errorDescription =
            "Network error. Please check your internet connection.";
        }
      }

      toast("Failed to create project", {
        description: errorDescription,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={showWelcomeModal} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[500px]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Rocket className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to Opsage Readiness!
          </DialogTitle>
          <DialogDescription className="text-lg text-gray-600 dark:text-gray-400">
            Let's get you started by creating your first project. This will help
            organize your FMECA analysis and maintenance tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Show authentication warning only if user is not authenticated */}
          {!user && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">
                    Authentication Required
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Please refresh the page or try logging out and back in.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  What you'll be able to do:
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Upload and analyze FMECA data</li>
                  <li>• Generate AI-powered maintenance tasks</li>
                  <li>• Organize everything in dedicated projects</li>
                  <li>• Track your reliability engineering progress</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name" className="text-sm font-medium">
                Project Name *
              </Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., Production Line A Reliability Study"
                className="mt-1"
                disabled={isCreating}
              />
            </div>

            <div>
              <Label
                htmlFor="project-description"
                className="text-sm font-medium"
              >
                Project Description
              </Label>
              <Textarea
                id="project-description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Optional: Describe what this project will cover..."
                rows={3}
                className="mt-1"
                disabled={isCreating}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleCreateProject}
              disabled={isCreating || !projectName.trim() || !user}
              className="w-full sm:w-auto btn-primary px-8 py-3 text-base font-medium"
              size="lg"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Project...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Create My First Project
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            You can create additional projects later from the dashboard.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
