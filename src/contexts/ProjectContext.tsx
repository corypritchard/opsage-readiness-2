import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import {
  getFMECAProjects,
  createFMECAProject,
  deleteFMECAProject,
} from "@/integrations/supabase/maintenance-tasks";

type FMECAProject = {
  id: string;
  name: string;
  description: string | null;
  file_name: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
};

interface ProjectContextType {
  projects: FMECAProject[];
  currentProject: FMECAProject | null;
  isLoading: boolean;
  showWelcomeModal: boolean;
  setCurrentProject: (project: FMECAProject | null) => void;
  createProject: (data: {
    name: string;
    description?: string;
    file_name?: string;
  }) => Promise<FMECAProject>;
  deleteProject: (projectId: string) => Promise<void>;
  loadProjects: () => Promise<void>;
  setShowWelcomeModal: (show: boolean) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({
  children,
}) => {
  const [projects, setProjects] = useState<FMECAProject[]>([]);
  const [currentProject, setCurrentProject] = useState<FMECAProject | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const projectsList = await getFMECAProjects();
      setProjects(projectsList);

      // If no projects exist, show welcome modal
      if (projectsList.length === 0) {
        setShowWelcomeModal(true);
        setCurrentProject(null);
      } else if (
        !currentProject ||
        !projectsList.find((p) => p.id === currentProject.id)
      ) {
        // Auto-select the most recent project if none is selected or current project was deleted
        setCurrentProject(projectsList[0]);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentProject]);

  const createProject = useCallback(
    async (data: {
      name: string;
      description?: string;
      file_name?: string;
    }): Promise<FMECAProject> => {
      const project = await createFMECAProject({
        name: data.name,
        description: data.description || null,
        file_name: data.file_name || null,
      });

      setProjects((prev) => [project, ...prev]);
      setCurrentProject(project);
      setShowWelcomeModal(false);

      return project;
    },
    []
  );

  const deleteProject = useCallback(
    async (projectId: string): Promise<void> => {
      await deleteFMECAProject(projectId);

      // Remove from local state
      setProjects((prev) => prev.filter((p) => p.id !== projectId));

      // If the deleted project was the current project, clear it
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
      }

      // Reload projects to ensure consistency
      await loadProjects();
    },
    [currentProject, loadProjects]
  );

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const value = useMemo<ProjectContextType>(
    () => ({
      projects,
      currentProject,
      isLoading,
      showWelcomeModal,
      setCurrentProject,
      createProject,
      deleteProject,
      loadProjects,
      setShowWelcomeModal,
    }),
    [
      projects,
      currentProject,
      isLoading,
      showWelcomeModal,
      createProject,
      deleteProject,
      loadProjects,
    ]
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};
