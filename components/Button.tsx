import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  isLoading,
  disabled,
  ...props 
}) => {
  const baseStyles = "relative w-full py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-ios-blue text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600",
    secondary: "bg-white text-gray-900 shadow-sm border border-gray-200 hover:bg-gray-50",
    danger: "bg-ios-red text-white shadow-lg shadow-red-500/30 hover:bg-red-600",
    ghost: "bg-transparent text-ios-blue hover:bg-blue-50/50"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
      ) : children}
    </button>
  );
};