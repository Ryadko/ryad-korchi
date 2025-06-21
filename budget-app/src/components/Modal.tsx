import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  if (!isOpen) {
    return null;
  }

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker backdrop
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1050, // Higher z-index
    padding: '1rem', // Padding for smaller screens so modal doesn't touch edges
    boxSizing: 'border-box',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    small: { minWidth: '300px', maxWidth: '400px' },
    medium: { minWidth: '400px', maxWidth: '600px' },
    large: { minWidth: '500px', maxWidth: '800px' },
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)', // More defined shadow
    width: '100%', // Take up available width within size constraints
    ...sizeStyles[size],
    maxHeight: '90vh', // Slightly increased max height
    overflowY: 'auto',
    position: 'relative',
    animation: 'fadeInModal 0.3s ease-out', // Simple fade-in animation
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '1rem',
    right: '1.5rem',
    background: 'transparent',
    border: 'none',
    fontSize: '2rem', // Larger close icon
    fontWeight: 300, // Lighter weight for '×'
    color: '#666',
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
  };

  const titleStyle: React.CSSProperties = {
    marginTop: 0,
    marginBottom: '1.5rem',
    fontSize: '1.5rem', // Standardized title size
    color: '#333',
    borderBottom: '1px solid #eee',
    paddingBottom: '1rem',
  };

  // Keyframes for animation (not directly usable in inline styles, but for context)
  // @keyframes fadeInModal { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
  // This would typically be in a CSS file. For now, it's a conceptual note.

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
        // Adding a simple inline animation style for demonstration, though CSS classes are better
        // This specific animation won't work as 'animation' property expects keyframes defined in CSS.
        // It's more a placeholder for where one might add animation properties.
      >
        <button style={closeButtonStyle} onClick={onClose} aria-label="Close">&times;</button>
        {title && <h2 style={titleStyle}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

export default Modal;
