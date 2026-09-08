import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Store, MessageCircle, KeyRound, CheckCircle2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import useBackClose from '@/hooks/useBackClose';

const ADMIN_WHATSAPP = '8801893017273';

export default function ShopCodePopup({ open, onOpenChange, onSuccess, ensureRootBackGuard = false }) {
  const { language } = useLanguage();
  const { user, refreshUser } = useAuth();
  const bn = language === 'bn';

  useBackClose(open, onOpenChange, { ensureRootSentinel: ensureRootBackGuard });

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

      if (!me.activation_code_shop || inputCode !== String(me.activation_code_shop).toUpperCase()) {
        setError(bn ? 'ভুল কোড! নতুন দোকান কোড দিন।' : 'Wrong code! Enter the new-shop code.');
        setActivating(false);
        return;
      }

      const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      await base44.auth.updateMe({
        shop_create_credits: (me.shop_create_credits || 0) + 1,
        activation_code_shop: newCode,
      });
      try { await refreshUser?.(); } catch {}
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCode('');
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }, 1200);
    } catch {
      setError(bn ? 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'An error occurred. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  if (!user) return null;

  const waMessage = bn
    ? `নতুন দোকান তৈরির অ্যাক্টিভেশন কোড চাই।\nইমেইল: ${user.email || ''}`
    : `I need a new-shop activation code.\nEmail: ${user.email || ''}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setCode(''); setError(''); } onOpenChange(v); }}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-6 py-7 text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Store className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold mb-1">
            {bn ? 'নতুন দোকান তৈরি করতে এক্টিভেশন কোড প্রয়োজন' : 'New shop needs an activation code'}
          </h2>
          <p className="text-emerald-100 text-sm">
            {bn ? 'নতুন দোকান কোড দিয়ে দোকান তৈরি করুন' : 'Use the new-shop code to create a shop'}
          </p>
        </div>

        <div className="px-5 py-5 space-y-4">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="font-semibold text-green-700 text-center">
                {bn ? 'কোড সফল! নতুন দোকান তৈরি করুন।' : 'Code accepted! Create your new shop.'}
              </p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm text-gray-600 font-medium mb-2 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  {bn ? 'নতুন দোকান কোড লিখুন' : 'Enter new-shop code'}
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
                    className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 shrink-0"
                  >
                    {activating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (bn ? 'কনফার্ম' : 'Confirm')}
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
                  {bn ? 'কোড পেতে এডমিনের সাথে যোগাযোগ করুন' : 'Contact admin to get the code'}
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
