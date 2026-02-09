import React from 'react';

const COLORS = ['#6C5DD3', '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22'];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export const Avatar: React.FC<{
  src?: string;
  name: string;
  size?: string;
  className?: string;
}> = ({ src, name, size = 'w-10 h-10', className = '' }) => {
  if (src) {
    return <img src={src} loading="lazy" className={`${size} rounded-full object-cover ${className}`} alt="" />;
  }
  return (
    <div className={`${size} rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${className}`} style={{ backgroundColor: getColor(name) }}>
      {getInitials(name)}
    </div>
  );
};
