import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  isHoverable?: boolean;
  isClickable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  isHoverable,
  isClickable,
  onClick,
  onKeyDown,
  ...props
}) => {
  // A clickable card has to be operable with the keyboard as well
  const interactive = Boolean(isClickable && onClick);

  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-lg p-6 transition-all duration-200",
        isHoverable && "hover:shadow-xl hover:-translate-y-1",
        isClickable && "cursor-pointer active:scale-[0.98]",
        className
      )}
      onClick={onClick}
      role={interactive ? 'button' : props.role}
      tabIndex={interactive ? 0 : props.tabIndex}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (interactive && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
};
