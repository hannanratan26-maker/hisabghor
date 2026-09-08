import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../LanguageContext';

export default function StatCard({ label, value, icon: Icon, color = 'emerald', subtext }) {
  const { language } = useLanguage();
  const colorMap = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', icon: 'text-emerald-500' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', icon: 'text-red-500' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', icon: 'text-blue-500' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', icon: 'text-amber-500' },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${c.bg} rounded-2xl p-4 flex items-center gap-3`}
    >
      <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 truncate">{label}</p>
        <p className={`text-lg font-bold ${c.text} leading-tight`}>৳{typeof value === 'number' ? value.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US') : value}</p>
        {subtext && <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">{subtext}</p>}
      </div>
    </motion.div>
  );
}