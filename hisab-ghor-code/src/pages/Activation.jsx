import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, MessageCircle, CheckCircle2, AlertCircle, Globe, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { endOfLocalDayAfterIso } from '@/lib/accountDates';
import { useLanguage } from '../components/LanguageContext';

export default function Activation() {
  const [activationCode, setActivationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [availableCodes, setAvailableCodes] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);
  const navigate = useNavigate();
  const { t, language, changeLanguage } = useLanguage();

  useEffect(() => {
    checkActivation();
    loadAvailableCodes();
  }, []);

  const checkActivation = async () => {
    try {
      const user = await base44.auth.me();
      if (user.is_activated) {
        navigate(createPageUrl('Dashboard'));
      }
    } catch (err) {
      console.error('Error checking activation:', err);
    } finally {
      setChecking(false);
    }
  };

  const loadAvailableCodes = async () => {
    try {
      const user = await base44.auth.me();
      const codes = [];
      if (user.activation_code_3m) codes.push({ code: user.activation_code_3m, label: language === 'bn' ? '৩ মাস' : '3 Months', type: '3months' });
      if (user.activation_code_6m) codes.push({ code: user.activation_code_6m, label: language === 'bn' ? '৬ মাস' : '6 Months', type: '6months' });
      if (user.activation_code_1y) codes.push({ code: user.activation_code_1y, label: language === 'bn' ? '১ বছর' : '1 Year', type: '1year' });
      if (user.activation_code_lifetime) codes.push({ code: user.activation_code_lifetime, label: language === 'bn' ? 'লাইফটাইম' : 'Lifetime', type: 'lifetime' });
      setAvailableCodes(codes);
    } catch (err) {
      console.error('Error fetching codes:', err);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleActivate = async () => {
    if (!activationCode.trim()) {
      setError(t('enterActivationCodeError'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await base44.auth.me();
      const code = activationCode.trim().toUpperCase();

      const codeMap = {
        [user.activation_code_3m]: { duration: 90, type: '3months' },
        [user.activation_code_6m]: { duration: 180, type: '6months' },
        [user.activation_code_1y]: { duration: 365, type: '1year' },
        [user.activation_code_lifetime]: { duration: 36500, type: 'lifetime' }
      };

      if (codeMap[code]) {
        const { duration, type } = codeMap[code];
        const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const updateData = {
          is_activated: true,
          account_status: 'activated',
          activation_end_date: endOfLocalDayAfterIso(duration),
          package_type: type
        };

        if (type === '3months') updateData.activation_code_3m = newCode;
        else if (type === '6months') updateData.activation_code_6m = newCode;
        else if (type === '1year') updateData.activation_code_1y = newCode;
        else if (type === 'lifetime') updateData.activation_code_lifetime = newCode;

        await base44.auth.updateMe(updateData);
        navigate(createPageUrl('Dashboard'));
      } else {
        setError(t('invalidActivationCode'));
      }
    } catch (err) {
      console.error('Activation error:', err);
      setError(t('activationError'));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white px-8 py-10 text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{t('accountActivation')}</h1>
            <p className="text-emerald-100 text-sm">{t('activationRequired')}</p>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-semibold mb-1">{t('getActivationCode')}</p>
                  <p>{t('contactAdminWhatsApp')}</p>
                </div>
              </div>
            </div>

            <a
              href="https://wa.me/8801893017273"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 px-4 font-semibold mb-6 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              {t('contactAdmin')}
            </a>

            {/* Available Codes */}
            {availableCodes.length > 0 && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-4 mb-6">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-3 uppercase">
                  {language === 'bn' ? 'উপলব্ধ অ্যাক্টিভেশন কোড' : 'Available Codes'}
                </p>
                <div className="space-y-2">
                  {availableCodes.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">{item.label}</p>
                        <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">{item.code}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(item.code)}
                        className="ml-2 p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-colors shrink-0"
                        title={language === 'bn' ? 'কপি করুন' : 'Copy'}
                      >
                        {copiedCode === item.code ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-sm text-gray-600 dark:text-slate-300 mb-2 block">{t('enterActivationCode')}</Label>
                <Input
                  placeholder={t('activationCodePlaceholder')}
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  className="h-12 rounded-xl text-center text-lg font-mono"
                  onKeyPress={(e) => e.key === 'Enter' && handleActivate()}
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl p-3 flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                onClick={handleActivate}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-base font-semibold"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {t('verifying')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {t('activate')}
                  </>
                )}
              </Button>
            </div>

            {/* Language Selector */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
              <div>
                <div className="text-xs font-semibold text-gray-600 dark:text-slate-300 mb-2 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {t('changeLanguage')}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => changeLanguage('bn')}
                    className={`py-2 px-3 rounded-lg border-2 font-semibold text-sm transition-all ${
                      language === 'bn'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                        : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-gray-300'
                    }`}
                  >
                    বাংলা
                  </button>
                  <button
                    onClick={() => changeLanguage('en')}
                    className={`py-2 px-3 rounded-lg border-2 font-semibold text-sm transition-all ${
                      language === 'en'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                        : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-gray-300'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6 text-sm text-gray-600 dark:text-slate-400">
          <p>{t('activationNote')}</p>
        </div>
      </div>
    </div>
  );
}