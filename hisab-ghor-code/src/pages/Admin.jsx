import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { requestEmailConfirmation, useEmailConfirmed } from '@/lib/emailVerify';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ADMIN_EMAIL = 'hannanratan27@gmail.com';

export default function Admin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetStep, setResetStep] = useState('request'); // 'request' | 'verify' | 'reset'
  const [resetOtp, setResetOtp] = useState('');
  const [confirmSentAt, setConfirmSentAt] = useState(0);
  const emailConfirmed = useEmailConfirmed(true, confirmSentAt);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  // Check if already logged in
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession) {
      const session = JSON.parse(adminSession);
      if (session.expiry > Date.now()) {
        navigate('/AdminDashboard');
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Authenticate against the real backend so dashboard queries work with a session.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        toast.error('ভুল ইমেইল বা পাসওয়ার্ড!');
        return;
      }

      // Check if user exists and is admin
      const users = await base44.entities.User.filter({ email: email });
      if (users.length === 0 || users[0].role !== 'admin') {
        await supabase.auth.signOut();
        toast.error('এই ইমেইল দিয়ে কোনো এডমিন একাউন্ট পাওয়া যায়নি!');
        return;
      }

      // Create session
      const session = {
        email: email,
        expiry: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      };
      localStorage.setItem('adminSession', JSON.stringify(session));
      toast.success('সফলভাবে লগইন হয়েছে!');
      navigate('/AdminDashboard');
    } catch (error) {
      toast.error('লগইন ব্যর্থ হয়েছে!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!resetEmail) {
      toast.error('ইমেইল অ্যাড্রেস লিখুন!');
      return;
    }

    setIsLoading(true);
    try {
      // Check if user exists and is admin
      const users = await base44.entities.User.filter({ email: resetEmail });
      if (users.length === 0 || users[0].role !== 'admin') {
        toast.error('এই ইমেইল দিয়ে কোনো এডমিন একাউন্ট পাওয়া যায়নি!');
        setIsLoading(false);
        return;
      }

      const at = await requestEmailConfirmation(resetEmail);
      setConfirmSentAt(at);
      toast.success('কনফার্মেশন লিংক আপনার ইমেইলে পাঠানো হয়েছে!');
      setResetStep('verify');
    } catch (error) {
      toast.error('কনফার্মেশন লিংক পাঠাতে ব্যর্থ হয়েছে!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    if (!emailConfirmed) {
      toast.error('আগে ইমেইলের লিংক এ ক্লিক করে কনফার্ম করুন!');
      return;
    }
    setResetStep('reset');
    toast.success('ইমেইল ভেরিফিকেশন সম্পূর্ণ হয়েছে! নতুন পাসওয়ার্ড সেট করুন।');
  };

  const handleResetPassword = () => {
    if (newPassword.length < 6) {
      toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('পাসওয়ার্ড মিলছে না!');
      return;
    }

    // Save password with email as key
    localStorage.setItem(`adminPassword_${resetEmail}`, newPassword);
    toast.success('পাসওয়ার্ড সফলভাবে রিসেট হয়েছে!');
    setShowResetDialog(false);
    setResetStep('request');
    setResetOtp('');
    setResetEmail('');
    setNewPassword('');
    setConfirmPassword('');
    setGeneratedOtp('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-2xl mx-auto flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">এডমিন প্যানেল</h1>
          <p className="text-indigo-100">সিকিউর লগইন সিস্টেম</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                ইমেইল অ্যাড্রেস
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">শুধুমাত্র অনুমোদিত ইমেইল</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                পাসওয়ার্ড
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-12 rounded-xl border-gray-200 pr-12 bg-white text-gray-900 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-base font-semibold shadow-lg"
            >
              {isLoading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setShowResetDialog(true)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              পাসওয়ার্ড ভুলে গেছেন?
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Shield className="w-3 h-3" />
              <span>সিকিউর অ্যাক্সেস - শুধুমাত্র অনুমোদিত ইউজার</span>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">পাসওয়ার্ড রিসেট</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {resetStep === 'request' && (
              <>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">ইমেইল অ্যাড্রেস</Label>
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="h-12 rounded-xl"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    আপনার ইমেইলে একটি কনফার্মেশন লিংক পাঠানো হবে
                  </p>
                </div>
                <Button
                  onClick={handleRequestOtp}
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                >
                  {isLoading ? 'লিংক পাঠানো হচ্ছে...' : 'কনফার্মেশন লিংক পাঠান'}
                </Button>
              </>
            )}

            {resetStep === 'verify' && (
              <>
                {emailConfirmed ? (
                  <p className="text-sm font-semibold text-green-700 text-center">
                    ইমেইল ভেরিফিকেশন সম্পূর্ণ হয়েছে
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 text-center">
                    একটি কনফার্মেশন লিংক পাঠানো হয়েছে। লিংক এ ক্লিক করে কনফার্ম করুন
                  </p>
                )}
                <Button
                  onClick={handleVerifyOtp}
                  disabled={!emailConfirmed}
                  className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                >
                  পরবর্তী ধাপ
                </Button>
                <Button
                  onClick={() => setResetStep('request')}
                  variant="ghost"
                  className="w-full"
                >
                  নতুন লিংক পাঠান
                </Button>
              </>
            )}

            {resetStep === 'reset' && (
              <>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">নতুন পাসওয়ার্ড</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষর"
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">পাসওয়ার্ড নিশ্চিত করুন</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড আবার লিখুন"
                    className="h-12 rounded-xl"
                  />
                </div>
                <Button
                  onClick={handleResetPassword}
                  className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                >
                  পাসওয়ার্ড রিসেট করুন
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}