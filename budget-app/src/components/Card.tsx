import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string; // Allow passing custom classes
}

const Card: React.FC<CardProps> = ({ title, children, style, className }) => {
  const cardStyle: React.CSSProperties = {
    border: '1px solid #ddd', // Lighter border
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 4px 8px rgba(0,0,0,0.08)', // Slightly more pronounced shadow
    backgroundColor: '#ffffff',
    marginBottom: '1.5rem', // Increased margin
    ...style,
  };

  const titleStyle: React.CSSProperties = {
    marginTop: 0,
    marginBottom: '1.25rem', // Increased margin
    fontSize: '1.4rem', // Slightly adjusted size
    color: '#333',
    borderBottom: '1px solid #eaeaea',
    paddingBottom: '0.75rem'
  };

  return (
    <div style={cardStyle} className={className}>
      {title && <h3 style={titleStyle}>{title}</h3>} {/* Changed to h3 for semantic structure if Card is within a section with h2 */}
      {children}
    </div>
  );
};

export default Card;
