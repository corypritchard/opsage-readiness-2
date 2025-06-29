import React, { useState } from "react";
import {
  Home,
  Package,
  FileText,
  Table,
  Wrench,
  Download,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: Home,
    gradient: "btn-primary",
  },
  {
    key: "assets",
    label: "Assets",
    icon: Package,
    gradient: "btn-primary",
  },
  {
    key: "documents",
    label: "Documents",
    icon: FileText,
    gradient: "btn-primary",
  },
  {
    key: "fmeca",
    label: "FMECA",
    icon: Table,
    gradient: "btn-primary",
  },
  {
    key: "tasks",
    label: "Maintenance Tasks",
    icon: Wrench,
    gradient: "btn-primary",
  },
  {
    key: "export",
    label: "Export",
    icon: Download,
    gradient: "btn-primary",
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    gradient: "btn-primary",
  },
];

export function AppSidebar({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <nav
      className={cn(
        "group relative flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-200 ease-out z-50 shadow-sm overflow-hidden",
        expanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Background Arcs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg
          className="absolute -top-8 -left-12 w-32 h-32 text-foreground/5"
          style={{ transform: "rotate(75deg)" }}
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
          className="absolute bottom-16 -left-8 w-40 h-40 text-foreground/5"
          style={{ transform: "rotate(-45deg)" }}
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
          className="absolute top-1/3 left-2 w-28 h-28 text-foreground/5"
          style={{ transform: "rotate(150deg)" }}
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

      {/* Navigation Items */}
      <div
        className={cn(
          "relative flex flex-col gap-2 flex-1 justify-center items-center z-10",
          expanded ? "p-3" : "py-3 px-2"
        )}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = selected === item.key;
          return (
            <button
              key={item.key}
              className={cn(
                "relative flex items-center justify-center rounded-xl transition-all duration-200 ease-out group/item",
                expanded
                  ? "w-full h-12 px-4 justify-start"
                  : "w-12 h-12 mx-auto",
                isActive
                  ? `${item.gradient} shadow-lg text-white`
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-md"
              )}
              onClick={() => onSelect(item.key)}
            >
              {/* Icon Container */}
              <div
                className={cn(
                  "flex items-center justify-center transition-all duration-200 ease-out rounded-lg",
                  expanded ? "mr-3 w-8 h-8" : "w-10 h-10",
                  isActive
                    ? "bg-white/20 backdrop-blur-sm"
                    : "group-hover/item:bg-gray-100 dark:group-hover/item:bg-gray-700"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors duration-200 ease-out",
                    isActive
                      ? "text-white"
                      : "text-gray-600 dark:text-gray-400 group-hover/item:text-gray-900 dark:group-hover/item:text-gray-200"
                  )}
                />
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-sm font-medium transition-all duration-200 ease-out truncate whitespace-nowrap",
                  expanded
                    ? "opacity-100 max-w-none"
                    : "opacity-0 max-w-0 overflow-hidden",
                  isActive ? "text-white" : "text-gray-700 dark:text-gray-300"
                )}
              >
                {item.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-l-full opacity-80" />
              )}

              {/* Tooltip for collapsed state */}
              {!expanded && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 group-hover/item:opacity-100 transition-all duration-200 ease-out pointer-events-none whitespace-nowrap z-50 shadow-xl transform group-hover/item:translate-x-0 -translate-x-1">
                  {item.label}
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer/Bottom Section */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div
          className={cn(
            "transition-all duration-200 ease-out text-center",
            expanded ? "opacity-100" : "opacity-60"
          )}
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {expanded ? "Opsage" : "•"}
          </div>
        </div>
      </div>
    </nav>
  );
}
