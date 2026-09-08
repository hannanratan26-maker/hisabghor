import React, { useState } from 'react';
import { requestEmailConfirmation, useEmailConfirmed } from '@/lib/emailVerify';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Trash2, AlertTriangle, Check, Mail, User, Phone, Shield, LogOut, Globe, Sun, Moon, Monitor, KeyRound, Clock, Calendar, Store, ArrowRight, ChevronUp, ChevronDown, QrCode, Shapes, SmartphoneNfc } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useLanguage } from '../components/LanguageContext';
import { useTheme } from '../components/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { useAccountStatus } from '@/hooks/useAccountStatus';
import TrialExpiredPopup from '../components/TrialExpiredPopup';
import { localCalendarDaysLeft } from '@/lib/accountDates';

const cooldownKeyFor = (id) => `hisabghor_delete_link_sent_at:${id || 'anon'}`;

export default function Settings() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { language, changeLanguage, t } = useLanguage();
  const { theme, changeTheme } = useTheme();
  const { user } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [confirmSentAt, setConfirmSentAt] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [showActivationPopup, setShowActivationPopup] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const emailConfirmed = useEmailConfirmed(showVerificationDialog, confirmSentAt);
  const { canAct, isActivated, isActivationExpired, isTrial, isTrialExpired, trialDaysLeft, isAdminDeactivated } = useAccountStatus();

  const { data: appSettings = [] } = useQuery({
    queryKey: ['app-settings-public'],
    queryFn: () => base44.entities.AppSettings.list(),
  });
  const emailVerifyOff = appSettings.some(s => s.key === 'email_verify_off' && (s.value === 'true' || s.value === true));
  const freeMode = appSettings.some(s => s.key === 'free_mode' && (s.value === 'true' || s.value === true));

  const userInfo = user;

  const { data: parties = [] } = useQuery({
    queryKey: ['parties', user?.email],
    queryFn: () => base44.entities.Party.filter({ created_by: user.email }),
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => base44.entities.Transaction.filter({ created_by: user.email }),
    enabled: !!user,
  });

  const { data: cashEntries = [] } = useQuery({
    queryKey: ['cashEntries', user?.email],
    queryFn: () => base44.entities.CashEntry.filter({ created_by: user.email }),
    enabled: !!user,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', user?.email],
    queryFn: () => base44.entities.Product.filter({ created_by: user.email }),
    enabled: !!user,
  });

  const { data: subCategories = [] } = useQuery({
    queryKey: ['subCategories', user?.email],
    queryFn: () => base44.entities.SubCategory.filter({ created_by: user.email }),
    enabled: !!user,
  });

  // Persisted 60s cooldown: survives dialog close, navigation and app restart
  const cooldownKey = cooldownKeyFor(user?.id);

  React.useEffect(() => {
    const tick = () => {
      let at = 0;
      try {
        at = Number(localStorage.getItem(cooldownKey) || 0);
      } catch {
        /* ignore */
      }
      const left = at ? Math.max(0, 60 - Math.floor((Date.now() - at) / 1000)) : 0;
      setCooldown(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [cooldownKey]);

  const sendVerificationCode = async () => {
    if (cooldown > 0) return;
    setSendingCode(true);
    try {
      const at = await requestEmailConfirmation(user.email);
      setConfirmSentAt(at);
      try {
        localStorage.setItem(cooldownKey, String(Date.now()));
      } catch {
        /* ignore */
      }
      setCooldown(60);
      setShowVerificationDialog(true);
    } catch (err) {
      alert(language === 'bn' ? 'কনফার্মেশন লিংক পাঠাতে সমস্যা হয়েছে' : 'Failed to send confirmation link');
    } finally {
      setSendingCode(false);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleDeleteClick = () => {
    if (!canAct) {
      setShowActivationPopup(true);
      return;
    }
    if (emailVerifyOff) {
      setShowDeleteWarning(true);
      return;
    }
    sendVerificationCode();
  };

  const verifyAndReset = async () => {
    if (!emailConfirmed) {
      setVerifyError(language === 'bn' ? 'আগে ইমেইলের লিংক এ ক্লিক করে কনফার্ম করুন!' : 'Please confirm via the email link first!');
      return;
    }
    
    setIsResetting(true);
    setShowVerificationDialog(false);
    
    try {
      for (const txn of transactions) {
        await base44.entities.Transaction.delete(txn.id);
      }
      
      for (const entry of cashEntries) {
        await base44.entities.CashEntry.delete(entry.id);
      }
      
      for (const party of parties) {
        await base44.entities.Party.delete(party.id);
      }

      for (const product of products) {
        await base44.entities.Product.delete(product.id);
      }

      for (const subCategory of subCategories) {
        await base44.entities.SubCategory.delete(subCategory.id);
      }
      
      setIsResetting(false);
      setResetSuccess(true);
      
      queryClient.invalidateQueries({ queryKey: ['parties', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['cashEntries', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['products', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['subCategories', user?.email] });
      
      setVerificationCode('');
      setSentCode('');
      
      setTimeout(() => {
        setResetSuccess(false);
        navigate(createPageUrl('Dashboard'));
      }, 2000);
    } catch (error) {
      console.error('Reset error:', error);
      setIsResetting(false);
      setVerifyError(language === 'bn' ? 'রিসেট করতে সমস্যা হয়েছে!' : 'Failed to reset!');
    }
  };

  const verifyAndResetDirect = async () => {
    setIsResetting(true);
    try {
      for (const txn of transactions) await base44.entities.Transaction.delete(txn.id);
      for (const entry of cashEntries) await base44.entities.CashEntry.delete(entry.id);
      for (const party of parties) await base44.entities.Party.delete(party.id);
      for (const product of products) await base44.entities.Product.delete(product.id);
      for (const subCategory of subCategories) await base44.entities.SubCategory.delete(subCategory.id);
      setIsResetting(false);
      setResetSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['parties', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['cashEntries', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['products', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['subCategories', user?.email] });
      setTimeout(() => { setResetSuccess(false); navigate(createPageUrl('Dashboard')); }, 2000);
    } catch (error) {
      setIsResetting(false);
    }
  };

  const totalRecords = parties.length + transactions.length + cashEntries.length + products.length + subCategories.length;
  const activationExpireDate = userInfo?.activation_end_date ? new Date(userInfo.activation_end_date) : null;
  const activationDaysLeft = activationExpireDate ? localCalendarDaysLeft(userInfo.activation_end_date) ?? 0 : 0;

  return (
    <>
    <div className="fixed inset-0 bottom-[4.5rem] flex flex-col bg-gray-50 dark:bg-slate-900 z-10">
      {/* Header */}
      <div className="bg-brand-green text-white px-5 pb-6 rounded-b-3xl flex-shrink-0" style={{ paddingTop: 'calc(0.35rem + env(safe-area-inset-top))' }}>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" /> {t('settings')}
        </h1>
        <p className="text-emerald-100 text-sm mt-1">{t('appManagement')}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* User Info Card */}
        {userInfo && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm mb-4">
            <h2 className="font-semibold text-gray-800 dark:text-slate-100 mb-4">{t('accountInfo')}</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-slate-700">
                <User className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t('username')}</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-slate-100">{userInfo.full_name || userInfo.username || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-slate-700">
                <Mail className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-slate-400">{language === 'bn' ? 'ইমেইল' : 'Email'}</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-slate-100">{userInfo.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-slate-700">
                <Phone className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t('mobileNumber')}</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-slate-100">{userInfo.mobile_number || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t('accountStatus')}</p>
                  <p className={`text-sm font-semibold ${isActivated ? 'text-green-600' : (isAdminDeactivated || isTrialExpired || isActivationExpired) ? 'text-red-600' : 'text-amber-600'}`}>
                    {isAdminDeactivated
                      ? (language === 'bn' ? '🔴 ডিঅ্যাক্টিভেটেড (এডমিন)' : '🔴 Deactivated (by Admin)')
                      : isActivated
                        ? (language === 'bn' ? '✓ অ্যাক্টিভেটেড' : '✓ Activated')
                        : isActivationExpired
                          ? (language === 'bn' ? '🔴 অ্যাক্টিভেশন শেষ' : '🔴 Activation Expired')
                          : isTrialExpired
                            ? (language === 'bn' ? '⏰ ট্রায়াল শেষ' : '⏰ Trial Expired')
                            : trialDaysLeft <= 0
                              ? (language === 'bn' ? '⏳ ট্রায়াল আজই শেষ' : '⏳ Trial ends today')
                              : (language === 'bn' ? `⏳ ট্রায়াল চলছে (${trialDaysLeft} দিন বাকি)` : `⏳ Trial Active (${trialDaysLeft} days left)`)}
                  </p>
                </div>
              </div>
              {isActivated && activationExpireDate && !freeMode && (
                <div className="flex items-center gap-3 py-2 border-t border-gray-50 dark:border-slate-700">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-slate-400">{language === 'bn' ? 'অ্যাক্টিভেশন শেষ হবে' : 'Activation Expires'}</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-100">
                      {userInfo?.package_type === 'lifetime'
                        ? (language === 'bn' ? '♾️ লাইফটাইম' : '♾️ Lifetime')
                        : `${activationExpireDate.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US')}${activationDaysLeft > 0 ? ` (${activationDaysLeft} ${language === 'bn' ? 'দিন বাকি' : 'days left'})` : ''}`}
                    </p>
                  </div>
                </div>
              )}
              {!isActivated && (
                <div className="pt-1">
                  <Button
                    onClick={() => setShowActivationPopup(true)}
                    className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 gap-2 font-semibold"
                  >
                    <KeyRound className="w-4 h-4" />
                    {language === 'bn' ? 'অ্যাকাউন্ট অ্যাক্টিভেট করুন' : 'Activate Account'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Change Shop */}
        <button
          type="button"
          onClick={async () => {
            if (user?.id) {
              await queryClient.prefetchQuery({
                queryKey: ['shops', user.id],
                queryFn: () => base44.entities.Shop.filter({ user_id: user.id }, '-created_date'),
                staleTime: 5 * 60 * 1000,
              });
            }
            navigate(createPageUrl('SelectShop'));
          }}
          className="w-full mb-4 flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm px-5 py-4 active:opacity-70"
        >
          <span className="flex items-center gap-3">
            <Store className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-gray-800 dark:text-slate-100 text-sm">
              {language === 'bn' ? 'দোকান পরিবর্তন করুন' : 'Change Shop'}
            </span>
          </span>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* হিসাবঘর এপ্স সেটিংস (collapsible) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setAppSettingsOpen(o => !o)}
            className="w-full flex items-center justify-between bg-blue-600 text-white px-5 py-4 active:opacity-90"
          >
            <span className="flex items-center gap-3">
              <SmartphoneNfc className="w-5 h-5" />
              <span className="font-bold text-base">
                {language === 'bn' ? 'হিসাবঘর এপ্স সেটিংস' : 'Hisab Ghor App Settings'}
              </span>
            </span>
            {appSettingsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {appSettingsOpen && (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              <button
                type="button"
                onClick={() => toast.info(language === 'bn' ? 'শীঘ্রই আসবে!' : 'Coming soon!', { duration: 1500 })}
                className="w-full flex items-center justify-between px-5 py-4 active:opacity-70"
              >
                <span className="flex items-center gap-3">
                  <QrCode className="w-5 h-5 text-gray-700 dark:text-slate-300" />
                  <span className="text-sm font-medium text-gray-800 dark:text-slate-100">
                    {language === 'bn' ? 'বিকাশ/নগদ কিউ আর' : 'bKash/Nagad QR'}
                  </span>
                </span>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                type="button"
                onClick={() => toast.info(language === 'bn' ? 'শীঘ্রই আসবে!' : 'Coming soon!', { duration: 1500 })}
                className="w-full flex items-center justify-between px-5 py-4 active:opacity-70"
              >
                <span className="flex items-center gap-3">
                  <Shapes className="w-5 h-5 text-gray-700 dark:text-slate-300" />
                  <span className="text-sm font-medium text-gray-800 dark:text-slate-100">
                    {language === 'bn' ? 'কাস্টম ক্যাটাগরি' : 'Custom Category'}
                  </span>
                </span>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>

              <div className="px-5 py-4">
                {resetSuccess ? (
                  <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-3 rounded-xl">
                    <Check className="w-5 h-5" />
                    <span className="font-semibold">{t('resetSuccess')}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={totalRecords === 0 || sendingCode || cooldown > 0}
                    onClick={handleDeleteClick}
                    className="w-full flex items-center justify-between active:opacity-70 disabled:opacity-50"
                  >
                    <span className="flex items-center gap-3 text-left">
                      <Trash2 className="w-5 h-5 text-red-600 shrink-0" />
                      <span>
                        <span className="block text-sm font-semibold text-red-600">
                          {sendingCode
                            ? t('sendingCode')
                            : cooldown > 0
                              ? (language === 'bn' ? `${cooldown} সেকেন্ড অপেক্ষা করুন` : `Wait ${cooldown}s`)
                              : (language === 'bn' ? 'বর্তমানে এপ্স এ থাকা সব ডেটা মুছে ফেলুন' : 'Delete all current app data')}
                        </span>
                        <span className="block text-xs text-red-500 mt-0.5">
                          {totalRecords === 0
                            ? t('noData')
                            : (language === 'bn' ? 'মুছে ফেললে সব তথ্য স্থায়ীভাবে চলে যাবে' : 'All data will be permanently removed')}
                        </span>
                      </span>
                    </span>
                    <ArrowRight className="w-5 h-5 text-red-400 shrink-0" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>


        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 text-sm mb-1">{t('importantInfo')}</h4>
              <p className="text-xs text-blue-700 leading-relaxed">
                {language === 'bn' ? 'রিসেট করার আগে নিশ্চিত হন যে আপনার প্রয়োজনীয় ডেটা ব্যাকআপ করে রাখা আছে।' : 'Make sure your necessary data is backed up before resetting.'}
              </p>
            </div>
          </div>
        </div>

        {/* Language & Logout Section */}
        <div className="mt-6 space-y-3">
          {/* Dark Mode Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3 mb-3">
              {theme === 'dark' ? <Moon className="w-5 h-5 text-gray-600 dark:text-slate-400" /> : theme === 'light' ? <Sun className="w-5 h-5 text-gray-600" /> : <Monitor className="w-5 h-5 text-gray-600 dark:text-slate-400" />}
              <span className="font-semibold text-gray-800 dark:text-slate-100">{language === 'bn' ? 'থিম' : 'Theme'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'light', icon: Sun, labelBn: 'লাইট', labelEn: 'Light' },
                { value: 'dark', icon: Moon, labelBn: 'ডার্ক', labelEn: 'Dark' },
              ].map(({ value, icon: Icon, labelBn, labelEn }) => (
                <button
                  key={value}
                  onClick={() => changeTheme(value)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 font-semibold text-xs transition-all active:opacity-70 ${
                    theme === value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {language === 'bn' ? labelBn : labelEn}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                <span className="font-semibold text-gray-800 dark:text-slate-100">{t('changeLanguage')}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => changeLanguage('bn')}
                className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                  language === 'bn' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                    : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-gray-300'
                }`}
              >
                বাংলা
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                  language === 'en' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                    : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-gray-300'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-14 rounded-xl border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 text-red-600 font-semibold text-base"
          >
            <LogOut className="w-5 h-5 mr-2" />
            {t('logout')}
          </Button>
        </div>
      </div>
    </div>

    <TrialExpiredPopup open={showActivationPopup} onOpenChange={setShowActivationPopup} user={userInfo} />

    <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
      <AlertDialogContent className="rounded-2xl max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">সমস্ত ডেটা মুছে ফেলবেন?</AlertDialogTitle>
          <AlertDialogDescription>সতর্কতা: এটি আপনার সব পার্টি, লেনদেন এবং ক্যাশ এন্ট্রি স্থায়ীভাবে মুছে দেবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setShowDeleteWarning(false); verifyAndResetDirect(); }} className="rounded-xl bg-red-600 hover:bg-red-700">হ্যাঁ, মুছে দিন</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <DialogTitle className="text-center">{t('verificationCode')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">📧 {user?.email}</p>
          </div>
          {emailConfirmed ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Check className="w-10 h-10 text-green-600" />
              <p className="text-sm font-semibold text-green-700 dark:text-green-400 text-center">{t('emailVerified')}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center">{t('codeSent')}</p>
          )}
          {verifyError && <p className="text-sm text-red-600 text-center">{verifyError}</p>}
          <Button
            onClick={verifyAndReset}
            disabled={isResetting || !emailConfirmed}
            className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700"
          >
            {isResetting ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />{t('deleting')}</>
            ) : (
              <><Trash2 className="w-4 h-4 mr-2" />{t('confirmDelete')}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}