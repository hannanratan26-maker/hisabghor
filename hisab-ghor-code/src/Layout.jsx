import React, { memo, useEffect, useLayoutEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, BookOpen, Wallet, ArrowUpDown, Settings, ArrowLeft } from 'lucide-react';
import usePresence from './hooks/usePresence';
import { cn } from '@/lib/utils';
import { useLanguage } from './components/LanguageContext';

const ROOT_PAGES = ['Dashboard', 'Transactions', 'Settings'];
const HIDDEN_NAV_PAGES = ['PartyDetail', 'ProductList', 'AddProduct', 'ProductDetail', 'Khata', 'CashBox', 'Sale', 'SalesLedger'];
const HIDDEN_BACK_PAGES = ['PartyDetail', 'ProductList', 'AddProduct', 'ProductDetail', 'Khata', 'CashBox', 'Sale', 'SalesLedger'];

const NAV_ITEMS = [
  { page: 'Dashboard', labelKey: 'home', icon: LayoutDashboard },
  { page: 'Settings', labelKey: 'settings', icon: Settings },
];

const BottomNav = memo(({ t }) => {
  const location = useLocation();
  const currentPage = location.pathname.replace('/', '');

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 z-50 select-none" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map(item => {
          const isActive = currentPage === item.page || (currentPage === '' && item.page === 'Dashboard');
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex-1 flex flex-col items-center py-2.5 transition-colors",
                isActive ? "text-emerald-500" : "text-gray-400 dark:text-slate-500"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5]" : "stroke-[1.8]")} />
              <span className={cn("text-[10px] mt-0.5", isActive ? "font-semibold" : "font-medium")}>
                {t(item.labelKey)}
              </span>
              <div className="h-0.5 w-8 rounded-full mt-1" style={{ backgroundColor: isActive ? '#059669' : 'transparent' }} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

export default function Layout({ children, currentPageName }) {
  const showNav = !HIDDEN_NAV_PAGES.includes(currentPageName);
  const isSubPage = !ROOT_PAGES.includes(currentPageName);
  const showLayoutBack = isSubPage && !HIDDEN_BACK_PAGES.includes(currentPageName);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  usePresence();

  // পেজ বদলানোর আগেই (স্ক্রিন আঁকার আগে) স্ক্রল উপরে নিয়ে আসি,
  // যাতে নতুন পেজ আগের পেজের স্ক্রল পজিশনে একঝলক দেখা না যায়।
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    // Sub-pages: NO popstate interception — let natural history + navigate(-1) work
    if (isSubPage) return;

    // Root pages only restore a sentinel after a popup consumes its own guard.
    // Do not add one during normal page rendering: that creates a duplicate
    // Dashboard history entry and makes child pages require two back presses.
    const pushSentinel = () => {
      if (window.__popupOpen) return;
      const prev = window.history.state || {};
      if (prev.sentinel) return;
      if (prev.popupGuard) return;
      const routerState = { ...prev };
      delete routerState.popupGuard;
      const key = Math.random().toString(36).slice(2, 8);
      window.history.pushState(
        {
          ...routerState,
          sentinel: true,
          key,
          __TSR_key: key,
          __TSR_index: (typeof prev.__TSR_index === 'number' ? prev.__TSR_index : 0) + 1,
        },
        '',
        window.location.href,
      );
    };

    const handlePop = () => {
      if (window.__popupOpen) {
        window.__hisabGhorCloseTopPopup?.();
        queueMicrotask(pushSentinel);
        return;
      }
      // Re-push to block app exit
      pushSentinel();
    };

    window.addEventListener('popstate', handlePop);
    window.addEventListener('hisab-ghor:ensure-root-sentinel', pushSentinel);
    return () => {
      window.removeEventListener('popstate', handlePop);
      window.removeEventListener('hisab-ghor:ensure-root-sentinel', pushSentinel);
    };
  }, [location.pathname, isSubPage]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      {showLayoutBack && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 select-none" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="max-w-lg mx-auto flex items-center h-12 px-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 p-2 rounded-xl text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 active:opacity-70 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <main className={cn(
        "flex-1 w-full",
        currentPageName === 'Dashboard' ? "pb-28" : "max-w-lg mx-auto px-4",
        currentPageName === 'Dashboard' ? "" :
        showNav && !isSubPage ? "pb-28 pt-[calc(1.5rem+env(safe-area-inset-top))]" : 
        showLayoutBack ? "pb-6 pt-[calc(3.5rem+env(safe-area-inset-top))]" :
        isSubPage ? "pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]" :
        "pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]"
      )}>
        {children}
      </main>

      {showNav && (
        <BottomNav t={t} />
      )}
    </div>
  );
}