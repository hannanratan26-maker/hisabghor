import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, MessageCircle, KeyRound, CheckCircle2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthContext';
import { endOfLocalDayAfterIso } from '@/lib/accountDates';
import useBackClose from '@/hooks/useBackClose';

const ADMIN_WHATSAPP = '8801893017273';

export default function ActivationExpiredPopup({ open, onOpenChange, onActivated, ensureRootBackGuard = false }) {
  const { language } = useLanguage();
  const authContext = useAuth();
  const user = authContext?.user;
  const bn = language === 'bn';
  
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [activating, setActivating] = useState(false);
  const [success, setSuccess] = useState(false);

  // Mobile back button closes the popup instead of exiting the app
  useBackClose(open && !!user, onOpenChange, { ensureRootSentinel: ensureRootBackGuard });

  // Don't render dialog if no user or not open
  if (!open || !user) return null;

  const isAdminDeactivated = user.account_status === 'deactivated';

  const handleActivate = async () => {
    if (!code.trim() || !user) {
      setError(bn ? 'কোড লিখুন' : 'Enter code');
      return;
    }
    setActivating(true);
    setError('');
    try {
      // Redeem server-side: package codes are never readable/writable from the client
      const { data: packageType, error: redeemError } = await supabase.rpc('redeem_package', {
        _code: code.trim().toUpperCase(),
      });

      if (redeemError) throw redeemError;

      if (!packageType) {
        setError(bn ? 'ভুল কোড বা কোড ইতিমধ্যে ব্যবহৃত হয়েছে!' : 'Invalid code or already used!');
        setActivating(false);
        return;
      }

      const durationMap = {
        '3months': 90,
        '6months': 180,
        '1year': 365,
        'lifetime': 36500
      };

      // Update user activation
      await base44.auth.updateMe({ 
        is_activated: true,
        account_status: 'activated',
        activation_end_date: endOfLocalDayAfterIso(durationMap[packageType]),
        package_type: packageType
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCode('');
        onOpenChange(false);
        if (onActivated) onActivated();
      }, 1500);
    } catch (err) {
      console.error('Activation error:', err);
      setError(bn ? 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'An error occurred. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  const waMessage = bn
    ? `আমার অ্যাকাউন্ট অ্যাক্টিভেট করতে চাই।\nইমেইল: ${user.email || ''}`
    : `I want to activate my account.\nEmail: ${user.email || ''}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setCode(''); setError(''); } onOpenChange(v); }}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-br ${isAdminDeactivated ? 'from-gray-700 to-gray-900' : 'from-red-500 to-red-600'} text-white px-6 py-7 text-center`}>
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold mb-1">
            {isAdminDeactivated
              ? (bn ? 'একাউন্ট ডিঅ্যাক্টিভেটেড' : 'Account Deactivated')
              : (bn ? 'অ্যাক্টিভেশন শেষ হয়েছে' : 'Activation Expired')}
          </h2>
          <p className="text-white/80 text-sm">
            {isAdminDeactivated
              ? (bn ? 'এডমিন আপনার একাউন্ট ডিঅ্যাক্টিভেট করেছেন' : 'Your account has been deactivated by admin')
              : (bn ? 'আপনার অ্যাকাউন্ট পুনরায় অ্যাক্টিভেট করুন' : 'Reactivate your account')}
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
              {/* Activation Code */}
              <div>
                <p className="text-sm text-gray-600 font-medium mb-2 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-500" />
                  {bn ? 'প্যাকেজ কোড লিখুন' : 'Enter Package Code'}
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

              {/* WhatsApp */}
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
                    {bn ? 'WhatsApp-এ যোগাযোগ করুন' : 'Contact on WhatsApp'}
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