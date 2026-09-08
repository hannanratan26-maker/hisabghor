import React from 'react';

const COLORS = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'];

export default function PartyAvatar({ name, color, size = 'md', photoUrl }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const bgColor = color || COLORS[name ? name.charCodeAt(0) % COLORS.length : 0];
  const sizeClass = size === 'sm' ? 'w-9 h-9 text-sm' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-base';

  if (photoUrl) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden shrink-0`}>
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  
  return (
    <div className={`${sizeClass} ${bgColor} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {initial}
    </div>
  );
}