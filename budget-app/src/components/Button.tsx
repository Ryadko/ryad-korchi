import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'link';
  size?: 'small' | 'medium' | 'large';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  style,
  ...rest
}) => {
  const baseStyle: React.CSSProperties = {
    border: '1px solid transparent', // Base border
    borderRadius: '6px', // Slightly more rounded
    cursor: 'pointer',
    fontWeight: '500', // Medium weight
    textAlign: 'center',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, color 0.2s ease-in-out',
    lineHeight: '1.5',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    small: {
      padding: '0.35rem 0.8rem',
      fontSize: '0.875rem',
    },
    medium: {
      padding: '0.5rem 1.2rem',
      fontSize: '1rem',
    },
    large: {
      padding: '0.75rem 1.5rem',
      fontSize: '1.125rem',
    },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#007bff', // Standard blue
      color: 'white',
      borderColor: '#007bff',
    },
    secondary: {
      backgroundColor: '#6c757d', // Gray
      color: 'white',
      borderColor: '#6c757d',
    },
    danger: {
      backgroundColor: '#dc3545', // Red
      color: 'white',
      borderColor: '#dc3545',
    },
    link: { // For less prominent actions
      backgroundColor: 'transparent',
      color: '#007bff',
      border: 'none',
      textDecoration: 'underline',
      padding: '0.25rem', // Minimal padding for link-like buttons
    }
  };

  // Hover and Focus styles (pseudo-classes not directly supported in inline styles this way)
  // Consider using CSS classes or styled-components for advanced styling.
  // For this exercise, we'll keep it simple.
  // A simple way to indicate hover for primary/secondary/danger is to darken them slightly,
  // but this is hard to do dynamically with inline styles without JS event handlers.

  return (
    <button
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style
      }}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;
