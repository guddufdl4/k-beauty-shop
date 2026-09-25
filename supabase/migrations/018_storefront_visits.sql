-- Anonymous storefront visit log. Admin sessions are never inserted by the app.

CREATE TABLE IF NOT EXISTS public.storefront_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at timestamptz NOT NULL DEFAULT now(),
  path text NOT NULL,
  locale text,
  visitor_key text NOT NULL
);

CREATE INDEX IF NOT EXISTS storefront_visits_visited_at_idx
  ON public.storefront_visits (visited_at DESC);

CREATE INDEX IF NOT EXISTS storefront_visits_visitor_day_idx
  ON public.storefront_visits (visitor_key, visited_at DESC);

ALTER TABLE public.storefront_visits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.storefront_visits FROM PUBLIC;
REVOKE ALL ON public.storefront_visits FROM anon;
REVOKE ALL ON public.storefront_visits FROM authenticated;
GRANT ALL ON public.storefront_visits TO service_role;

COMMENT ON TABLE public.storefront_visits IS
  'Storefront page views excluding admin accounts. Used for today unique visitors.';
