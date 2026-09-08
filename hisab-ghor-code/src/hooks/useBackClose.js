import { useLayoutEffect, useRef } from 'react';

const POPUP_OPEN_COUNT_KEY = '__hisabGhorPopupOpenCount';
const POPUP_CLOSE_STACK_KEY = '__hisabGhorPopupCloseStack';

function setPopupOpenFlag(delta) {
  if (typeof window === 'undefined') return;
  const current = Number(window[POPUP_OPEN_COUNT_KEY] || 0);
  const next = Math.max(0, current + delta);
  window[POPUP_OPEN_COUNT_KEY] = next;
  window.__popupOpen = next > 0;
}

function getPopupCloseStack() {
  if (typeof window === 'undefined') return [];
  if (!Array.isArray(window[POPUP_CLOSE_STACK_KEY])) {
    window[POPUP_CLOSE_STACK_KEY] = [];
  }
  return window[POPUP_CLOSE_STACK_KEY];
}

function refreshCloseTopPopup() {
  if (typeof window === 'undefined') return;
  const stack = getPopupCloseStack();
  window.__hisabGhorCloseTopPopup = () => {
    const currentStack = getPopupCloseStack();
    const closeTop = currentStack[currentStack.length - 1];
    if (!closeTop) return false;
    closeTop();
    return true;
  };
  if (stack.length === 0) {
    delete window.__hisabGhorCloseTopPopup;
  }
}

function registerPopupClose(closePopup) {
  const stack = getPopupCloseStack();
  stack.push(closePopup);
  refreshCloseTopPopup();
  return () => {
    const currentStack = getPopupCloseStack();
    const index = currentStack.lastIndexOf(closePopup);
    if (index >= 0) currentStack.splice(index, 1);
    refreshCloseTopPopup();
  };
}

/**
 * Makes a popup/dialog closable with the mobile back button:
 * - pushes one history entry while the popup is open
 * - a back press pops that entry and closes the popup (never exits the app)
 * - closing by other means removes the extra entry again
 */
