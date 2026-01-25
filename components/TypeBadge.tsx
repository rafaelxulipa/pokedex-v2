import React from 'react';
import { TYPE_COLORS } from '../constants';

interface TypeBadgeProps {
  type: string;
  size?: 'sm' | 'md';
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ type, size = 'md' }) => {
  const colorClass = TYPE_COLORS[type.toLowerCase()] || 'bg-gray-400';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`${colorClass} ${sizeClass} text-white font-medium rounded-full capitalize shadow-sm inline-block mr-1 mb-1`}
    >
      {type}
    </span>
  );
};

export default TypeBadge;
