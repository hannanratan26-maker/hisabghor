CREATE TABLE public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  shop_type text,
  division text,
  district text,
  area text,
  address text,
  online_sale boolean NOT NULL DEFAULT false,
  logo_url text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops TO authenticated;
GRANT ALL ON public.shops TO service_role;

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own shops" ON public.shops FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER t_shops_upd BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

ALTER TABLE public.products ADD COLUMN shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE;
ALTER TABLE public.parties ADD COLUMN shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE;
ALTER TABLE public.cash_entries ADD COLUMN shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE;
ALTER TABLE public.sub_categories ADD COLUMN shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE;

CREATE INDEX idx_products_shop ON public.products(shop_id);
CREATE INDEX idx_parties_shop ON public.parties(shop_id);
CREATE INDEX idx_transactions_shop ON public.transactions(shop_id);
CREATE INDEX idx_cash_entries_shop ON public.cash_entries(shop_id);
CREATE INDEX idx_sub_categories_shop ON public.sub_categories(shop_id);
CREATE INDEX idx_shops_user ON public.shops(user_id);

-- Backfill: one default shop per user that already has data
WITH owners AS (
  SELECT DISTINCT user_id FROM (
    SELECT user_id FROM public.products
    UNION SELECT user_id FROM public.parties
    UNION SELECT user_id FROM public.transactions
    UNION SELECT user_id FROM public.cash_entries
    UNION SELECT user_id FROM public.sub_categories
  ) u WHERE user_id IS NOT NULL
), created AS (
  INSERT INTO public.shops (user_id, name)
  SELECT user_id, 'আমার দোকান' FROM owners
  RETURNING id, user_id
)
UPDATE public.products p SET shop_id = c.id FROM created c WHERE p.user_id = c.user_id AND p.shop_id IS NULL;

UPDATE public.parties t SET shop_id = s.id FROM public.shops s WHERE t.user_id = s.user_id AND t.shop_id IS NULL;
UPDATE public.transactions t SET shop_id = s.id FROM public.shops s WHERE t.user_id = s.user_id AND t.shop_id IS NULL;
UPDATE public.cash_entries t SET shop_id = s.id FROM public.shops s WHERE t.user_id = s.user_id AND t.shop_id IS NULL;
UPDATE public.sub_categories t SET shop_id = s.id FROM public.shops s WHERE t.user_id = s.user_id AND t.shop_id IS NULL;