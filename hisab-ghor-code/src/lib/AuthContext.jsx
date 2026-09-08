import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { base44 } from "@/api/base44Client";
import { clearActiveShop } from "@/lib/shop";

const AuthContext = createContext(null);
const AUTH_USER_CACHE_KEY = "hisab-ghor:auth-user";

function readCachedUser() {
  if (typeof window === "undefined") return null;
  try {
    const cached = window.sessionStorage.getItem(AUTH_USER_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user) {
  if (typeof window === "undefined") return;
  try {
    if (user) window.sessionStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(user));
    else window.sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
  } catch {}
}

function AuthProvider({ children }) {
  const [cachedUser] = useState(readCachedUser);
  const [user, setUser] = useState(cachedUser);
  const [session, setSession] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(cachedUser));
  const [isLoadingAuth, setIsLoadingAuth] = useState(!cachedUser);
  const userRef = useRef(cachedUser);
  const authenticatedRef = useRef(Boolean(cachedUser));

  const updateUser = useCallback((nextUser) => {
    userRef.current = nextUser;
    setUser(nextUser);
    writeCachedUser(nextUser);
  }, []);

  const updateAuthenticated = useCallback((nextValue) => {
    authenticatedRef.current = nextValue;
    setIsAuthenticated(nextValue);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await base44.auth.me();
      updateUser(currentUser);
      updateAuthenticated(true);
      return currentUser;
    } catch {
      updateUser(null);
      updateAuthenticated(false);
      return null;
    }
  }, [updateAuthenticated, updateUser]);

  useEffect(() => {
    let active = true;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      if (!newSession) {
        updateUser(null);
        updateAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      // On app resume Supabase can emit a refreshed session. Keep the current
      // screen visible while the profile is refreshed so minimizing/restoring
      // the app does not show a full-screen loader.
      const alreadyRenderedAuthedUser = Boolean(userRef.current) && authenticatedRef.current;
      if (!alreadyRenderedAuthedUser) setIsLoadingAuth(true);
      setTimeout(() => {
        refreshUser().finally(() => {
          if (active) setIsLoadingAuth(false);
        });
      }, 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (!data.session) {
        updateUser(null);
        updateAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      if (!userRef.current) setIsLoadingAuth(true);
      refreshUser().finally(() => {
        if (active) setIsLoadingAuth(false);
      });
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshUser, updateAuthenticated, updateUser]);

  const logout = async () => {
    updateUser(null);
    updateAuthenticated(false);
    clearActiveShop();
    await base44.auth.logout();
  };

  const navigateToLogin = () => base44.auth.redirectToLogin();

  const value = {
    user,
    session,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError: null,
    appPublicSettings: null,
    logout,
    navigateToLogin,
    refreshUser,
    checkAppState: refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { AuthProvider, useAuth };
