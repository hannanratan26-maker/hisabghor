import React, { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import Layout from "@/Layout";
import ActivationGuard from "@/components/ActivationGuard";
import { useAuth } from "@/lib/AuthContext";
import { getActiveShopId } from "@/lib/shop";

// Pages that must stay reachable before a shop is selected.
const SHOPLESS_PAGES = new Set(["CreateShop", "SelectShop", "Activation"]);

function Spinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
    </div>
  );
}

function AuthedPage({
  name,
  withLayout,
  withGuard,
  children,
}: {
  name: string;
  withLayout: boolean;
  withGuard: boolean;
  children: ReactNode;
}) {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.history.replace("/auth");
      return;
    }
    if (!isLoadingAuth && isAuthenticated && !SHOPLESS_PAGES.has(name) && !getActiveShopId()) {
      router.history.replace("/SelectShop");
    }
  }, [isLoadingAuth, isAuthenticated, router, name]);

  // After the first authenticated render, silently preload every main page's
  // code in the background so page-to-page navigation is instant.
  useEffect(() => {
    if (!isAuthenticated || pagesPreloaded) return;
    pagesPreloaded = true;
    const routes = [
      "/Dashboard",
      "/Khata",
      "/CashBox",
      "/Transactions",
      "/Reports",
      "/Settings",
      "/SelectShop",
      "/Sale",
      "/SalesLedger",
      "/ProductList",
      "/AddProduct",
    ];
    const idle =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => void })
        .requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500));
    idle(() => {
      for (const to of routes) {
        router.preloadRoute({ to }).catch(() => {});
      }
    });
  }, [isAuthenticated, router]);

  if (isLoadingAuth || !isAuthenticated) return <Spinner />;
  if (!SHOPLESS_PAGES.has(name) && !getActiveShopId()) return <Spinner />;

  const inner = withLayout ? <Layout currentPageName={name}>{children}</Layout> : <>{children}</>;
  return withGuard ? <ActivationGuard pageName={name}>{inner}</ActivationGuard> : inner;
}

// Once the app shell has mounted once in this session, later page
// navigations skip the spinner entirely (like the original SPA).
let appShellMounted = false;
let pagesPreloaded = false;
const APP_SHELL_MOUNTED_KEY = "hisab-ghor:app-shell-mounted";

function hasAppShellMounted() {
  if (appShellMounted) return true;
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(APP_SHELL_MOUNTED_KEY) === "true";
  } catch {
    return false;
  }
}

function markAppShellMounted() {
  appShellMounted = true;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(APP_SHELL_MOUNTED_KEY, "true");
  } catch {}
}

export default function AppPage({
  name,
  withLayout = true,
  withGuard = true,
  skipAuth = false,
  children,
}: {
  name: string;
  withLayout?: boolean;
  withGuard?: boolean;
  /** Pages that manage their own access control (e.g. Admin) — no app-auth redirect. */
  skipAuth?: boolean;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(hasAppShellMounted);
  useEffect(() => {
    markAppShellMounted();
    setMounted(true);
  }, []);
  if (!mounted) return <Spinner />;

  if (skipAuth) {
    return withLayout ? <Layout currentPageName={name}>{children}</Layout> : <>{children}</>;
  }

  return (
    <AuthedPage name={name} withLayout={withLayout} withGuard={withGuard}>
      {children}
    </AuthedPage>
  );
}
