import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PartyListItem from '../components/party/PartyListItem';
import AddPartyDialog from '../components/party/AddPartyDialog';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '../components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { useAccountStatus } from '@/hooks/useAccountStatus';
import TrialExpiredPopup from '../components/TrialExpiredPopup';

export default function Khata() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showTrialPopup, setShowTrialPopup] = useState(false);
  const { canAct } = useAccountStatus();

  const handleAddParty = () => {
    if (!canAct) { setShowTrialPopup(true); return; }
    setShowAdd(true);
  };
  const queryClient = useQueryClient();

  const { data: parties = [], isLoading } = useQuery({
    queryKey: ['parties', user?.email],
    queryFn: () => base44.entities.Party.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const createParty = useMutation({
    mutationFn: (data) => base44.entities.Party.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parties', user?.email] }),
  });

  const filtered = parties
    .filter(p => filter === 'all' || p.type === filter)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const totalOwed = parties.reduce((s, p) => {
    const bal = (p.total_debit || 0) - (p.total_credit || 0);
    return bal > 0 ? s + bal : s;
  }, 0);
  const totalReceivable = parties.reduce((s, p) => {
    const bal = (p.total_credit || 0) - (p.total_debit || 0);
    return bal > 0 ? s + bal : s;
  }, 0);

  return (
    <div className="fixed inset-0 bottom-0 flex flex-col bg-gray-50 dark:bg-slate-900 z-10">
      {/* Header - fixed */}
      <div className="bg-brand-green text-white px-5 pb-10 rounded-b-3xl flex-shrink-0" style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/20 rounded-lg active:opacity-70">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">
                {t('khata')}
              </h1>
              <p className="text-emerald-100 text-sm mt-1">{t('yourPartyList')}</p>
            </div>
          </div>
          <Button
            onClick={handleAddParty}
            className="bg-white/20 hover:bg-white/30 backdrop-blur h-10 gap-2 rounded-xl px-4"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">{t('addNewParty')}</span>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-white/15 backdrop-blur rounded-xl p-3">
            <p className="text-emerald-100 text-xs">{t('totalOwed')}</p>
            <p className="text-xl font-bold mt-1">৳{totalOwed.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-3">
            <p className="text-emerald-100 text-xs">{t('totalReceivableKhata')}</p>
            <p className="text-xl font-bold mt-1">৳{totalReceivable.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
          </div>
        </div>
      </div>

      {/* Search + Tabs + List */}
      <div className="flex flex-col flex-1 min-h-0 px-4 -mt-5">
        {/* Search - fixed */}
        <div className="flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('searchParty')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 shadow-sm border-gray-100"
            />
          </div>

          {/* Filter tabs - fixed */}
          <Tabs value={filter} onValueChange={setFilter} className="mt-4">
            <TabsList className="grid w-full grid-cols-4 h-10 bg-gray-100 dark:bg-slate-800 rounded-xl">
              <TabsTrigger value="all" className="rounded-lg text-xs">{t('all')} ({parties.length})</TabsTrigger>
              <TabsTrigger value="customer" className="rounded-lg text-xs">{t('customer')}</TabsTrigger>
              <TabsTrigger value="supplier" className="rounded-lg text-xs">{t('supplier')}</TabsTrigger>
              <TabsTrigger value="employee" className="rounded-lg text-xs">{t('employee')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Party list - scrollable */}
        <div className="mt-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="space-y-0">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-3 p-4 border-b border-gray-50 dark:border-slate-700">
                  <Skeleton className="w-11 h-11 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('noParty')}
              subtitle={t('addCustomerSupplier')}
              action={
                <Button onClick={handleAddParty} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                  <Plus className="w-4 h-4 mr-2" /> {t('addParty')}
                </Button>
              }
            />
          ) : (
            filtered.map(party => <PartyListItem key={party.id} party={party} />)
          )}
        </div>
      </div>

      <TrialExpiredPopup open={showTrialPopup} onOpenChange={setShowTrialPopup} />
      <AddPartyDialog open={showAdd} onOpenChange={setShowAdd} onSave={(data) => createParty.mutate(data)} />
    </div>
  );
}