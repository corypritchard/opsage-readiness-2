import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
  ColumnDef,
  Row,
  Cell,
} from "@tanstack/react-table";
import { Shield, Trash2, X } from "lucide-react";
import { StagedChanges } from "@/pages/Dashboard";
import { cn } from "@/lib/utils";

interface TanStackFMECATableProps {
  data: any[];
  columns: ColumnDef<any>[];
  onDataChange: (data: any[]) => void;
  stagedChanges: StagedChanges | null;
}

// Helper functions to check the status of a cell or row
const isRowAdded = (row: Row<any>, stagedChanges: StagedChanges | null) => {
  if (!stagedChanges?.added) return false;

  // Check if this row has the special marker for added rows
  if (row.original.__isAddedRow) {
    console.log(
      "TanStackFMECATable: Found added row with marker",
      row.original
    );
    return true;
  }

  // Fallback: Compare based on a unique identifier if possible, otherwise stringify
  const rowJson = JSON.stringify(row.original);
  return stagedChanges.added.some(
    (addedRow) => JSON.stringify(addedRow) === rowJson
  );
};

const isRowDeleted = (row: Row<any>, stagedChanges: StagedChanges | null) => {
  if (!stagedChanges?.deleted) return false;
  const rowJson = JSON.stringify(row.original);
  return stagedChanges.deleted.some(
    (deletedRow) => JSON.stringify(deletedRow) === rowJson
  );
};

const isCellModified = (
  cell: Cell<any>,
  stagedChanges: StagedChanges | null
) => {
  if (!stagedChanges?.modified) return false;
  return stagedChanges.modified.some(
    (mod) => mod.rowIndex === cell.row.index && mod.columnId === cell.column.id
  );
};

interface EditableCellProps {
  getValue: () => any;
  row: Row<any>;
  column: { id: string };
  table: any;
  stagedChanges: StagedChanges | null;
}

const EditableCell: React.FC<EditableCellProps> = ({
  getValue,
  row,
  column: { id },
  table,
  stagedChanges,
}) => {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  // Check the status of this specific cell/row
  const isRowAdded =
    stagedChanges?.added?.some(
      (addedRow) => JSON.stringify(addedRow) === JSON.stringify(row.original)
    ) || row.original?.__isAddedRow;
  const isRowDeleted = stagedChanges?.deleted?.some(
    (deletedRow) => JSON.stringify(deletedRow) === JSON.stringify(row.original)
  );
  const isCellModified = stagedChanges?.modified?.some(
    (mod) => mod.rowIndex === row.index && mod.columnId === id
  );

  // Update the value when initialValue changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Save the value when the cell is blurred or Enter is pressed
  const saveValue = useCallback(() => {
    setIsEditing(false);
    if (value !== initialValue) {
      console.log("Cell value changed:", {
        rowIndex: row.index,
        columnId: id,
        oldValue: initialValue,
        newValue: value,
      });
      table.options.meta?.updateData(row.index, id, value);
    }
  }, [initialValue, row.index, id, table.options.meta, value]);

  // Handle key presses
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        saveValue();
      } else if (e.key === "Escape") {
        setIsEditing(false);
        setValue(initialValue);
      }
    },
    [initialValue, saveValue]
  );

  // Handle cell click
  const handleCellClick = useCallback(() => {
    if (!isRowDeleted) {
      console.log("Cell clicked, setting editing to true", {
        rowIndex: row.index,
        columnId: id,
      });
      setIsEditing(true);
    }
  }, [isRowDeleted, row.index, id]);

  // Cell styling based on status
  const cellStyle = useMemo(() => {
    if (isRowDeleted) return "text-red-700 dark:text-red-400 line-through";
    if (isRowAdded) return "text-green-700 dark:text-green-400 font-medium";
    if (isCellModified)
      return "text-orange-700 dark:text-orange-400 font-medium";
    return "text-gray-900 dark:text-white";
  }, [isRowDeleted, isRowAdded, isCellModified]);

  // If the cell is being edited, render a textarea
  if (isEditing) {
    return (
      <div className="w-full h-full p-1">
        <textarea
          className="w-full h-full min-h-[50px] p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={value as string}
          onChange={(e) => setValue(e.target.value)}
          onBlur={saveValue}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{ resize: "none" }}
        />
      </div>
    );
  }

  // Otherwise render the cell content
  return (
    <div
      className={`w-full h-full p-2 cursor-pointer ${cellStyle} ${
        !isRowDeleted ? "hover:bg-gray-100 dark:hover:bg-gray-700" : ""
      }`}
      onClick={handleCellClick}
    >
      {value ? String(value) : "—"}
    </div>
  );
};

