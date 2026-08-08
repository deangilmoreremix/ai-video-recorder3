import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  className?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  items,
  children,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Keep the menu inside the viewport (rough estimate, refined below)
    const menuWidth = menuRef.current?.offsetWidth ?? 160;
    const menuHeight = menuRef.current?.offsetHeight ?? items.length * 36 + 8;
    const x = Math.min(e.clientX, Math.max(0, window.innerWidth - menuWidth - 8));
    const y = Math.min(e.clientY, Math.max(0, window.innerHeight - menuHeight - 8));
    setPosition({ x, y });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    // Declared inside the effect so add/remove always use the same reference
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div onContextMenu={handleContextMenu} className={className}>
      {children}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: position.y,
            left: position.x,
            zIndex: 1000
          }}
          className="min-w-[160px] py-1 bg-white rounded-lg shadow-xl border border-gray-200 animate-in fade-in"
        >
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              role="menuitem"
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              disabled={item.disabled}
              className={cn(
                "w-full px-4 py-2 text-left flex items-center space-x-2",
                "hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed",
                item.danger && "text-red-600 hover:bg-red-50"
              )}
            >
              {item.icon && <span className="w-4 h-4">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};