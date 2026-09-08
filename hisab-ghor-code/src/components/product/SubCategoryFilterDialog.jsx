import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X, Plus, HelpCircle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '@/lib/AuthContext';

const CATEGORIES = ['ইলেকট্রনিক্স', 'পোশাক', 'খাদ্য', 'গৃহস্থালি', 'প্রসাধনী', 'স্টেশনারি', 'অন্যান্য'];

export default function SubCategoryFilterDialog({ open, onClose, selected, onApply }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tempSelected, setTempSelected] = useState([]);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('অন্যান্য');

  const { data: subCategories = [] } = useQuery({
    queryKey: ['sub-categories', user?.email],
    queryFn: () => base44.entities.SubCategory.filter({ created_by: user.email }),
    enabled: !!user && open,
  });

  useEffect(() => {
    if (open) {
      setTempSelected(selected || []);
      setSearch('');
      setShowAddNew(false);
      setNewName('');
    }
  }, [open]);

  const createSubCat = useMutation({
    mutationFn: (data) => base44.entities.SubCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-categories', user?.email] });
      setNewName('');
      setShowAddNew(false);
    },
  });

  // Back button guard
  useEffect(() => {
    if (!open) return;
    let closedByPopstate = false;
    window.__popupOpen = true;
    window.history.pushState({ popupGuard: true }, '');
    const handlePop = () => {
      closedByPopstate = true;
      handleClose();
    };
    window.addEventListener('popstate', handlePop);
    return () => {
      window.__popupOpen = false;
      window.removeEventListener('popstate', handlePop);
      if (!closedByPopstate) {
        window.history.back();
      }
    };
  }, [open]);

  const handleClose = () => {
    onClose();
  };

  const handleApply = () => {
    onApply(tempSelected);
    handleClose();
  };

  const toggleSelect = (name) => {
    setTempSelected(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  const handleAddNew = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createSubCat.mutate({ name: trimmed, category: newCategory });
  };

  const filtered = subCategories.filter(s =>
    (s.name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center px-4" onClick={handleClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
            {bn ? 'প্রোডাক্ট সাব ক্যাটাগরি' : 'Product Sub Category'}
          </h3>
          <HelpCircle className="w-4 h-4 text-blue-500" />
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder={bn ? 'খোজ করুন' : 'Search'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-slate-100"
            />
          </div>
        </div>

        {/* List or Add New Form */}
        {showAddNew ? (
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{bn ? 'ক্যাটাগরি' : 'Category'}</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="mt-1 w-full h-10 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 text-sm focus:outline-none dark:text-slate-100"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{bn ? 'সাব ক্যাটাগরির নাম' : 'Sub Category Name'}</label>
              <input
                placeholder="Sub Category Name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                className="mt-1 w-full h-10 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-slate-100"
              />
            </div>
            <button
              onClick={handleAddNew}
              disabled={!newName.trim() || createSubCat.isPending}
              className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {createSubCat.isPending ? '...' : (bn ? 'সেভ করুন' : 'Save')}
            </button>
            <button
              onClick={() => { setShowAddNew(false); setNewName(''); }}
              className="w-full h-10 rounded-lg text-gray-500 text-sm"
            >
              {bn ? 'বাতিল' : 'Cancel'}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">
                {bn ? 'কোনো সাব ক্যাটাগরি নেই' : 'No sub categories'}
              </p>
            ) : (
              filtered.map(sc => (
                <button
                  key={sc.id}
                  onClick={() => toggleSelect(sc.name)}
                  className="flex items-center justify-between w-full py-3 border-b border-gray-100 dark:border-slate-700 active:opacity-70"
                >
                  <span className="text-sm text-gray-800 dark:text-slate-100">{sc.name}</span>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${tempSelected.includes(sc.name) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {tempSelected.includes(sc.name) && <span className="text-white text-xs">✓</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        {!showAddNew && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700">
            <button onClick={() => { onApply([]); onClose(); }} className="text-sm text-red-600 font-medium">
              {bn ? 'বন্ধ করুন' : 'Close'}
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddNew(true)}
                className="px-4 py-2 rounded-lg bg-gray-900 dark:bg-slate-200 text-white dark:text-slate-900 text-sm font-medium"
              >
                {bn ? 'নতুন ক্যাটাগরি' : 'New Category'}
              </button>
              {tempSelected.length > 0 && (
                <button
                  onClick={handleApply}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
                >
                  {bn ? `প্রয়োগ করুন (${tempSelected.length})` : `Apply (${tempSelected.length})`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}