import { useAuth } from '@/lib/AuthContext';
import { localCalendarDaysLeft } from '@/lib/accountDates';

export function useAccountStatus() {
  const { user } = useAuth();

  if (!user) {
    return { canAct: true, isActivated: false, isActivationExpired: false, isTrial: false, isTrialExpired: false, trialDaysLeft: 0 };
  }


  // Deactivated by admin
  const isAdminDeactivated = user.account_status === 'deactivated';
  if (isAdminDeactivated) {
    return { canAct: false, isActivated: false, isActivationExpired: false, isTrial: false, isTrialExpired: false, trialDaysLeft: 0, isAdminDeactivated: true };
  }

  const rawActivated = user.account_status === 'activated' || user.is_activated === true;
  const activationDaysLeft = localCalendarDaysLeft(user.activation_end_date);

  // Activation expires after the stored local calendar day has fully passed.
  const isActivationExpired = rawActivated && activationDaysLeft !== null && activationDaysLeft < 0;
  const isActivated = rawActivated && !isActivationExpired;

  const trialDays = localCalendarDaysLeft(user.trial_end_date);
  const isTrialExpired = !rawActivated && trialDays !== null && trialDays < 0;
  const isTrial = !rawActivated && trialDays !== null && trialDays >= 0;
  const trialDaysLeft = isTrial ? trialDays : 0;

  // Cannot act if trial expired OR activation expired
  const canAct = !isTrialExpired && !isActivationExpired;

  return { canAct, isActivated, isActivationExpired, isTrial, isTrialExpired, trialDaysLeft, isAdminDeactivated: false };
}