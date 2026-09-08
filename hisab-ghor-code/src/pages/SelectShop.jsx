import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Store, Pencil } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { setActiveShopId } from '@/lib/shop';
import { queryClientInstance as queryClient } from '@/lib/query-client';
import ShopCodePopup from '@/components/ShopCodePopup';

export default function SelectShop() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showNeedActivation, setShowNeedActivation] = React.useState(false);

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['shops', user?.id],
    queryFn: () => base44.entities.Shop.filter({ user_id: user.id }, '-created_date'),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    if (!isLoading && shops.length === 0 && user) {
      navigate('/CreateShop', { replace: true });
    }
  }, [isLoading, shops, user, navigate]);

  const addShop = () => {
    if (shops.length >= 1 && (user?.shop_create_credits || 0) <= 0) {
      setShowNeedActivation(true);
      return;
    }
    navigate('/CreateShop');
  };

  const choose = (shop) => {
    setActiveShopId(shop.id);
    queryClient.clear();
    navigate('/', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <div
        className="bg-brand-green px-4 flex items-start justify-between"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))', paddingBottom: '1.25rem' }}
      >
        <div>
          <p className="text-lg text-white/90">হাই {user?.full_name || user?.username || ''},</p>
          <h1 className="text-xl font-bold text-white mt-1">দোকান সিলেক্ট করুন</h1>
        </div>
        <button
          onClick={addShop}
          className="flex items-center gap-1 rounded-xl border border-white/70 px-3 py-2 text-sm font-semibold text-white active:opacity-70"
        >
          <Plus className="w-4 h-4" /> নতুন দোকান
        </button>
      </div>

      <div className="flex-1 max-w-lg w-full mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
            {shops.map((shop) => (
              <div key={shop.id} className="rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="p-3 flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-emerald-50 dark:bg-slate-700 flex items-center justify-center">
                    {shop.logo_url ? (
                      <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-8 h-8 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-base font-bold text-gray-800 dark:text-slate-100 text-center leading-tight">{shop.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
                    {[shop.area, shop.district].filter(Boolean).join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => choose(shop)}
                  className="w-full bg-brand-green py-2.5 text-sm font-bold text-white active:opacity-80"
                >
                  দোকান সিলেক্ট করুন
                </button>
                <button
                  onClick={() => navigate(`/CreateShop?id=${shop.id}`)}
                  className="w-full flex items-center justify-center gap-1 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                >
                  <Pencil className="w-3 h-3" /> দোকান এডিট করুন
                </button>
              </div>
            ))}
        </div>
      </div>

      <ShopCodePopup
        open={showNeedActivation}
        onOpenChange={setShowNeedActivation}
        onSuccess={() => navigate('/CreateShop')}
      />
    </div>
  );
}
