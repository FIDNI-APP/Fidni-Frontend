import * as React from "react";
import { cn } from "@/lib/utils";

// Used to track tab selection state
const TabsContext = React.createContext<{
  selectedTab: string;
  setSelectedTab: (id: string) => void;
} | null>(null);

// Main Tabs container
export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export const Tabs = ({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) => {
  const [selectedTab, setSelectedTab] = React.useState<string>(
    value || defaultValue || ""
  );

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedTab(value);
    }
  }, [value]);

  const handleTabChange = React.useCallback(
    (tabValue: string) => {
      if (value === undefined) {
        setSelectedTab(tabValue);
      }
      onValueChange?.(tabValue);
    },
    [onValueChange, value]
  );

  return (
    <TabsContext.Provider
      value={{ selectedTab, setSelectedTab: handleTabChange }}
    >
      <div className={cn("space-y-2", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

// List container for the tab triggers
export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const TabsList = ({ className, children, ...props }: TabsListProps) => {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center rounded-md bg-white p-1 text-gray-500",
        className
      )}
      role="tablist"
      aria-orientation="horizontal"
      {...props}
    >
    </div>
  );
};

// Individual clickable tab
export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

export const TabsTrigger = ({
  value,
  className,
  children,
  ...props
}: TabsTriggerProps) => {
  const context = React.useContext(TabsContext);

  if (!context) {
    throw new Error("TabsTrigger must be used within a Tabs component");
  }

  const { selectedTab, setSelectedTab } = context;
  const isSelected = selectedTab === value;

  return (
    <button
      type="button"
      data-state={isSelected ? "active" : "inactive"}
      onClick={() => setSelectedTab(value)}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50",
        isSelected
          ? "bg-indigo-50 text-indigo-700 shadow-sm"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// Content for the selected tab
export interface TabsContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
}

export const TabsContent = ({
  value,
  className,
  children,
  ...props
}: TabsContentProps) => {
  const context = React.useContext(TabsContext);

  if (!context) {
    throw new Error("TabsContent must be used within a Tabs component");
  }

  const { selectedTab } = context;
  const isSelected = selectedTab === value;

  if (!isSelected) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      data-state={isSelected ? "active" : "inactive"}
      className={cn("transition-all", className)}
      {...props}
    >
      {children}
    </div>
  );
};