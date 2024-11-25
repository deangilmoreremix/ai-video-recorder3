import React from 'react';
import { cn } from './utils';

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, children }) => {
  return (
    <div data-current-tab={value} className="tabs-root">
      {children}
    </div>
  );
};

export const TabsList: React.FC<TabsListProps> = ({ children, className }) => {
  return (
    <div className={cn("flex space-x-2 border-b border-gray-200", className)}>
      {children}
    </div>
  );
};

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ 
  value, 
  children, 
  className,
  onClick 
}) => {
  const isActive = value === document.querySelector('.tabs-root')?.getAttribute('data-current-tab');
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm font-medium rounded-t-lg -mb-px transition-colors",
        isActive 
          ? "bg-white text-blue-600 border-b-2 border-blue-600" 
          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
        className
      )}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<TabsContentProps> = ({ value, children }) => {
  const isActive = value === document.querySelector('.tabs-root')?.getAttribute('data-current-tab');
  
  return (
    <div
      className={cn(
        "transition-opacity duration-200",
        isActive ? "opacity-100" : "opacity-0 hidden"
      )}
    >
      {children}
    </div>
  );
};