// Function to determine column width based on column name and data
const getColumnWidth = (columnName: string, data: any[]): number => {
  // Short columns that typically have brief content
  const shortColumns = [
    "Asset Type",
    "FLOC",
    "Classification",
    "Component",
    "Severity",
    "Occurrence",
    "Detection",
    "RPN",
  ];

  if (shortColumns.includes(columnName)) {
    return 100; // Narrower width for short content columns
  }

  // Check average content length for this column
  const avgLength =
    data.reduce((sum, row) => {
      const content = row[columnName] || "";
      return sum + String(content).length;
    }, 0) / Math.max(data.length, 1);

  // Dynamic sizing based on average content length
  if (avgLength < 20) return 140;
  if (avgLength < 50) return 200;
  if (avgLength < 100) return 280;
  return 350; // Wider for long content
};

export function TanStackFMECATable({
  data,
  columns,
  onDataChange,
  stagedChanges,
}: TanStackFMECATableProps) {
  const columnHelper = createColumnHelper<any>();

  // Add a delete column as the first column
  const deleteColumn: ColumnDef<any> = {
    id: "_delete",
    header: "",
    size: 28,
    minSize: 28,
    maxSize: 28,
    cell: ({ row }) => {
      const isDeleted = isRowDeleted(row, stagedChanges);
      return !isDeleted ? (
        <button
          type="button"
          className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded p-0"
          title="Delete row"
          onClick={(e) => {
            e.stopPropagation();
            const idx = row.index;
            const newData = data.filter((_, i) => i !== idx);
            onDataChange(newData);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null;
    },
    enableResizing: false,
  };

  const tableColumns = useMemo<ColumnDef<any>[]>(() => {
    return [
      deleteColumn,
      ...columns.map((column) => ({
        ...column,
        cell: (props) => (
          <EditableCell {...props} stagedChanges={stagedChanges} />
        ),
        size: getColumnWidth(column.header as string, data),
        minSize: 80,
        maxSize: 500,
        enableResizing: true,
      })),
    ];
  }, [columns, data, stagedChanges]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    meta: {
      updateData: (rowIndex: number, columnId: string, value: any) => {
        if (data[rowIndex] && data[rowIndex][columnId] === value) return;
        console.log("Updating data:", { rowIndex, columnId, value });
        const newData = [...data];
        newData[rowIndex] = {
          ...newData[rowIndex],
          [columnId]: value,
        };
        onDataChange(newData);
      },
    },
  });

  if (!data.length || !columns.length) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
          <Shield className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No FMECA data available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Upload an Excel file to begin your failure analysis
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Change indicators legend - only show when there are staged changes */}
      {stagedChanges && (
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="flex items-center gap-6 text-xs">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Proposed Changes:
            </span>
            {stagedChanges.added.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                <span className="text-green-700 dark:text-green-400">
                  Added ({stagedChanges.added.length})
                </span>
              </div>
            )}
            {stagedChanges.modified.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                <span className="text-orange-700 dark:text-orange-400">
                  Modified ({stagedChanges.modified.length})
                </span>
              </div>
            )}
            {stagedChanges.deleted.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                <span className="text-red-700 dark:text-red-400">
                  Deleted ({stagedChanges.deleted.length})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Single table with fixed header and scrollable body */}
      <div className="flex-1 overflow-auto">
        <table
          className="w-full min-w-full"
          style={{ width: Math.max(table.getCenterTotalSize(), 800) }}
        >
          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider relative border-b border-gray-200 dark:border-gray-600"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {/* Column resize handle */}
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-red-400/40 transition-colors ${
                        header.column.getIsResizing() ? "bg-red-500/60" : ""
                      }`}
                      style={{
                        userSelect: "none",
                        touchAction: "none",
                      }}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
            {table.getRowModel().rows.map((row) => {
              const isAdded = isRowAdded(row, stagedChanges);
              const isDeleted = isRowDeleted(row, stagedChanges);

              return (
                <tr
                  key={row.id}
                  className={cn(
                    "transition-colors",
                    // Added rows - green background
                    isAdded &&
                      "bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500",
                    // Deleted rows - red background
                    isDeleted &&
                      "bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 opacity-80",
                    // Normal hover state (only if not added or deleted)
                    !isAdded &&
                      !isDeleted &&
                      "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isModified = isCellModified(cell, stagedChanges);
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-6 py-4 relative",
                          // Modified cells - orange background
                          isModified && "bg-orange-100 dark:bg-orange-900/30",
                          // Add a subtle border for modified cells
                          isModified && "border-l-2 border-orange-400"
                        )}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                        {/* Add a visual indicator for modified cells */}
                        {isModified && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
