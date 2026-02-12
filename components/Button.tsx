import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon,
  className = '',
  ...props 
}) => {
  // Chamfered edges via clip-path
  const clipStyle = { clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' };
  
  const baseStyles = "relative inline-flex items-center justify-center font-mono font-bold uppercase tracking-widest transition-transform active:translate-y-1 focus:outline-none";
  
  // Updated to Jenova Teal: #00ffa3
  const variants = {
    primary: "bg-[#00ffa3] text-black hover:bg-[#00e692]",
    secondary: "bg-transparent border border-[#333] text-white hover:border-[#00ffa3] hover:text-[#00ffa3]",
    danger: "bg-red-600 text-white hover:bg-red-500",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-8 py-3 text-sm",
    lg: "px-10 py-5 text-base",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      style={clipStyle}
      {...props}
    >
      {icon && <span className="mr-3">{icon}</span>}
      {children}
    </button>
  );
};