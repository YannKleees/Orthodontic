import { X } from "lucide-react";
import { cn } from "../lib/utils";
import { Tab } from "../pages/Index";

interface PatientTabsProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

export function PatientTabs({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
}: PatientTabsProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center bg-background border border-gray-200 rounded-[30px] min-h-[32px] overflow-x-auto shadow-sm">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={cn(
                "flex items-center px-3 py-1.5 text-sm font-normal transition-all duration-200 rounded-t-[4px] border-b-2 whitespace-nowrap min-w-fit relative group",
                isActive
                  ? "text-gray-900 border-b-primary bg-white shadow-sm"
                  : "text-gray-500 border-b-transparent hover:text-gray-700 hover:bg-gray-50",
              )}
            >
              <button
                onClick={() => onTabChange(tab.id)}
                className="flex items-center pr-2 text-left"
              >
                {tab.name}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="flex items-center justify-center w-4 h-4 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
