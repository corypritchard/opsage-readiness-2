import { useState } from "react";
import { MainContent } from "@/components/MainContent";
import { AIChatPanel } from "@/components/AIChatPanel";
import DashboardHeader from "@/components/DashboardHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { WelcomeModal } from "@/components/WelcomeModal";

// Define a type for the staged changes for clarity
export interface StagedChanges {
  added: any[];
  modified: {
    rowIndex: number;
    columnId: string;
    oldValue: any;
    newValue: any;
  }[];
  deleted: any[];
}

const CHAT_WIDTH = 380;
const SIDEBAR_COLLAPSED = 64; // px
const SIDEBAR_EXPANDED = 224; // px (matches w-56)

const Dashboard = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fmecaData, setFmecaData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedNav, setSelectedNav] = useState("dashboard");
  const [chatPanelWidth, setChatPanelWidth] = useState(380);

  // State to manage the new highlight-based preview feature
  const [previousFmecaData, setPreviousFmecaData] = useState<any[] | null>(
    null
  );
  const [stagedChanges, setStagedChanges] = useState<StagedChanges | null>(
    null
  );
  const [proposedFmecaData, setProposedFmecaData] = useState<any[] | null>(
    null
  );

  const handleDataUpdate = (updatedData: any[]) => {
    setFmecaData(updatedData);
  };

  // Function to stage changes from the AI, saving the previous state
  const handleStageChanges = (updatedData: any[], diff: StagedChanges) => {
    console.log("Dashboard: Staging changes", {
      originalDataLength: fmecaData.length,
      updatedDataLength: updatedData.length,
      diff,
    });
    setPreviousFmecaData(fmecaData); // Save current state before updating
    setProposedFmecaData(updatedData); // Store the proposed changes
    setStagedChanges(diff);
    // Keep the original data in fmecaData for display
    // The table will show highlighting based on the staged changes
  };

  // Create a merged preview dataset that includes original rows + added rows + modified cells
  const getPreviewData = () => {
    if (!stagedChanges || !proposedFmecaData) {
      return fmecaData; // No changes staged, show original data
    }

    // Start with original data
    const previewData = [...fmecaData];

    // Apply modified cell values to show the proposed changes
    if (stagedChanges.modified.length > 0) {
      stagedChanges.modified.forEach((modification) => {
        const { rowIndex, columnId, newValue } = modification;
        if (previewData[rowIndex]) {
          previewData[rowIndex] = {
            ...previewData[rowIndex],
            [columnId]: newValue,
            __hasModifiedCells: true, // Internal marker to help with debugging
          };
        }
      });
    }

    // Add the new rows from proposed data
    if (stagedChanges.added.length > 0) {
      // Find rows in proposedFmecaData that are marked as added
      stagedChanges.added.forEach((addedRow) => {
        // Add a special marker to identify this as an added row for styling
        previewData.push({
          ...addedRow,
          __isAddedRow: true, // Internal marker for styling
        });
      });
    }

    console.log("Dashboard: Creating preview data", {
      originalLength: fmecaData.length,
      addedCount: stagedChanges.added.length,
      modifiedCount: stagedChanges.modified.length,
      previewLength: previewData.length,
    });

    return previewData;
  };

  // Function to accept the staged changes
  const handleAcceptChanges = () => {
    if (!stagedChanges || !proposedFmecaData) return;

    // Clean up any internal markers from the proposed data
    const cleanedData = proposedFmecaData.map((row) => {
      const { __isAddedRow, __hasModifiedCells, ...cleanRow } = row;
      return cleanRow;
    });

    // Apply the proposed changes
    setFmecaData(cleanedData);

    // Clear the staging state
    setStagedChanges(null);
    setPreviousFmecaData(null);
    setProposedFmecaData(null);
  };

  // Function to revert to the previous state
  const handleRevertChanges = () => {
    // Data is already showing the original state, just clear staging
    setStagedChanges(null);
    setPreviousFmecaData(null);
    setProposedFmecaData(null);
  };

  const handleChatPanelResize = (newWidth: number) => {
    setChatPanelWidth(newWidth);
  };

  return (
    <ProjectProvider>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <WelcomeModal />
        <div className="fixed top-16 left-0 right-0 bottom-0 w-full h-[calc(100vh-4rem)]">
          {/* Layout: Sidebar (overlapping) | Main Content | Chat */}
          <div className="relative flex h-full w-full">
            {/* Sidebar (overlaps main content) */}
            <div className="relative z-20" style={{ width: SIDEBAR_COLLAPSED }}>
              <AppSidebar selected={selectedNav} onSelect={setSelectedNav} />
            </div>
            {/* Main content fills the space between sidebar and AI panel */}
            <div
              className="relative z-10 flex-1 min-w-0 h-full overflow-x-auto"
              style={{ marginRight: chatPanelWidth }}
            >
              <MainContent
                className="h-full flex flex-col"
                selectedNav={selectedNav}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                fmecaData={getPreviewData()}
                setFmecaData={setFmecaData}
                columns={columns}
                setColumns={setColumns}
                stagedChanges={stagedChanges}
              />
            </div>
            {/* AI Chat Panel on the right - Fixed position */}
            <div className="fixed right-0 top-16 bottom-0 z-30">
              <AIChatPanel
                className="h-full"
                fmecaData={fmecaData}
                columns={columns}
                onDataUpdate={handleDataUpdate}
                onStageChanges={handleStageChanges}
                onAcceptChanges={handleAcceptChanges}
                onRevertChanges={handleRevertChanges}
                hasStagedChanges={!!stagedChanges}
                onResize={handleChatPanelResize}
                minWidth={320}
                maxWidth={600}
                initialWidth={380}
              />
            </div>
          </div>
        </div>
      </div>
    </ProjectProvider>
  );
};

export default Dashboard;