export default function useBackClose(open, onClose, options = {}) {
  const closedByPop = useRef(false);
  const pushedEntry = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    if (!open || typeof window === 'undefined') return;

    closedByPop.current = false;
    pushedEntry.current = false;
    setPopupOpenFlag(1);

    // Keep one app-owned root entry behind first-load home popups. Some mobile
    // browsers can close the standalone app when a dialog guard is the only
    // in-app history entry.
    const prev = window.history.state || {};
    if (options.ensureRootSentinel && !prev.sentinel && !prev.popupGuard) {
      const sentinelState = { ...prev };
      const sentinelKey = Math.random().toString(36).slice(2, 8);
      window.history.pushState(
        {
          ...sentinelState,
          sentinel: true,
          key: sentinelKey,
          __TSR_key: sentinelKey,
          __TSR_index: (typeof prev.__TSR_index === 'number' ? prev.__TSR_index : 0) + 1,
        },
        '',
        window.location.href,
      );
    }

    // A stacked flow (cart -> payment -> due) must share one history guard.
    // Adding one guard per layer leaves stale same-page entries behind and
    // makes the user press Back more than once after the flow is closed.
    const pushGuardEntry = () => {
      const current = window.history.state || {};
      if (current.popupGuard) return false;
      const routerState = { ...current };
      delete routerState.sentinel;
      delete routerState.popupGuard;
      const key = Math.random().toString(36).slice(2, 8);
      window.history.pushState(
        {
          ...routerState,
          popupGuard: true,
          key,
          __TSR_key: key,
          __TSR_index: (typeof current.__TSR_index === 'number' ? current.__TSR_index : 0) + 1,
        },
        '',
        window.location.href,
      );
      return true;
    };

    if (pushGuardEntry()) {
      pushedEntry.current = true;
    }

    const closeFromBack = (fromWatcher = false) => {
      if (closedByPop.current) return;
      closedByPop.current = true;
      setPopupOpenFlag(-1);
      // A close callback may tear down several stacked layers at once
      // (payment + cart). Those sibling layers unmount without knowing the
      // back press already consumed the shared guard entry, so mark it
      // globally and let their cleanup skip the extra history.back().
      window.__hisabGhorGuardConsumedAt = Date.now();
      onCloseRef.current?.(false);
      // CloseWatcher intercepts the back gesture without popping history, so
      // remove our own guard entry manually — otherwise the user needs a second
      // back press to actually leave the page.
      if (fromWatcher && window.history.state?.popupGuard) {
        window.history.back();
      }
      queueMicrotask(() => {
        window.dispatchEvent(new Event('hisab-ghor:ensure-root-sentinel'));
      });
    };



    const unregisterPopupClose = registerPopupClose(closeFromBack);
    let closeWatcher;
    // Closing only the top layer must leave the layers below still guarded,
    // so each Back press peels exactly one layer (due -> payment -> page).
    // When a close callback tears down several layers at once, nothing is
    // left registered and no new guard is pushed.
    const closeTopAndRestoreGuard = (fromWatcher = false) => {
      closeFromBack(fromWatcher);
      setTimeout(() => {
        if (getPopupCloseStack().length > 0) pushGuardEntry();
      }, 0);
    };


    const handleCloseRequest = (event) => {
      event?.preventDefault?.();
      closeTopAndRestoreGuard(true);
    };


    // Chrome/Android can skip programmatic history entries that were added
    // before a fresh page receives user activation. CloseWatcher catches the
    // hardware back close request directly, so the first automatic popup also
    // closes instead of the tab/app leaving.
    if (typeof window.CloseWatcher === 'function') {
      try {
        closeWatcher = new window.CloseWatcher();
        closeWatcher.addEventListener('cancel', handleCloseRequest);
        closeWatcher.addEventListener('close', handleCloseRequest);
      } catch {
        closeWatcher = undefined;
      }
    }

    const handlePop = () => {
      // Ignore the popstate produced by another popup's own cleanup back():
      // otherwise a popup that opens as its predecessor closes (e.g. receipt
      // after payment) is torn down immediately.
      if (Number(window.__hisabGhorGuardPopSuppress || 0) > 0) {
        window.__hisabGhorGuardPopSuppress = Number(window.__hisabGhorGuardPopSuppress) - 1;
        return;
      }
      const stack = getPopupCloseStack();
      const isTop = stack[stack.length - 1] === closeFromBack;
      if (isTop) {
        // This popup consumed the popped guard entry.
        closeTopAndRestoreGuard();
        return;
      }
      // Only the top layer handles this back event. Its close callback may
      // intentionally close the complete checkout stack in one React update.
    };



    window.addEventListener('popstate', handlePop, { capture: true });
    return () => {
      window.removeEventListener('popstate', handlePop, { capture: true });
      if (closeWatcher) {
        closeWatcher.removeEventListener('cancel', handleCloseRequest);
        closeWatcher.removeEventListener('close', handleCloseRequest);
        closeWatcher.destroy?.();
      }
      unregisterPopupClose();
      if (!closedByPop.current) setPopupOpenFlag(-1);
      const guardJustConsumed =
        Date.now() - Number(window.__hisabGhorGuardConsumedAt || 0) < 400;
      if (
        !closedByPop.current &&
        !guardJustConsumed &&
        pushedEntry.current &&
        window.history.state?.popupGuard
      ) {
        window.__hisabGhorGuardConsumedAt = Date.now();
        window.__hisabGhorGuardPopSuppress = Number(window.__hisabGhorGuardPopSuppress || 0) + 1;
        window.history.back();
        setTimeout(() => {
          window.__hisabGhorGuardPopSuppress = Math.max(
            0,
            Number(window.__hisabGhorGuardPopSuppress || 0) - 1,
          );
        }, 500);
      }
    };
  }, [open, options.ensureRootSentinel]);
}
