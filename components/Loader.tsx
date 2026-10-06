import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'; // sm: inline (text lines), md: small blocks, lg: whole page (default)
  label?: string;
}

const SIZES = { sm: 22, md: 40, lg: 56 };

// Spinning Poké Ball, the same indicator that index.html shows while the app is loading
const Loader: React.FC<LoaderProps> = ({ size = 'lg', label = 'Carregando' }) => {
  const px = SIZES[size];
  return (
    <div className={`flex justify-center items-center ${size === 'lg' ? 'p-10' : size === 'md' ? 'p-4' : 'inline-flex align-middle'}`} role="status" aria-label={label}>
      <div className="pokeball-loader" style={{ width: px, height: px }} />
    </div>
  );
};

export default Loader;
