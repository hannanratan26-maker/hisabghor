import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, MoreVertical, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useLanguage } from '../LanguageContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CashEntryActions({ entry, onEdit, onDelete, transaction, canAct = true, onTrialExpired }) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!showDeleteDialog) return;
    window.history.pushState({ deleteGuard: true }, '');
    const block = () => setShowDeleteDialog(false);
    window.addEventListener('popstate', block);
    return () => window.removeEventListener('popstate', block);
  }, [showDeleteDialog]);

  // If entry is linked to a transaction, show read-only menu
  if (entry.transaction_id) {
    return (
      <Popover open={showMenu} onOpenChange={setShowMenu}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="end">
          <button
            onClick={() => {
              setShowMenu(false);
              if (transaction) {
                navigate(createPageUrl(`PartyDetail?id=${transaction.party_id}`));
              }
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-blue-50 text-blue-600 text-left"
          >
            <BookOpen className="w-4 h-4" />
            {language === 'bn' ? 'খাতা থেকে এডিট করুন' : 'Edit from Ledger'}
          </button>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <Popover open={showMenu} onOpenChange={setShowMenu}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1" align="end">
          <button
            onClick={() => {
              setShowMenu(false);
              onEdit(entry);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-50 text-left"
          >
            <Pencil className="w-4 h-4 text-blue-600" />
            {t('edit')}
          </button>
          <button
            onClick={() => {
              setShowMenu(false);
              if (!canAct) { onTrialExpired?.(); return; }
              setShowDeleteDialog(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-red-50 text-red-600 text-left"
          >
            <Trash2 className="w-4 h-4" />
            {t('delete')}
          </button>
        </PopoverContent>
      </Popover>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteEntry')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteEntryDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(entry.id)}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}