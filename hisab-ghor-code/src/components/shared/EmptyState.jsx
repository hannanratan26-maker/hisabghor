import React from 'react';

export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {Icon && (
        <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-5">
          <Icon className="w-10 h-10 text-emerald-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 dark:text-slate-400 text-center max-w-xs mb-5">{subtitle}</p>}
      {action && action}
    </div>
  );
}