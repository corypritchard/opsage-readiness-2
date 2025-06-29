import { FMECAContent } from "./FMECAContent";
import { MaintenanceTasksContent } from "./MaintenanceTasksContent";
import { DashboardContent } from "./DashboardContent";
import { StagedChanges } from "@/pages/Dashboard";
import { cn } from "@/lib/utils";
import DocumentsPage from "@/pages/Documents";
import Assets from "@/pages/Assets";
import SettingsPage from "@/pages/Settings";

interface MainContentProps {
  className?: string;
  selectedNav: string;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  fmecaData: any[];
  setFmecaData: (data: any[]) => void;
  columns: string[];
  setColumns: (columns: string[]) => void;
  stagedChanges: StagedChanges | null;
}

export function MainContent({
  className,
  selectedNav,
  selectedFile,
  setSelectedFile,
  fmecaData,
  setFmecaData,
  columns,
  setColumns,
  stagedChanges,
}: MainContentProps) {
  return (
    <div className={cn("flex flex-col bg-background h-full", className)}>
      {selectedNav === "dashboard" && <DashboardContent />}
      {selectedNav === "assets" && (
        <div className="flex-1 flex flex-col">
          <Assets />
        </div>
      )}
      {selectedNav === "documents" && (
        <div className="flex-1 flex flex-col">
          <DocumentsPage />
        </div>
      )}
      {selectedNav === "fmeca" && (
        <FMECAContent
          className="h-full"
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          fmecaData={fmecaData}
          setFmecaData={setFmecaData}
          columns={columns}
          setColumns={setColumns}
          stagedChanges={stagedChanges}
        />
      )}
      {selectedNav === "tasks" && (
        <MaintenanceTasksContent
          fmecaData={fmecaData}
          selectedFile={selectedFile}
        />
      )}
      {selectedNav === "export" && (
        <div className="flex-1 flex items-center justify-center text-2xl text-muted-foreground">
          Export & Deliverables coming soon...
        </div>
      )}
      {selectedNav === "settings" && (
        <div className="flex-1 flex flex-col">
          <SettingsPage />
        </div>
      )}
    </div>
  );
}
