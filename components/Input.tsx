import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-500 mb-1.5 ml-1">{label}</label>}
      <input
        className={`w-full bg-white/50 backdrop-blur-sm border ${error ? 'border-ios-red' : 'border-gray-200'} rounded-xl px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-ios-blue/50 focus:border-ios-blue transition-all ${className}`}
        {...props}
      />
      {error && <p className="text-ios-red text-sm mt-1 ml-1">{error}</p>}
    </div>
  );
};