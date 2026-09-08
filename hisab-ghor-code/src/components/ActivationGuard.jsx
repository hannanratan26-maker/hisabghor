import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, useLocation } from 'react-router-dom';
import ActivationExpiredPopup from './ActivationExpiredPopup';
import TrialExpiredPopup from './TrialExpiredPopup';
import { useAuth } from '@/lib/AuthContext';
import { endOfLocalDayAfterIso, isLocalDayExpired } from '@/lib/accountDates';

// The original app ran this guard once around the whole router, so page
// navigation never re-checked. Mirror that: after the first successful
// check, later pages render instantly and only re-verify silently.
let guardCheckedOnce = false;
const trialExpiredPopupShownForUsers = new Set();
const HOME_PAGE_NAMES = new Set(['Dashboard']);
const HOME_PATHS = new Set(['/', '/Dashboard', '/index']);
const GUARD_CHECKED_KEY = 'hisab-ghor:activation-guard-checked';
const TRIAL_POPUP_STORAGE_PREFIX = 'trial-expired-popup-shown:';

function hasGuardChecked() {
  if (guardCheckedOnce) return true;
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(GUARD_CHECKED_KEY) === 'true';
  } catch {
    return false;
  }
}

function markGuardChecked() {
  guardCheckedOnce = true;
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(GUARD_CHECKED_KEY, 'true');
  } catch {}
}

function getTrialPopupUserKey(user) {
  return user?.id || user?.email || 'current-user';
}

function hasShownTrialPopup(userKey) {
  if (trialExpiredPopupShownForUsers.has(userKey)) return true;
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(`${TRIAL_POPUP_STORAGE_PREFIX}${userKey}`) === 'true';
  } catch {
    return false;
  }
}

function markTrialPopupShown(userKey) {
  trialExpiredPopupShownForUsers.add(userKey);
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`${TRIAL_POPUP_STORAGE_PREFIX}${userKey}`, 'true');
  } catch {}
}

export default function ActivationGuard({ children, pageName }) {
  const [checking, setChecking] = useState(!hasGuardChecked());
  const [showActivationExpired, setShowActivationExpired] = useState(false);
  const [showTrialExpired, setShowTrialExpired] = useState(false);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = HOME_PAGE_NAMES.has(pageName) || HOME_PATHS.has(location.pathname);

  useEffect(() => {
    if (hasGuardChecked()) {
      // Silent background re-check — no spinner, only act on hard failures.
      checkUserStatus({ silent: true });
      return;
    }
    checkUserStatus();
  }, []);

  const checkUserStatus = async ({ silent = false } = {}) => {
    try {
      const user = await base44.auth.me();
      // Keep the app-wide auth context in sync so Settings/status never show stale data.
      refreshUser?.();
      
      // Skip checks for special pages
      if (location.pathname === '/Activation') {
        markGuardChecked();
        if (!silent) setChecking(false);
        return;
      }

      // Check if admin deactivated
      if (user.account_status === 'deactivated') {
        markGuardChecked();
        setShowActivationExpired(true);
        if (!silent) setChecking(false);
        return;
      }

      // Check if activation has expired
      if (user.is_activated && user.activation_end_date) {
        if (isLocalDayExpired(user.activation_end_date)) {
          await base44.auth.updateMe({ is_activated: false });
          markGuardChecked();
          setShowActivationExpired(true);
          if (!silent) setChecking(false);
          return;
        }
      }

      // Check if free mode is enabled — auto-activate user
      if (!user.is_activated) {
        try {
          const settings = await base44.entities.AppSettings.filter({ key: 'free_mode' });
          const freeModeEnabled = settings.length > 0 && (settings[0].value === 'true' || settings[0].value === true);
          if (freeModeEnabled) {
            await base44.auth.updateMe({
              is_activated: true,
              account_status: 'activated',
              activation_end_date: endOfLocalDayAfterIso(36500),
              package_type: 'lifetime',
            });
            markGuardChecked();
            if (!silent) setChecking(false);
            return;
          }
        } catch (err) {}
      }

      // Trial expired -> show the activation popup only once when entering the app on the home page.
      if (!user.is_activated && user.account_status !== 'activated' && user.trial_end_date) {
        if (isLocalDayExpired(user.trial_end_date)) {
          const userKey = getTrialPopupUserKey(user);
          markGuardChecked();
          if (!silent && isHomePage && !hasShownTrialPopup(userKey)) {
            markTrialPopupShown(userKey);
            setShowTrialExpired(true);
          } else {
            setShowTrialExpired(false);
          }
          if (!silent) setChecking(false);
          return;
        }
        setShowTrialExpired(false);
      }

      // If user has no trial_end_date set yet, set it (first login after profile completion)
      if (!user.trial_end_date && user.account_status !== 'activated' && !user.is_activated) {
        try {
          const settings = await base44.entities.AppSettings.filter({ key: 'default_trial_days' });
          const defaultDays = settings.length > 0 ? parseInt(settings[0].value) : 7;
          await base44.auth.updateMe({
            trial_end_date: endOfLocalDayAfterIso(defaultDays),
            account_status: 'trial',
          });
        } catch (err) {
          await base44.auth.updateMe({
            trial_end_date: endOfLocalDayAfterIso(7),
            account_status: 'trial',
          });
        }
      }

    } catch (err) {
      console.error('Error checking user status:', err);
    } finally {
      markGuardChecked();
      if (!silent) setChecking(false);
    }
  };

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {children}
      <ActivationExpiredPopup 
        open={showActivationExpired} 
        onOpenChange={setShowActivationExpired}
        onActivated={() => checkUserStatus()}
        ensureRootBackGuard={isHomePage}
      />
      <TrialExpiredPopup
        open={showTrialExpired}
        onOpenChange={setShowTrialExpired}
        onActivated={() => checkUserStatus()}
        ensureRootBackGuard={isHomePage}
      />
    </>
  );
}