import { useState, useMemo, useCallback } from "react";
import { MainContent } from "@/components/MainContent";
import { AIChatPanel } from "@/components/AIChatPanel";
import DashboardHeader from "@/components/DashboardHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { ProjectProvider, useProject } from "@/contexts/ProjectContext";
import { WelcomeModal } from "@/components/WelcomeModal";
import { saveFMECAData } from "@/integrations/supabase/maintenance-tasks";
import React from "react";

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

const DashboardContent = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fmecaData, setFmecaData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedNav, setSelectedNav] = useState("dashboard");
  const [chatPanelWidth, setChatPanelWidth] = useState(500);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [addChatMessage, setAddChatMessage] = useState<
    ((message: any) => void) | null
  >(null);

  const { currentProject } = useProject();

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
    // Trigger a refresh of FMECA data from the database
    setRefreshTrigger((prev) => prev + 1);
  };

  // Function to calculate the diff between original and updated data
  const calculateDataDiff = (
    originalData: any[],
    updatedData: any[]
  ): StagedChanges => {
    const added: any[] = [];
    const modified: {
      rowIndex: number;
      columnId: string;
      oldValue: any;
      newValue: any;
    }[] = [];
    const deleted: any[] = [];

    // Create a more robust matching function
    const findMatchingRow = (targetRow: any, searchArray: any[]) => {
      return searchArray.findIndex((row) => {
        // First try exact match
        if (JSON.stringify(row) === JSON.stringify(targetRow)) {
          return true;
        }

        // Then try key field matching with all three fields
        const keyFields = ["FLOC", "Asset Type", "Component"];
        const allKeyFieldsMatch = keyFields.every(
          (field) =>
            row[field] && targetRow[field] && row[field] === targetRow[field]
        );

        return allKeyFieldsMatch;
      });
    };

    // Find added rows (exist in updated but not in original)
    updatedData.forEach((updatedRow) => {
      const matchIndex = findMatchingRow(updatedRow, originalData);
      if (matchIndex === -1) {
        // This is a completely new row
        added.push(updatedRow);
      }
    });

    // Find deleted rows (exist in original but not in updated)
    originalData.forEach((originalRow) => {
      const matchIndex = findMatchingRow(originalRow, updatedData);
      if (matchIndex === -1) {
        // This row was deleted
        deleted.push(originalRow);
      }
    });

    // Find modified cells (only check rows that exist in both)
    originalData.forEach((originalRow, originalIndex) => {
      const updatedRowIndex = findMatchingRow(originalRow, updatedData);

      if (updatedRowIndex !== -1) {
        const updatedRow = updatedData[updatedRowIndex];

        // Only check for modifications if it's not an exact match
        if (JSON.stringify(originalRow) !== JSON.stringify(updatedRow)) {
          Object.keys(originalRow).forEach((columnId) => {
            if (originalRow[columnId] !== updatedRow[columnId]) {
              modified.push({
                rowIndex: originalIndex,
                columnId,
                oldValue: originalRow[columnId],
                newValue: updatedRow[columnId],
              });
            }
          });
        }
      }
    });

    return {
      added,
      modified,
      deleted,
    };
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
  const previewData = useMemo(() => {
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
  }, [fmecaData, stagedChanges, proposedFmecaData]);

  // Function to accept the staged changes
  const handleAcceptChanges = async () => {
    if (!stagedChanges || !proposedFmecaData || !currentProject) return;

    try {
      // Clean up any internal markers from the proposed data
      const cleanedData = proposedFmecaData.map((row) => {
        const { __isAddedRow, __hasModifiedCells, ...cleanRow } = row;
        return cleanRow;
      });

      // Save to database first
      await saveFMECAData(currentProject.id, cleanedData, columns);

      // Apply the proposed changes to local state
      setFmecaData(cleanedData);

      // Clear the staging state
      setStagedChanges(null);
      setPreviousFmecaData(null);
      setProposedFmecaData(null);

      console.log("Changes accepted and saved to database successfully");
    } catch (error) {
      console.error("Failed to save changes to database:", error);
      throw error; // Re-throw so the chat panel can handle the error
    }
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

  const handleChatRef = React.useCallback(
    (addMessage: (message: any) => void) => {
      setAddChatMessage(() => addMessage);
    },
    []
  );

  // Handle direct cell edits from the table
  const handleCellEdit = (updatedData: any[]) => {
    if (stagedChanges) {
      // If there are staged changes, we need to merge the cell edit with the staged changes
      console.log("Dashboard: Cell edit with staged changes present");

      // Calculate the diff between the original data and the updated data
      const cellEditDiff = calculateDataDiff(fmecaData, updatedData);

      // Merge the cell edit changes with existing staged changes
      const mergedModified = [...stagedChanges.modified];

      cellEditDiff.modified.forEach((cellEdit) => {
        // Check if this cell is already in staged changes
        const existingIndex = mergedModified.findIndex(
          (mod) =>
            mod.rowIndex === cellEdit.rowIndex &&
            mod.columnId === cellEdit.columnId
        );

        if (existingIndex >= 0) {
          // Update existing staged change
          mergedModified[existingIndex] = cellEdit;
        } else {
          // Add new staged change
          mergedModified.push(cellEdit);
        }
      });

      // Update staged changes with merged modifications
      setStagedChanges({
        ...stagedChanges,
        modified: mergedModified,
      });

      // Update the proposed data to reflect the cell edit
      const updatedProposedData = [...proposedFmecaData!];
      cellEditDiff.modified.forEach((cellEdit) => {
        const { rowIndex, columnId, newValue } = cellEdit;
        if (updatedProposedData[rowIndex]) {
          updatedProposedData[rowIndex] = {
            ...updatedProposedData[rowIndex],
            [columnId]: newValue,
          };
        }
      });
      setProposedFmecaData(updatedProposedData);
    } else {
      // No staged changes, just update the data normally
      console.log("Dashboard: Direct cell edit, no staged changes");
      setFmecaData(updatedData);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <WelcomeModal />
      <div className="fixed top-16 left-0 right-0 bottom-0 w-full h-[calc(100vh-4rem)]">
        {/* Layout: Fixed positioning for consistent spacing regardless of zoom */}

        {/* Sidebar - Fixed position on the left */}
        <div
          className="fixed left-0 top-16 bottom-0 z-20"
          style={{ width: SIDEBAR_COLLAPSED }}
        >
          <AppSidebar selected={selectedNav} onSelect={setSelectedNav} />
        </div>

        {/* Main content - Fixed position with calculated width */}
        <div
          className="fixed top-16 bottom-0 z-10 overflow-x-auto bg-background"
          style={{
            left: SIDEBAR_COLLAPSED,
            width: `calc(100vw - ${SIDEBAR_COLLAPSED}px - ${chatPanelWidth}px)`,
          }}
        >
          <MainContent
            className="h-full flex flex-col min-w-full"
            selectedNav={selectedNav}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            fmecaData={previewData}
            setFmecaData={handleCellEdit}
            columns={columns}
            setColumns={setColumns}
            stagedChanges={stagedChanges}
            refreshTrigger={refreshTrigger}
            addChatMessage={addChatMessage}
          />
        </div>

        {/* AI Chat Panel - Fixed position on the right */}
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
            minWidth={400}
            maxWidth={700}
            initialWidth={500}
            onChatRef={handleChatRef}
          />
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  return (
    <ProjectProvider>
      <DashboardContent />
    </ProjectProvider>
  );
};

export default Dashboard;
