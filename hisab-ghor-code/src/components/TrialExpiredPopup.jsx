import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, MessageCircle, KeyRound, CheckCircle2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useAccountStatus } from '@/hooks/useAccountStatus';
import { endOfLocalDayAfterIso, localCalendarDaysLeft } from '@/lib/accountDates';
import useBackClose from '@/hooks/useBackClose';

const ADMIN_WHATSAPP = '8801893017273';

export default function TrialExpiredPopup({ open, onOpenChange, onActivated, ensureRootBackGuard = false, titleOverride, subtitleOverride }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const bn = language === 'bn';

  // Mobile back button closes the popup instead of exiting the app
  useBackClose(open, onOpenChange, { ensureRootSentinel: ensureRootBackGuard });

  const { isActivationExpired, isTrial, isAdminDeactivated } = useAccountStatus();
  const isTrialActive = (localCalendarDaysLeft(user?.trial_end_date) ?? -1) >= 0;
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [activating, setActivating] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleActivate = async () => {
    if (!code.trim() || !user) {
      setError(bn ? 'কোড লিখুন' : 'Enter code');
      return;
    }
    setActivating(true);
    setError('');
    try {
      const me = await base44.auth.me();
      const inputCode = code.trim().toUpperCase();

      const codeMap = {
        [me.activation_code_3m]: { duration: 90, type: '3months' },
        [me.activation_code_6m]: { duration: 180, type: '6months' },
        [me.activation_code_1y]: { duration: 365, type: '1year' },
        [me.activation_code_lifetime]: { duration: 36500, type: 'lifetime' },
      };

      const match = codeMap[inputCode];
      if (!match) {
        setError(bn ? 'ভুল কোড! অনুগ্রহ করে সঠিক কোড লিখুন।' : 'Wrong code! Please enter the correct code.');
        setActivating(false);
        return;
      }

      const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const updateData = {
        is_activated: true,
        account_status: 'activated',
        activation_end_date: endOfLocalDayAfterIso(match.duration),
        package_type: match.type,
      };
      if (match.type === '3months') updateData.activation_code_3m = newCode;
      else if (match.type === '6months') updateData.activation_code_6m = newCode;
      else if (match.type === '1year') updateData.activation_code_1y = newCode;
      else if (match.type === 'lifetime') updateData.activation_code_lifetime = newCode;

      await base44.auth.updateMe(updateData);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCode('');
        onOpenChange(false);
        if (onActivated) onActivated();
      }, 1500);
    } catch {
      setError(bn ? 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'An error occurred. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  if (!user) return null;

  const waMessage = bn
    ? `আমার অ্যাকাউন্ট অ্যাক্টিভেট করতে চাই।\nইমেইল: ${user.email || ''}`
    : `I want to activate my account.\nEmail: ${user.email || ''}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setCode(''); setError(''); } onOpenChange(v); }}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white px-6 py-7 text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold mb-1">
            {titleOverride
              ? titleOverride
              : isAdminDeactivated
              ? (bn ? 'একাউন্ট ডিঅ্যাক্টিভেটেড' : 'Account Deactivated')
              : isActivationExpired
                ? (bn ? 'অ্যাক্টিভেশন শেষ হয়েছে' : 'Activation Expired')
                : isTrialActive
                  ? (bn ? 'ট্রায়াল শেষ হয়ে আসছে' : 'Trial Ending Soon')
                  : (bn ? 'ট্রায়াল শেষ হয়েছে' : 'Trial Expired')}
          </h2>
          <p className="text-orange-100 text-sm">
            {subtitleOverride
              ? subtitleOverride
              : isAdminDeactivated
              ? (bn ? 'এডমিন আপনার একাউন্ট ডিঅ্যাক্টিভেট করেছেন' : 'Admin has deactivated your account')
              : isActivationExpired
                ? (bn ? 'পুনরায় অ্যাক্টিভেট করতে কোড দিন' : 'Enter code to reactivate')
                : isTrialActive
                  ? (bn ? 'দ্রুত অ্যাকাউন্ট অ্যাক্টিভেট করুন' : 'Activate your account quickly')
                  : (bn ? 'সকল ফিচার ব্যবহার করতে অ্যাকাউন্ট অ্যাক্টিভেট করুন' : 'Activate your account to use all features')}
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="font-semibold text-green-700 text-center">
                {bn ? 'অ্যাকাউন্ট সফলভাবে অ্যাক্টিভেট হয়েছে!' : 'Account activated successfully!'}
              </p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm text-gray-600 font-medium mb-2 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-500" />
                  {bn ? 'অ্যাক্টিভেশন কোড লিখুন' : 'Enter Activation Code'}
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder={bn ? 'কোড এখানে লিখুন' : 'Enter code here'}
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setError(''); }}
                    className="h-11 rounded-xl text-center font-mono text-lg tracking-widest uppercase"
                    onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                  />
                  <Button
                    onClick={handleActivate}
                    disabled={activating || !code.trim()}
                    className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 shrink-0"
                  >
                    {activating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (bn ? 'অ্যাক্টিভেট' : 'Activate')}
                  </Button>
                </div>
                {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
              </div>

              <div className="flex items-center gap-3 text-gray-300">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{bn ? 'অথবা' : 'or'}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div>
                <p className="text-xs text-gray-500 text-center mb-2">
                  {bn ? 'কোড পেতে এডমিনের সাথে যোগাযোগ করুন' : 'Contact admin to get activation code'}
                </p>
                <a
                  href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(waMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full h-11 rounded-xl bg-green-600 hover:bg-green-700 gap-2 font-semibold">
                    <MessageCircle className="w-5 h-5" />
                    {bn ? 'WhatsApp-এ যোগাযোগ করতে এখানে ক্লিক করুন' : 'Click here to contact on WhatsApp'}
                  </Button>
                </a>
              </div>

              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="w-full h-9 rounded-xl text-gray-400 text-sm"
              >
                {bn ? 'পরে করব' : 'Maybe later'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}