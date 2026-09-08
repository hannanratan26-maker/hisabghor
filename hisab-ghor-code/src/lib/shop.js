// Active shop selection. Every business record (products, parties,
// transactions, cash entries, sub categories) is scoped to one shop.
const ACTIVE_SHOP_KEY = 'hisab-ghor:active-shop';
export const SHOP_CHANGED_EVENT = 'hisab-ghor:shop-changed';

export function getActiveShopId() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ACTIVE_SHOP_KEY) || null;
  } catch {
    return null;
  }
}

export function setActiveShopId(shopId) {
  if (typeof window === 'undefined') return;
  try {
    if (shopId) window.localStorage.setItem(ACTIVE_SHOP_KEY, shopId);
    else window.localStorage.removeItem(ACTIVE_SHOP_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent(SHOP_CHANGED_EVENT, { detail: shopId }));
}

export function clearActiveShop() {
  setActiveShopId(null);
}
