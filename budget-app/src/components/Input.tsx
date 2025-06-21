import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label?: string;
  error?: string;
  as?: 'input' | 'select'; // To allow using this component for select elements too
  children?: React.ReactNode; // For select options
}

const Input: React.FC<InputProps> = ({ label, name, error, as = 'input', children, style, ...rest }) => {
  const commonStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem', // Increased padding
    border: error ? '1px solid #dc3545' : '1px solid #ced4da', // Bootstrap-like border colors
    borderRadius: '6px', // Consistent with Button
    boxSizing: 'border-box',
    fontSize: '1rem',
    backgroundColor: '#fff', // Ensure background is white
    color: '#495057', // Standard input text color
    transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
  };

  // Basic focus style (pseudo-classes like :focus are hard with inline styles)
  // This would ideally be handled with CSS classes or a styling library.
  // commonStyle[':focus'] = { // This won't work directly
  //   borderColor: '#80bdff',
  //   boxShadow: '0 0 0 0.2rem rgba(0,123,255,.25)',
  //   outline: 'none',
  // };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '500',
    color: '#333',
  };

  const errorStyle: React.CSSProperties = {
    color: '#dc3545', // Bootstrap danger color
    fontSize: '0.875em',
    marginTop: '0.25rem',
  };

  const containerStyle: React.CSSProperties = {
    marginBottom: '1rem',
  };

  const Element = as; // 'input' or 'select'

  return (
    <div style={containerStyle}>
      {label && <label htmlFor={name} style={labelStyle}>{label}</label>}
      <Element
        id={name}
        name={name}
        style={{...commonStyle, ...style}}
        {...rest}
      >
        {children}
      </Element>
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
};

export default Input;
