import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  icon?: string;
  iconPosition?: 'left' | 'right';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  icon,
  iconPosition = 'right',
  className = '',
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center text-sm font-semibold rounded-full active:scale-[0.98] transition-all duration-200 cursor-pointer';
  
  const variantStyles = {
    primary: 'bg-gradient-to-r from-primary to-surface-tint text-white shadow-[0_4px_20px_rgba(0,61,155,0.25)] hover:shadow-[0_6px_25px_rgba(0,61,155,0.35)]',
    secondary: 'bg-slate-50 border border-slate-200 text-primary hover:bg-slate-100',
  };

  const padStyles = variant === 'primary' ? 'px-6 py-3.5' : 'px-6 py-3';

  return (
    <button
      className={`${baseStyle} ${variantStyles[variant]} ${padStyles} ${className}`}
      {...props}
    >
      {icon && iconPosition === 'left' && (
        <span className="material-symbols-outlined mr-2 text-[20px]">{icon}</span>
      )}
      {children}
      {icon && iconPosition === 'right' && (
        <span className="material-symbols-outlined ml-2 text-[20px]">{icon}</span>
      )}
    </button>
  );
};
