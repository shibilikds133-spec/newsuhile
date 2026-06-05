import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({ 
  variant = 'primary', 
  loading = false, 
  onClick, 
  children, 
  className = '', 
  type = 'button',
  disabled = false,
  ...props 
}) {
  const baseStyle = "inline-flex items-center justify-center px-4 py-2 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary hover:bg-primary-mid text-white focus:ring-primary",
    secondary: "bg-white border text-text hover:bg-bg focus:ring-primary",
    danger: "bg-danger hover:bg-red-700 text-white focus:ring-danger",
    ghost: "bg-transparent hover:bg-bg text-muted hover:text-text",
  };

  return (
    <button
      type={type}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <Loader2 className="animate-spin mr-2" size={16} />}
      {children}
    </button>
  );
}
