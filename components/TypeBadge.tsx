import React from 'react';
import { TYPE_COLORS } from '../constants';
import TypeIcon from './TypeIcon';

interface TypeBadgeProps {
  type: string;
  size?: 'sm' | 'md';
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ type, size = 'md' }) => {
  const colorClass = TYPE_COLORS[type.toLowerCase()] || 'bg-gray-400';
  const sizeClass = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-1.5 text-sm';
  const iconSizeClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span
      className={`${colorClass} ${sizeClass} text-white font-bold rounded-full capitalize shadow-xs inline-flex items-center justify-center gap-1.5 mr-1 mb-1`}
    >
      <TypeIcon type={type} className={iconSizeClass} />
      <span>{type}</span>
    </span>
  );
};

export default TypeBadge;
