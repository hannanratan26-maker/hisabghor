/**
 * Small compatibility layer so the ported pages can keep using the
 * `Link` / `useNavigate` / `useLocation` API on top of TanStack Router.
 * Aliased as "react-router-dom" in vite.config.ts.
 */
import React from "react";
import {
  useRouter,
  useLocation as useTanstackLocation,
  Outlet,
} from "@tanstack/react-router";

export function useNavigate() {
  const router = useRouter();
  return React.useCallback(
    (to: string | number, options?: { replace?: boolean }) => {
      if (typeof to === "number") {
        router.history.go(to);
        return;
      }
      if (options?.replace) router.history.replace(to);
      else router.history.push(to);
    },
    [router],
  );
}

export function useLocation() {
  const location = useTanstackLocation();
  return {
    pathname: location.pathname,
    search: location.searchStr ?? "",
    hash: location.hash ?? "",
    state: location.state,
    key: location.href,
  };
}

export function useSearchParams() {
  const location = useTanstackLocation();
  const router = useRouter();
  const params = React.useMemo(
    () => new URLSearchParams(location.searchStr ?? ""),
    [location.searchStr],
  );

  const setSearchParams = React.useCallback(
    (
      next:
        | URLSearchParams
        | Record<string, string>
        | ((current: URLSearchParams) => URLSearchParams),
      options?: { replace?: boolean },
    ) => {
      const value =
        typeof next === "function"
          ? next(new URLSearchParams(location.searchStr ?? ""))
          : new URLSearchParams(next);
      const query = value.toString();
      const href = `${location.pathname}${query ? `?${query}` : ""}${location.hash ?? ""}`;

      if (options?.replace) router.history.replace(href);
      else router.history.push(href);
    },
    [location.hash, location.pathname, location.searchStr, router],
  );

  return [params, setSearchParams] as const;
}

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string;
  replace?: boolean;
};

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, replace, onClick, children, ...rest }, ref) => {
    const router = useRouter();
    return (
      <a
        ref={ref}
        href={to}
        onClick={(event) => {
          onClick?.(event);
          if (
            event.defaultPrevented ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.button !== 0
          )
            return;
          event.preventDefault();
          if (replace) router.history.replace(to);
          else router.history.push(to);
        }}
        {...rest}
      >
        {children}
      </a>
    );
  },
);
Link.displayName = "Link";

export const NavLink = Link;
export { Outlet };
