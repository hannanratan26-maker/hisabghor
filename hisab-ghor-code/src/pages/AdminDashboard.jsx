import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Users, CheckCircle2, XCircle, Mail, Phone, Calendar, Shield, Trash2, Clock, Settings, Copy, Check, RefreshCw, Zap, ZapOff, Bell, BellOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { requestEmailConfirmation, useEmailConfirmed } from '@/lib/emailVerify';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { addLocalDaysToDateIso, endOfLocalDayAfterIso, isLocalDayExpired, localCalendarDaysLeft } from '@/lib/accountDates';

const MAIN_ADMINS = ['hannanratan27@gmail.com'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [currentAdminEmail, setCurrentAdminEmail] = useState('');
  const [showDeleteVerify, setShowDeleteVerify] = useState(false);
  const [deleteVerifyCode, setDeleteVerifyCode] = useState('');
  const [generatedDeleteCode, setGeneratedDeleteCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showTrialSettings, setShowTrialSettings] = useState(false);
  const [defaultTrialDays, setDefaultTrialDays] = useState(7);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [activationUserId, setActivationUserId] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [roleConfirm, setRoleConfirm] = useState(null);
  const [deactivateUserId, setDeactivateUserId] = useState(null);
  const [showDeactivateVerify, setShowDeactivateVerify] = useState(false);
  const [deactivateVerifyCode, setDeactivateVerifyCode] = useState('');
  const [generatedDeactivateCode, setGeneratedDeactivateCode] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [freeMode, setFreeMode] = useState(false);
  const [freeModeLoading, setFreeModeLoading] = useState(false);
  const [showFreeModeVerify, setShowFreeModeVerify] = useState(false);
  const [freeModeVerifyCode, setFreeModeVerifyCode] = useState('');
  const [confirmSentAt, setConfirmSentAt] = useState(0);
  const emailConfirmed = useEmailConfirmed(true, confirmSentAt);
  const [generatedFreeModeCode, setGeneratedFreeModeCode] = useState('');
  const [pendingFreeModeValue, setPendingFreeModeValue] = useState(null);
  const [emailVerifyOff, setEmailVerifyOff] = useState(false);
  const [showEmailVerifyToggleConfirm, setShowEmailVerifyToggleConfirm] = useState(false);
  const [showDirectDeleteConfirm, setShowDirectDeleteConfirm] = useState(false);
  const [showDirectDeactivateConfirm, setShowDirectDeactivateConfirm] = useState(false);
  const [showDirectFreeModeConfirm, setShowDirectFreeModeConfirm] = useState(false);

  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (!adminSession) {
      navigate('/Admin');
      toast.error('অনুগ্রহ করে প্রথমে লগইন করুন।');
      return;
    }
    const session = JSON.parse(adminSession);
    if (session.expiry < Date.now()) {
      localStorage.removeItem('adminSession');
      navigate('/Admin');
      toast.error('সেশন এক্সপায়ার হয়েছে। আবার লগইন করুন।');
    } else {
      setCurrentAdminEmail(session.email);
    }
  }, [navigate]);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  useEffect(() => {
    const setting = appSettings.find(s => s.key === 'default_trial_days');
    if (setting) setDefaultTrialDays(parseInt(setting.value) || 7);
    const freeSetting = appSettings.find(s => s.key === 'free_mode');
    setFreeMode(freeSetting?.value === 'true' || freeSetting?.value === true);
    const evSetting = appSettings.find(s => s.key === 'email_verify_off');
    setEmailVerifyOff(evSetting?.value === 'true' || evSetting?.value === true);
  }, [appSettings]);

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('ইউজার আপডেট সফল!');
      setShowDetails(false);
      setShowActivationDialog(false);
    },
    onError: () => toast.error('আপডেট ব্যর্থ হয়েছে'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('ইউজার ডিলিট সফল!');
      setDeleteUserId(null);
      setShowDeleteVerify(false);
      setDeleteVerifyCode('');
      setGeneratedDeleteCode('');
    },
    onError: () => toast.error('ডিলিট ব্যর্থ হয়েছে'),
  });

  const filtered = allUsers.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.mobile_number || '').toLowerCase().includes(search.toLowerCase())
  );

  const now = new Date();
  const isDeactivated = (u) => u.activation_end_date && isLocalDayExpired(u.activation_end_date, now);
  const isActiveActivated = (u) => u.is_activated === true && !isDeactivated(u);

  const hasActiveTrial = (u) => {
    const daysLeft = localCalendarDaysLeft(u.trial_end_date, now);
    return !isDeactivated(u) && !u.is_activated && daysLeft !== null && daysLeft >= 0;
  };

  const hasExpiredTrial = (u) => {
    const daysLeft = localCalendarDaysLeft(u.trial_end_date, now);
    return !isDeactivated(u) && !u.is_activated && daysLeft !== null && daysLeft < 0;
  };

  const stats = {
    total: allUsers.length,
    activated: allUsers.filter(u => isActiveActivated(u)).length,
    deactivated: allUsers.filter(u => isDeactivated(u)).length,
    trial: allUsers.filter(hasActiveTrial).length,
    trial_expired: allUsers.filter(hasExpiredTrial).length,
    admins: allUsers.filter(u => u.role === 'admin').length,
  };

  const getTrialInfo = (u) => {
    if (u.is_activated === true) return null;
    if (!u.trial_end_date) return null;
    const end = new Date(u.trial_end_date);
    const daysLeft = localCalendarDaysLeft(end, now) ?? 0;
    return { end, daysLeft, expired: daysLeft < 0 };
  };

  const getActivationInfo = (u) => {
    if (!u.is_activated || !u.activation_end_date) return null;
    const end = new Date(u.activation_end_date);
    const daysLeft = localCalendarDaysLeft(end, now) ?? 0;
    return { end, daysLeft, expired: daysLeft < 0 };
  };

  const isMainAdmin = () => MAIN_ADMINS.some(email => email.toLowerCase() === currentAdminEmail.toLowerCase());

  const getOnlineStatus = (u) => {
    if (!u.last_active) return { online: false, label: 'কখনো আসেনি' };
    const diff = Date.now() - new Date(u.last_active).getTime();
    if (diff < 2 * 60 * 1000) return { online: true, label: 'অনলাইন' };
    return { online: false, label: `সর্বশেষ: ${formatDistanceToNow(new Date(u.last_active), { addSuffix: true })}` };
  };

  const handleTrialChange = (userId, deltaDays) => {
    if (!isMainAdmin()) { toast.error('শুধুমাত্র মেইন এডমিনরা ট্রায়াল বাড়াতে বা কমাতে পারবেন!'); return; }
    const u = allUsers.find(x => x.id === userId);
    if (!u) return;
    updateUserMutation.mutate({ userId, data: { trial_end_date: addLocalDaysToDateIso(u.trial_end_date || new Date(), deltaDays) } });
  };

  const handleActivationChange = (userId, deltaDays) => {
    if (!isMainAdmin()) { toast.error('শুধুমাত্র মেইন এডমিনরা অ্যাক্টিভেশনের মেয়াদ বাড়াতে বা কমাতে পারবেন!'); return; }
    const u = allUsers.find(x => x.id === userId);
    if (!u) return;
    updateUserMutation.mutate({ userId, data: { activation_end_date: addLocalDaysToDateIso(u.activation_end_date || new Date(), deltaDays) } });
  };

  const handleDirectActivation = (duration) => {
    if (!activationUserId) return;
    if (!isMainAdmin()) { toast.error('শুধুমাত্র মেইন এডমিনরা সরাসরি অ্যাক্টিভেট করতে পারবেন!'); return; }
    const durationMap = { '3months': 90, '6months': 180, '1year': 365, 'lifetime': 36500 };
    updateUserMutation.mutate({
      userId: activationUserId,
      data: { is_activated: true, account_status: 'activated', activation_end_date: endOfLocalDayAfterIso(durationMap[duration]), package_type: duration }
    });
  };

  const handleRequestFreeModeToggle = async () => {
    if (!isMainAdmin()) { toast.error('শুধুমাত্র মেইন এডমিনরা ফ্রি মোড চালু/বন্ধ করতে পারবেন!'); return; }
    if (emailVerifyOff) { setPendingFreeModeValue(!freeMode); setShowDirectFreeModeConfirm(true); return; }
    setFreeModeLoading(true);
    try {
      setPendingFreeModeValue(!freeMode);
      setConfirmSentAt(await requestEmailConfirmation(currentAdminEmail));
      toast.success('কনফার্মেশন লিংক আপনার ইমেইলে পাঠানো হয়েছে!');
      setShowFreeModeVerify(true);
    } catch (error) {
      toast.error('কনফার্মেশন লিংক পাঠাতে ব্যর্থ হয়েছে!');
    } finally {
      setFreeModeLoading(false);
    }
  };

  const handleToggleFreeMode = async () => {
    if (!emailConfirmed) { toast.error('আগে ইমেইলের লিংক এ ক্লিক করে কনফার্ম করুন!'); return; }
    setShowFreeModeVerify(false);
    setFreeModeVerifyCode('');
    setGeneratedFreeModeCode('');
    const newFreeMode = pendingFreeModeValue;
    setFreeModeLoading(true);
    try {
      const newFreeMode = !freeMode;
      if (newFreeMode) {
        // Snapshot current states
        const snapshot = {};
        allUsers.forEach(u => {
          snapshot[u.id] = {
            is_activated: u.is_activated || false,
            account_status: u.account_status || null,
            activation_end_date: u.activation_end_date || null,
            package_type: u.package_type || null,
          };
        });
        const snapshotSetting = appSettings.find(s => s.key === 'free_mode_snapshot');
        if (snapshotSetting) {
          await base44.entities.AppSettings.update(snapshotSetting.id, { value: JSON.stringify(snapshot) });
        } else {
          await base44.entities.AppSettings.create({ key: 'free_mode_snapshot', value: JSON.stringify(snapshot) });
        }
        // Set all users to lifetime
        const lifetimeEnd = endOfLocalDayAfterIso(36500);
        await Promise.all(allUsers.map(u =>
          base44.entities.User.update(u.id, {
            is_activated: true,
            account_status: 'activated',
            activation_end_date: lifetimeEnd,
            package_type: 'lifetime',
          })
        ));
        toast.success('ফ্রি মোড চালু! সকল ইউজার লাইফটাইম অ্যাক্টিভেটেড।');
      } else {
        // Restore snapshot — fetch fresh users to include those who joined during free mode
        const freshUsers = await base44.entities.User.list();
        const snapshotSetting = appSettings.find(s => s.key === 'free_mode_snapshot');
        if (snapshotSetting) {
          const snapshot = JSON.parse(snapshotSetting.value);
          const restorePromises = freshUsers.map(u => {
            if (snapshot[u.id]) {
              return base44.entities.User.update(u.id, snapshot[u.id]);
            } else {
              // New user who joined during free mode — reset to fresh trial from today
              return base44.entities.User.update(u.id, {
                is_activated: false,
                account_status: 'trial',
                activation_end_date: null,
                package_type: null,
                trial_end_date: endOfLocalDayAfterIso(7),
              });
            }
          });
          await Promise.all(restorePromises);
        }
        toast.success('ফ্রি মোড বন্ধ! সকল ইউজার আগের অবস্থায় ফিরে গেছে।');
      }
      // Save free_mode setting
      const freeSetting = appSettings.find(s => s.key === 'free_mode');
      if (freeSetting) {
        await base44.entities.AppSettings.update(freeSetting.id, { value: newFreeMode ? 'true' : 'false' });
      } else {
        await base44.entities.AppSettings.create({ key: 'free_mode', value: newFreeMode ? 'true' : 'false' });
      }
      setFreeMode(newFreeMode);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    } catch (err) {
      toast.error('ফ্রি মোড পরিবর্তন করতে ব্যর্থ হয়েছে!');
    } finally {
      setFreeModeLoading(false);
    }
  };

  const handleRoleToggle = async (userId, currentRole, userEmail) => {
    if (!isMainAdmin()) { toast.error('শুধুমাত্র মেইন এডমিনরা নতুন এডমিন যোগ করতে পারবেন!'); setRoleConfirm(null); return; }
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (newRole === 'admin') {
      try {
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
        localStorage.setItem(`adminPassword_${userEmail}`, randomPassword);
        toast.success(`এডমিন তৈরি হয়েছে। পাসওয়ার্ড: ${randomPassword} (কপি করে রাখুন)`, { duration: 30000 });
      } catch (error) {
        toast.error('ইমেইল পাঠাতে ব্যর্থ হয়েছে!');
        return;
      }
    }
    updateUserMutation.mutate({ userId, data: { role: newRole } });
  };

  const handleDeleteRequest = async (userId) => {
    if (!isMainAdmin()) { toast.error('শুধুমাত্র মেইন এডমিনরা ইউজার ডিলিট করতে পারবেন!'); return; }
    setDeleteUserId(userId);
    if (emailVerifyOff) { setShowDirectDeleteConfirm(true); return; }
    setIsVerifying(true);
    try {
      setConfirmSentAt(await requestEmailConfirmation(currentAdminEmail));
      toast.success('কনফার্মেশন লিংক আপনার ইমেইলে পাঠানো হয়েছে!');
      setShowDeleteVerify(true);
    } catch (error) {
      toast.error('কনফার্মেশন লিংক পাঠাতে ব্যর্থ হয়েছে!');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyDelete = async () => {
    if (emailConfirmed) {
      try {
        const targetUser = allUsers.find(u => u.id === deleteUserId);
        if (targetUser?.email) {
          const [parties, transactions, cashEntries] = await Promise.all([
            base44.entities.Party.filter({ created_by: targetUser.email }),
            base44.entities.Transaction.filter({ created_by: targetUser.email }),
            base44.entities.CashEntry.filter({ created_by: targetUser.email }),
          ]);
          await Promise.all([
            ...parties.map(p => base44.entities.Party.delete(p.id)),
            ...transactions.map(t => base44.entities.Transaction.delete(t.id)),
            ...cashEntries.map(c => base44.entities.CashEntry.delete(c.id)),
          ]);
        }
        deleteUserMutation.mutate(deleteUserId);
      } catch (err) {
        toast.error('ডেটা মুছতে সমস্যা হয়েছে!');
      }
    } else {
      toast.error('আগে ইমেইলের লিংক এ ক্লিক করে কনফার্ম করুন!');
    }
  };

  const handleDeactivateRequest = async (userId) => {
    if (!isMainAdmin()) { toast.error('শুধুমাত্র মেইন এডমিন একাউন্ট ডিঅ্যাক্টিভেট করতে পারবেন!'); return; }
    setDeactivateUserId(userId);
    if (emailVerifyOff) { setShowDirectDeactivateConfirm(true); return; }
    setIsDeactivating(true);
    try {
      setConfirmSentAt(await requestEmailConfirmation(currentAdminEmail));
      toast.success('কনফার্মেশন লিংক আপনার ইমেইলে পাঠানো হয়েছে!');
      setShowDeactivateVerify(true);
    } catch (error) {
      toast.error('কনফার্মেশন লিংক পাঠাতে ব্যর্থ হয়েছে!');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleVerifyDeactivate = async () => {
    if (emailConfirmed) {
      updateUserMutation.mutate({
        userId: deactivateUserId,
        data: { is_activated: false, account_status: 'deactivated', activation_end_date: new Date(Date.now() - 1000).toISOString() }
      });
      setShowDeactivateVerify(false);
      setDeactivateUserId(null);
      setDeactivateVerifyCode('');
      setGeneratedDeactivateCode('');
      setShowDetails(false);
    } else {
      toast.error('আগে ইমেইলের লিংক এ ক্লিক করে কনফার্ম করুন!');
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('adminSession');
    await supabase.auth.signOut();
    navigate('/Admin');
    toast.success('সফলভাবে লগআউট হয়েছে!');
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generateCodesForUser = async (userId) => {
    if (!isMainAdmin()) { toast.error('শুধুমাত্র মেইন এডমিনরা কোড জেনারেট করতে পারবেন!'); return; }
    const newCodes = {
      activation_code_3m: Math.random().toString(36).substring(2, 10).toUpperCase(),
      activation_code_6m: Math.random().toString(36).substring(2, 10).toUpperCase(),
      activation_code_1y: Math.random().toString(36).substring(2, 10).toUpperCase(),
      activation_code_lifetime: Math.random().toString(36).substring(2, 10).toUpperCase(),
      activation_code_shop: Math.random().toString(36).substring(2, 10).toUpperCase(),
    };
    await base44.entities.User.update(userId, newCodes);
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    setSelectedUser(prev => prev ? { ...prev, ...newCodes } : prev);
    toast.success('নতুন কোড জেনারেট হয়েছে!');
  };

  const handleSaveTrialSettings = async () => {
    if (!isMainAdmin()) { toast.error('শুধুমাত্র মেইন এডমিনরা সেটিংস পরিবর্তন করতে পারবেন!'); return; }
    try {
      const existing = appSettings.find(s => s.key === 'default_trial_days');
      if (existing) {
        await base44.entities.AppSettings.update(existing.id, { value: defaultTrialDays.toString() });
      } else {
        await base44.entities.AppSettings.create({ key: 'default_trial_days', value: defaultTrialDays.toString() });
      }
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('ডিফল্ট ট্রায়াল সময় আপডেট হয়েছে!');
      setShowTrialSettings(false);
    } catch (error) {
      toast.error('সেটিংস সেভ করতে ব্যর্থ হয়েছে!');
    }
  };

  const handleToggleEmailVerify = async () => {
    const newValue = !emailVerifyOff;
    try {
      const existing = appSettings.find(s => s.key === 'email_verify_off');
      if (existing) {
        await base44.entities.AppSettings.update(existing.id, { value: newValue ? 'true' : 'false' });
      } else {
        await base44.entities.AppSettings.create({ key: 'email_verify_off', value: newValue ? 'true' : 'false' });
      }
      setEmailVerifyOff(newValue);
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success(newValue ? 'ইমেইল ভেরিফিকেশন বন্ধ করা হয়েছে!' : 'ইমেইল ভেরিফিকেশন চালু করা হয়েছে!');
    } catch (err) {
      toast.error('পরিবর্তন করতে ব্যর্থ হয়েছে!');
    }
    setShowEmailVerifyToggleConfirm(false);
  };

  const executeDirectDelete = async () => {
    setShowDirectDeleteConfirm(false);
    try {
      const targetUser = allUsers.find(u => u.id === deleteUserId);
      if (targetUser?.email) {
        const [parties, transactions, cashEntries] = await Promise.all([
          base44.entities.Party.filter({ created_by: targetUser.email }),
          base44.entities.Transaction.filter({ created_by: targetUser.email }),
          base44.entities.CashEntry.filter({ created_by: targetUser.email }),
        ]);
        await Promise.all([
          ...parties.map(p => base44.entities.Party.delete(p.id)),
          ...transactions.map(t => base44.entities.Transaction.delete(t.id)),
          ...cashEntries.map(c => base44.entities.CashEntry.delete(c.id)),
        ]);
      }
      deleteUserMutation.mutate(deleteUserId);
    } catch (err) {
      toast.error('ডেটা মুছতে সমস্যা হয়েছে!');
    }
  };

  const executeDirectDeactivate = () => {
    setShowDirectDeactivateConfirm(false);
    updateUserMutation.mutate({
      userId: deactivateUserId,
      data: { is_activated: false, account_status: 'deactivated', activation_end_date: new Date(Date.now() - 1000).toISOString() }
    });
    setDeactivateUserId(null);
    setShowDetails(false);
  };

  const executeDirectFreeMode = async () => {
    setShowDirectFreeModeConfirm(false);
    const newFreeMode = pendingFreeModeValue;
    setFreeModeLoading(true);
    try {
      if (newFreeMode) {
        const snapshot = {};
        allUsers.forEach(u => { snapshot[u.id] = { is_activated: u.is_activated || false, account_status: u.account_status || null, activation_end_date: u.activation_end_date || null, package_type: u.package_type || null }; });
        const snapshotSetting = appSettings.find(s => s.key === 'free_mode_snapshot');
        if (snapshotSetting) await base44.entities.AppSettings.update(snapshotSetting.id, { value: JSON.stringify(snapshot) });
        else await base44.entities.AppSettings.create({ key: 'free_mode_snapshot', value: JSON.stringify(snapshot) });
        const lifetimeEnd = endOfLocalDayAfterIso(36500);
        await Promise.all(allUsers.map(u => base44.entities.User.update(u.id, { is_activated: true, account_status: 'activated', activation_end_date: lifetimeEnd, package_type: 'lifetime' })));
        toast.success('ফ্রি মোড চালু! সকল ইউজার লাইফটাইম অ্যাক্টিভেটেড।');
      } else {
        // Fetch fresh users to include those who joined during free mode
        const freshUsers2 = await base44.entities.User.list();
        const snapshotSetting = appSettings.find(s => s.key === 'free_mode_snapshot');
        if (snapshotSetting) {
          const snapshot = JSON.parse(snapshotSetting.value);
          await Promise.all(freshUsers2.map(u => {
            if (snapshot[u.id]) return base44.entities.User.update(u.id, snapshot[u.id]);
            return base44.entities.User.update(u.id, { is_activated: false, account_status: 'trial', activation_end_date: null, package_type: null, trial_end_date: endOfLocalDayAfterIso(7) });
          }));
        }
        toast.success('ফ্রি মোড বন্ধ! সকল ইউজার আগের অবস্থায় ফিরে গেছে।');
      }
      const freeSetting = appSettings.find(s => s.key === 'free_mode');
      if (freeSetting) await base44.entities.AppSettings.update(freeSetting.id, { value: newFreeMode ? 'true' : 'false' });
      else await base44.entities.AppSettings.create({ key: 'free_mode', value: newFreeMode ? 'true' : 'false' });
      setFreeMode(newFreeMode);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    } catch (err) {
      toast.error('ফ্রি মোড পরিবর্তন করতে ব্যর্থ হয়েছে!');
    } finally {
      setFreeModeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">এডমিন প্যানেল</h1>
              <p className="text-gray-500 dark:text-slate-400 text-sm">ইউজার ম্যানেজমেন্ট সিস্টেম</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleLogout} variant="outline" className="rounded-xl">
                লগআউট
              </Button>
              {isMainAdmin() && (
                <>
                  <Button onClick={() => setShowTrialSettings(true)} variant="outline" className="rounded-xl gap-2">
                    <Settings className="w-4 h-4" /> ট্রায়াল সেটিংস
                  </Button>
                  <Button
                    onClick={handleRequestFreeModeToggle}
                    disabled={freeModeLoading}
                    className={`rounded-xl gap-2 font-semibold ${freeMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'}`}
                  >
                    {freeModeLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : freeMode ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                    {freeMode ? 'ফ্রি মোড: চালু ✓' : 'ফ্রি মোড: বন্ধ'}
                  </Button>
                  <Button
                    onClick={() => { if (!isMainAdmin()) { toast.error('শুধুমাত্র মেইন এডমিনরা এটি পরিবর্তন করতে পারবেন!'); return; } setShowEmailVerifyToggleConfirm(true); }}
                    className={`rounded-xl gap-2 font-semibold ${emailVerifyOff ? 'bg-red-100 hover:bg-red-200 text-red-800 border border-red-300' : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'}`}
                  >
                    {emailVerifyOff ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    {emailVerifyOff ? 'ইমেইল ভেরিফি: বন্ধ' : 'ইমেইল ভেরিফি: চালু'}
                  </Button>
                </>
              )}
            </div>
          </div>
          {freeMode && (
            <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
              <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-emerald-700 text-sm font-medium">ফ্রি মোড সক্রিয় — সকল ইউজার লাইফটাইম অ্যাক্টিভেটেড এবং নতুন সাইনআপ স্বয়ংক্রিয়ভাবে অ্যাক্টিভেট হবে।</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'মোট ইউজার', value: stats.total, icon: Users, color: 'bg-blue-50 dark:bg-blue-900/30', iconColor: 'text-blue-600' },
            { label: 'অ্যাক্টিভেটেড', value: stats.activated, icon: CheckCircle2, color: 'bg-green-50 dark:bg-green-900/30', iconColor: 'text-green-600' },
            { label: 'ট্রায়াল', value: stats.trial, icon: Clock, color: 'bg-amber-50 dark:bg-amber-900/30', iconColor: 'text-amber-600' },
            { label: 'ট্রায়াল শেষ', value: stats.trial_expired, icon: XCircle, color: 'bg-red-50 dark:bg-red-900/30', iconColor: 'text-red-600' },
            { label: 'ডিঅ্যাক্টিভেটেড', value: stats.deactivated, icon: XCircle, color: 'bg-orange-50 dark:bg-orange-900/30', iconColor: 'text-orange-600' },
            { label: 'এডমিন', value: stats.admins, icon: Shield, color: 'bg-purple-50 dark:bg-purple-900/30', iconColor: 'text-purple-600' },
          ].map(({ label, value, icon: Icon, color, iconColor }) => (
            <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="ইউজার খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 rounded-2xl bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-base"
            />
          </div>
        </div>

        {/* User List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-slate-400">কোনো ইউজার পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {filtered.map(u => (
                <div key={u.id} className="p-5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
                      {(u.full_name || u.email)?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-lg truncate">{u.full_name || 'নাম নেই'}</h3>
                          {u.username && <p className="text-sm text-gray-500 dark:text-slate-400">@{u.username}</p>}
                        </div>
                        <div className="flex gap-2 shrink-0 flex-col items-end">
                          {(() => { const s = getOnlineStatus(u); return (
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2.5 h-2.5 rounded-full ${s.online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                              <span className={`text-xs font-medium ${s.online ? 'text-green-600' : 'text-gray-400'}`}>{s.label}</span>
                            </div>
                          ); })()}
                          <div className="flex gap-1">
                            <Badge className={`rounded-lg ${isDeactivated(u) ? 'bg-orange-500' : isActiveActivated(u) ? 'bg-green-600' : getTrialInfo(u)?.expired ? 'bg-red-500' : 'bg-amber-500'}`}>
                              {isDeactivated(u) ? '🔴 Deactivated' : isActiveActivated(u) ? '✓ Active' : getTrialInfo(u)?.expired ? '⏰ Trial Expired' : '⏳ Trial'}
                            </Badge>
                            {u.role === 'admin' && <Badge className="rounded-lg bg-purple-600">Admin</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-slate-400 mb-3">
                        <div className="flex items-center gap-2"><Mail className="w-4 h-4" /><span className="truncate">{u.email}</span></div>
                        {u.mobile_number && <div className="flex items-center gap-2"><Phone className="w-4 h-4" /><span>{u.mobile_number}</span></div>}
                      </div>

                      {isDeactivated(u) && (
                        <div className="w-full flex items-center gap-2 text-xs bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-2 mb-2">
                          <Calendar className="w-3 h-3 text-orange-600" />
                          <span className="text-orange-700 dark:text-orange-300 font-medium flex-1">অ্যাক্টিভেশন শেষ হয়েছে</span>
                          {isMainAdmin() && u.package_type !== 'lifetime' && <button onClick={() => handleActivationChange(u.id, 1)} className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded font-bold">+1d</button>}
                        </div>
                      )}
                      {!isDeactivated(u) && !u.is_activated && getTrialInfo(u) && (
                        <div className="w-full flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 mb-2">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span className="text-amber-700 dark:text-amber-300 font-medium flex-1">{getTrialInfo(u).daysLeft > 0 ? `ট্রায়াল: ${getTrialInfo(u).daysLeft} দিন বাকি` : getTrialInfo(u).daysLeft === 0 ? 'ট্রায়াল: আজ শেষ' : 'ট্রায়াল শেষ'}</span>
                          {isMainAdmin() && (
                            <div className="flex gap-1">
                              {getTrialInfo(u).daysLeft >= 0 && <button onClick={() => handleTrialChange(u.id, -1)} className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded font-bold">-1d</button>}
                              <button onClick={() => handleTrialChange(u.id, 1)} className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded font-bold">+1d</button>
                            </div>
                          )}
                        </div>
                      )}
                      {!isDeactivated(u) && u.is_activated && u.package_type !== 'lifetime' && getActivationInfo(u) && (
                        <div className="w-full flex items-center gap-2 text-xs bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 mb-2">
                          <Calendar className="w-3 h-3 text-green-600" />
                          <span className="text-green-700 dark:text-green-300 font-medium flex-1">{getActivationInfo(u).daysLeft > 0 ? `অ্যাক্টিভেশন: ${getActivationInfo(u).daysLeft} দিন বাকি` : getActivationInfo(u).daysLeft === 0 ? 'অ্যাক্টিভেশন: আজ শেষ' : 'অ্যাক্টিভেশন শেষ'}</span>
                          {isMainAdmin() && (
                            <div className="flex gap-1">
                              {getActivationInfo(u).daysLeft >= 0 && <button onClick={() => handleActivationChange(u.id, -1)} className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded font-bold">-1d</button>}
                              <button onClick={() => handleActivationChange(u.id, 1)} className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded font-bold">+1d</button>
                            </div>
                          )}
                        </div>
                      )}
                      {!isDeactivated(u) && u.is_activated && u.package_type === 'lifetime' && (
                        <div className="w-full flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2 mb-2">
                          <span className="text-emerald-700 dark:text-emerald-300 font-medium">♾️ লাইফটাইম অ্যাক্টিভেশন</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedUser(u); setShowDetails(true); }} className="rounded-lg">বিস্তারিত</Button>
                        {isMainAdmin() && !MAIN_ADMINS.some(email => email.toLowerCase() === u.email.toLowerCase()) && (
                          <>
                            {!u.is_activated && (
                              <Button size="sm" onClick={() => { setActivationUserId(u.id); setSelectedDuration(null); setShowActivationDialog(true); }} className="rounded-lg bg-emerald-600 hover:bg-emerald-700">
                                সরাসরি অ্যাক্টিভেট করুন
                              </Button>
                            )}
                            <Button size="sm" variant="secondary" onClick={() => setRoleConfirm({ userId: u.id, currentRole: u.role, userEmail: u.email, userName: u.full_name || u.email })} className="rounded-lg">
                              {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteRequest(u.id)} disabled={isVerifying} className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Free Mode Verify Dialog */}
      <Dialog open={showFreeModeVerify} onOpenChange={(v) => { if (!v) { setShowFreeModeVerify(false); setFreeModeVerifyCode(''); setGeneratedFreeModeCode(''); setPendingFreeModeValue(null); } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-xl text-emerald-600">ফ্রি মোড {pendingFreeModeValue ? 'চালু' : 'বন্ধ'} ভেরিফিকেশন</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
          {emailConfirmed ? (
              <p className="text-sm font-semibold text-green-700 dark:text-green-400 text-center">ইমেইল ভেরিফিকেশন সম্পূর্ণ হয়েছে</p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-slate-400">একটি কনফার্মেশন লিংক পাঠানো হয়েছে। লিংক এ ক্লিক করে কনফার্ম করুন।</p>
            )}
            <div className="flex gap-2">
              <Button onClick={() => { setShowFreeModeVerify(false); setFreeModeVerifyCode(''); setGeneratedFreeModeCode(''); setPendingFreeModeValue(null); }} variant="outline" className="flex-1 h-12 rounded-xl">বাতিল</Button>
              <Button onClick={handleToggleFreeMode} disabled={!emailConfirmed || freeModeLoading} className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700">নিশ্চিত করুন</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activation Dialog */}
      <Dialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>সরাসরি অ্যাক্টিভেশন</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {['3months', '6months', '1year', 'lifetime'].map(duration => (
              <Button key={duration} onClick={() => handleDirectActivation(duration)} disabled={updateUserMutation.isPending} className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700">
                {duration === '3months' && '৩ মাস'}{duration === '6months' && '৬ মাস'}{duration === '1year' && '১ বছর'}{duration === 'lifetime' && 'লাইফটাইম'}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Trial Settings Dialog */}
      <Dialog open={showTrialSettings} onOpenChange={setShowTrialSettings}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>ডিফল্ট ট্রায়াল সেটিংস</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">ডিফল্ট ট্রায়াল সময় (দিন)</Label>
              <Input type="number" min="1" max="365" value={defaultTrialDays} onChange={(e) => setDefaultTrialDays(parseInt(e.target.value) || 7)} className="h-12 rounded-xl" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowTrialSettings(false)} variant="outline" className="flex-1 h-12 rounded-xl">বাতিল</Button>
              <Button onClick={handleSaveTrialSettings} className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700">সেভ করুন</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Confirmation Dialog */}
      <AlertDialog open={!!roleConfirm} onOpenChange={(v) => { if (!v) setRoleConfirm(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className={roleConfirm?.currentRole === 'admin' ? 'text-red-600' : 'text-indigo-600'}>
              {roleConfirm?.currentRole === 'admin' ? 'এডমিন রিমুভ করবেন?' : 'এডমিন বানাবেন?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {roleConfirm?.currentRole === 'admin'
                ? `"${roleConfirm?.userName}" কে এডমিন থেকে সরিয়ে সাধারণ ইউজার করা হবে।`
                : `"${roleConfirm?.userName}" কে এডমিন বানানো হবে। তার ইমেইলে পাসওয়ার্ড পাঠানো হবে।`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              className={`rounded-xl ${roleConfirm?.currentRole === 'admin' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              onClick={() => { handleRoleToggle(roleConfirm.userId, roleConfirm.currentRole, roleConfirm.userEmail); setRoleConfirm(null); }}
            >
              {roleConfirm?.currentRole === 'admin' ? 'হ্যাঁ, সরিয়ে দিন' : 'হ্যাঁ, এডমিন করুন'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Verification Dialog */}
      <Dialog open={showDeleteVerify} onOpenChange={() => { setShowDeleteVerify(false); setDeleteUserId(null); setDeleteVerifyCode(''); setGeneratedDeleteCode(''); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-xl text-red-600">ইউজার ডিলিট ভেরিফিকেশন</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
          {emailConfirmed ? (
              <p className="text-sm font-semibold text-green-700 dark:text-green-400 text-center">ইমেইল ভেরিফিকেশন সম্পূর্ণ হয়েছে</p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-slate-400">একটি কনফার্মেশন লিংক পাঠানো হয়েছে। লিংক এ ক্লিক করে কনফার্ম করুন।</p>
            )}
            <div className="flex gap-2">
              <Button onClick={() => { setShowDeleteVerify(false); setDeleteUserId(null); setDeleteVerifyCode(''); setGeneratedDeleteCode(''); }} variant="outline" className="flex-1 h-12 rounded-xl">বাতিল</Button>
              <Button onClick={handleVerifyDelete} disabled={!emailConfirmed} className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700">নিশ্চিত করুন</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate Verification Dialog */}
      <Dialog open={showDeactivateVerify} onOpenChange={() => { setShowDeactivateVerify(false); setDeactivateUserId(null); setDeactivateVerifyCode(''); setGeneratedDeactivateCode(''); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-xl text-orange-600">একাউন্ট ডিঅ্যাক্টিভেট ভেরিফিকেশন</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
          {emailConfirmed ? (
              <p className="text-sm font-semibold text-green-700 dark:text-green-400 text-center">ইমেইল ভেরিফিকেশন সম্পূর্ণ হয়েছে</p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-slate-400">একটি কনফার্মেশন লিংক পাঠানো হয়েছে। লিংক এ ক্লিক করে কনফার্ম করুন।</p>
            )}
            <div className="flex gap-2">
              <Button onClick={() => { setShowDeactivateVerify(false); setDeactivateUserId(null); setDeactivateVerifyCode(''); setGeneratedDeactivateCode(''); }} variant="outline" className="flex-1 h-12 rounded-xl">বাতিল</Button>
              <Button onClick={handleVerifyDeactivate} disabled={!emailConfirmed} className="flex-1 h-12 rounded-xl bg-orange-600 hover:bg-orange-700">ডিঅ্যাক্টিভেট করুন</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Verify Toggle Confirm */}
      <AlertDialog open={showEmailVerifyToggleConfirm} onOpenChange={setShowEmailVerifyToggleConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className={emailVerifyOff ? 'text-blue-600' : 'text-red-600'}>
              {emailVerifyOff ? 'ইমেইল ভেরিফিকেশন চালু করবেন?' : 'ইমেইল ভেরিফিকেশন বন্ধ করবেন?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {emailVerifyOff
                ? 'ইমেইল ভেরিফিকেশন চালু হলে সকল সেন্সিটিভ অ্যাকশনে ইমেইল কোড পাঠানো হবে।'
                : 'সতর্কতা: ইমেইল ভেরিফিকেশন বন্ধ হলে ডিলিট, ডিঅ্যাক্টিভেশন এবং অন্যান্য অ্যাকশনে শুধু সতর্কতামূলক পপআপ আসবে, ইমেইল কোড পাঠানো হবে না।'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleEmailVerify} className={`rounded-xl ${emailVerifyOff ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {emailVerifyOff ? 'হ্যাঁ, চালু করুন' : 'হ্যাঁ, বন্ধ করুন'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Direct Delete Confirm */}
      <AlertDialog open={showDirectDeleteConfirm} onOpenChange={setShowDirectDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">ইউজার ডিলিট করবেন?</AlertDialogTitle>
            <AlertDialogDescription>সতর্কতা: এই ইউজারের সমস্ত ডেটা স্থায়ীভাবে মুছে যাবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => setDeleteUserId(null)}>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={executeDirectDelete} className="rounded-xl bg-red-600 hover:bg-red-700">হ্যাঁ, ডিলিট করুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Direct Deactivate Confirm */}
      <AlertDialog open={showDirectDeactivateConfirm} onOpenChange={setShowDirectDeactivateConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-600">একাউন্ট ডিঅ্যাক্টিভেট করবেন?</AlertDialogTitle>
            <AlertDialogDescription>সতর্কতা: এই ইউজারের একাউন্ট ডিঅ্যাক্টিভেট করা হবে এবং সে অ্যাপ্স ব্যবহার করতে পারবে না।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => setDeactivateUserId(null)}>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={executeDirectDeactivate} className="rounded-xl bg-orange-600 hover:bg-orange-700">হ্যাঁ, ডিঅ্যাক্টিভেট করুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Direct Free Mode Confirm */}
      <AlertDialog open={showDirectFreeModeConfirm} onOpenChange={setShowDirectFreeModeConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-emerald-600">ফ্রি মোড {pendingFreeModeValue ? 'চালু' : 'বন্ধ'} করবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingFreeModeValue
                ? 'সতর্কতা: ফ্রি মোড চালু হলে সকল ইউজার লাইফটাইম অ্যাক্টিভেটেড হয়ে যাবে।'
                : 'সতর্কতা: ফ্রি মোড বন্ধ হলে সকল ইউজার আগের অবস্থায় ফিরে যাবে।'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={executeDirectFreeMode} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">হ্যাঁ, নিশ্চিত করুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader><DialogTitle className="text-xl">ইউজার বিস্তারিত</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">ইমেইল</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 break-all">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">রোল</p>
                  <Badge className={selectedUser.role === 'admin' ? 'bg-purple-600' : ''}>{selectedUser.role}</Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">স্ট্যাটাস</p>
                  <Badge className={selectedUser.is_activated ? 'bg-green-600' : 'bg-gray-400'}>{selectedUser.is_activated ? 'Activated' : 'Pending'}</Badge>
                </div>
                {selectedUser.activation_end_date && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">মেয়াদ শেষ</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {selectedUser.package_type === 'lifetime' ? '♾️ লাইফটাইম' : format(new Date(selectedUser.activation_end_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {isMainAdmin() && !MAIN_ADMINS.some(email => email.toLowerCase() === selectedUser.email.toLowerCase()) && selectedUser.is_activated && (
                <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                  <Button size="sm" variant="outline" onClick={() => handleDeactivateRequest(selectedUser.id)} disabled={isDeactivating} className="w-full rounded-xl border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700">
                    <XCircle className="w-4 h-4 mr-2" />
                    {isDeactivating ? 'কোড পাঠানো হচ্ছে...' : 'একাউন্ট ডিঅ্যাক্টিভেট করুন'}
                  </Button>
                </div>
              )}

              <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">অ্যাক্টিভেশন কোড</p>
                  <Button size="sm" variant="outline" onClick={() => generateCodesForUser(selectedUser.id)} className="rounded-lg gap-1 text-xs">
                    <RefreshCw className="w-3 h-3" /> নতুন কোড
                  </Button>
                </div>
                <div className="space-y-2">
                  {[
                    { label: '৩ মাস', field: 'activation_code_3m', color: 'bg-blue-50 border-blue-200 text-blue-800' },
                    { label: '৬ মাস', field: 'activation_code_6m', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
                    { label: '১ বছর', field: 'activation_code_1y', color: 'bg-purple-50 border-purple-200 text-purple-800' },
                    { label: 'লাইফটাইম', field: 'activation_code_lifetime', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                    { label: 'নতুন দোকান', field: 'activation_code_shop', color: 'bg-amber-50 border-amber-200 text-amber-800' },
                  ].map(({ label, field, color }) => (
                    <div key={field} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${color}`}>
                      <div>
                        <p className="text-xs font-semibold mb-0.5">{label}</p>
                        <p className="font-mono text-sm font-bold tracking-wider">{selectedUser[field] || <span className="italic font-normal opacity-60">কোড নেই</span>}</p>
                      </div>
                      {selectedUser[field] && (
                        <button onClick={() => copyCode(selectedUser[field])} className="ml-2 p-1.5 rounded-lg hover:bg-black/10 transition-colors">
                          {copiedCode === selectedUser[field] ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}