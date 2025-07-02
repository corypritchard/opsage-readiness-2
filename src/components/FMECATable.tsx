import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FMECATableProps {
  data: any[];
  columns: string[];
  onDataChange: (data: any[]) => void;
}

export function FMECATable({ data, columns, onDataChange }: FMECATableProps) {
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(
    {}
  );
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Calculate optimal column widths based on content
  const calculateColumnWidth = (columnKey: string): number => {
    if (!data.length) return 150;

    // Calculate width based on header length
    const headerWidth = columnKey.length * 8 + 32;

    // Calculate width based on content and find the maximum content length
    const maxContentLength = Math.max(
      ...data.map((row) => {
        const cellValue = row[columnKey] || "";
        return String(cellValue).length;
      })
    );

    const contentWidth = maxContentLength * 7 + 32;

    // Use the larger of header or content width with reasonable limits
    const calculatedWidth = Math.max(headerWidth, contentWidth);

    // Ensure minimum readable width and reasonable maximum
    return Math.max(150, Math.min(400, calculatedWidth));
  };

  // Initialize column widths
  useEffect(() => {
    if (
      columns.length > 0 &&
      data.length > 0 &&
      Object.keys(columnWidths).length === 0
    ) {
      const initialWidths: { [key: string]: number } = {};
      columns.forEach((column) => {
        initialWidths[column] = calculateColumnWidth(column);
      });
      setColumnWidths(initialWidths);
    }
  }, [columns, data, columnWidths]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const handleCellClick = (
    rowIndex: number,
    columnKey: string,
    currentValue: string
  ) => {
    setEditingCell({ row: rowIndex, col: columnKey });
    setEditValue(currentValue || "");
  };

  const handleSave = () => {
    if (editingCell) {
      const newData = [...data];
      newData[editingCell.row][editingCell.col] = editValue;
      onDataChange(newData);
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(columnKey);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[columnKey] || 150);

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (isResizing) {
      e.preventDefault();
      const deltaX = e.clientX - resizeStartX;
      const newWidth = Math.max(100, resizeStartWidth + deltaX);
      setColumnWidths((prev) => ({
        ...prev,
        [isResizing]: newWidth,
      }));
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(null);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      return () => {
        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [isResizing, resizeStartX, resizeStartWidth]);

  return (
    <div className="border rounded-lg overflow-auto max-h-screen scrollbar-thin">
      <div className="min-w-max">
        <Table
          ref={tableRef}
          style={{
            tableLayout: "fixed",
            width: `${Object.values(columnWidths).reduce(
              (sum, width) => sum + width,
              0
            )}px`,
          }}
        >
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead
                  key={column}
                  className="bg-card px-4 py-3 text-sm font-medium text-card-foreground border-r border-border sticky top-0 z-10"
                  style={{
                    width: `${columnWidths[column] || 150}px`,
                    minWidth: `${columnWidths[column] || 150}px`,
                    maxWidth: `${columnWidths[column] || 150}px`,
                  }}
                >
                  <div className="break-words">{column}</div>
                  {index < columns.length - 1 && (
                    <div
                      className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-primary/40 hover:opacity-75 flex items-center justify-center"
                      onMouseDown={(e) => handleResizeStart(e, column)}
                      style={{ zIndex: 10 }}
                    >
                      <div className="w-0.5 h-4 bg-border"></div>
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                className="border-b border-border bg-[hsl(var(--table-cell))]"
              >
                {columns.map((column) => (
                  <TableCell
                    key={column}
                    className="relative p-0 border-r border-border align-top"
                    style={{
                      width: `${columnWidths[column] || 150}px`,
                      minWidth: `${columnWidths[column] || 150}px`,
                      maxWidth: `${columnWidths[column] || 150}px`,
                    }}
                  >
                    {editingCell?.row === rowIndex &&
                    editingCell?.col === column ? (
                      <textarea
                        ref={inputRef as any}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSave();
                          } else if (e.key === "Escape") {
                            setEditingCell(null);
                            setEditValue("");
                          }
                        }}
                        onBlur={handleBlur}
                        className="w-full h-full px-3 py-2 border-none outline-none focus:ring-2 focus:ring-primary focus:ring-inset bg-accent text-sm resize-none"
                        style={{ minHeight: "60px" }}
                      />
                    ) : (
                      <div
                        className="cursor-pointer hover:bg-accent px-3 py-2 w-full text-sm min-h-[60px] flex items-start"
                        onClick={() =>
                          handleCellClick(rowIndex, column, row[column])
                        }
                      >
                        <span className="break-words whitespace-pre-wrap w-full leading-relaxed">
                          {(() => {
                            const value = row[column] || "";
                            // Split at each numbered marker, keeping the marker
                            const items = value
                              .split(/(?=\d+\))/g)
                              .map((s) => s.trim())
                              .filter(Boolean);
                            if (items.length <= 1) return value;
                            return items.map((item, idx) => (
                              <div key={idx}>{item}</div>
                            ));
                          })()}
                        </span>
                      </div>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
