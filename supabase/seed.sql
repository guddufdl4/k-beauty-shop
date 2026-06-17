-- K-Beauty Shop — Phase 3 seed data
-- Run AFTER schema.sql and migrations/001_rls_and_profiles.sql

-- =============================================================================
-- Admin write policies (product & category management)
-- =============================================================================

DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
CREATE POLICY "categories_admin_write" ON public.categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "products_admin_read" ON public.products;
CREATE POLICY "products_admin_read" ON public.products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "products_admin_write" ON public.products;
CREATE POLICY "products_admin_write" ON public.products
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "products_admin_update" ON public.products;
CREATE POLICY "products_admin_update" ON public.products
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "products_admin_delete" ON public.products;
CREATE POLICY "products_admin_delete" ON public.products
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "product_images_admin_write" ON public.product_images;
CREATE POLICY "product_images_admin_write" ON public.product_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- =============================================================================
-- Categories (fictional K-Beauty export catalog)
-- =============================================================================

INSERT INTO public.categories (id, name, slug, description, sort_order, is_active)
VALUES
  (
    'a1000001-0001-4000-8000-000000000001',
    '스킨케어',
    'skincare',
    '에센스, 세럼, 토너 등 기초 스킨케어',
    1,
    TRUE
  ),
  (
    'a1000001-0001-4000-8000-000000000002',
    '메이크업',
    'makeup',
    '립, 아이, 베이스 메이크업',
    2,
    TRUE
  ),
  (
    'a1000001-0001-4000-8000-000000000003',
    '마스크팩',
    'mask-pack',
    '시트 마스크 & 슬리핑 마스크',
    3,
    TRUE
  ),
  (
    'a1000001-0001-4000-8000-000000000004',
    '선케어',
    'suncare',
    '자외선 차단 & 애프터선 케어',
    4,
    TRUE
  )
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- Products (fictional brands — NOT real Q-Depot products)
-- =============================================================================

INSERT INTO public.products (
  id, category_id, name, slug, description, short_description,
  brand, sku, price, wholesale_price, compare_at_price,
  moq, stock, ingredients, how_to_use, country_of_origin,
  status, is_featured
)
VALUES
  (
    'b2000001-0001-4000-8000-000000000001',
    'a1000001-0001-4000-8000-000000000001',
    '로즈 하이드레이팅 에센스',
    'lumiere-rose-hydrating-essence',
    '불가리안 로즈 워터와 히알루론산이 피부에 수분을 채워주는 가벼운 에센스입니다. 수출용 대용량 150ml.',
    '수분 충전 로즈 에센스',
    'Lumière Seoul',
    'LS-RE-150',
    28000, 16800, 32000,
    12, 240,
    'Rosa Damascena Flower Water, Hyaluronic Acid, Glycerin',
    '토너 후 2~3방울을 얼굴 전체에 두드려 흡수시킵니다.',
    'KR',
    'active', TRUE
  ),
  (
    'b2000001-0001-4000-8000-000000000002',
    'a1000001-0001-4000-8000-000000000002',
    '벨벳 립 틴트 3종 세트',
    'han-river-velvet-lip-tint-set',
    '맑게 발색되는 벨벳 립 틴트 3색 세트. B2B MOQ 24세트, 수출 포장 포함.',
    '수출용 립 틴트 베스트셀러',
    'Han River Beauty',
    'HRB-LT-SET',
    45000, 27000, NULL,
    24, 120,
    NULL, NULL,
    'KR',
    'active', TRUE
  ),
  (
    'b2000001-0001-4000-8000-000000000003',
    'a1000001-0001-4000-8000-000000000003',
    '제주 그린티 슬리핑 마스크',
    'jeju-dew-green-tea-sleep-mask',
    '제주 유기농 녹차 추출물이 함유된 오버나이트 수분 마스크. 80ml 튜브형.',
    '밤새 촉촉한 슬리핑 마스크',
    'Jeju Dew Co.',
    'JDC-GT-80',
    22000, 13200, 26000,
    20, 180,
    'Camellia Sinensis Leaf Extract, Panthenol, Squalane',
    '스킨케어 마지막 단계에 적당량을 펴 바릅니다.',
    'KR',
    'active', FALSE
  ),
  (
    'b2000001-0001-4000-8000-000000000004',
    'a1000001-0001-4000-8000-000000000004',
    'SPF50+ 에어리 선 플루이드',
    'seoul-glow-airy-sun-fluid',
    '끈적임 없는 워터리 텍스처의 고함량 선크림. 해외 유통용 50ml.',
    '가벼운 데일리 선케어',
    'Seoul Glow Lab',
    'SGL-SF-50',
    26000, 15600, NULL,
    30, 300,
    'Zinc Oxide, Tocopherol, Centella Asiatica Extract',
    '외출 30분 전 적당량을 고르게 펴 바릅니다.',
    'KR',
    'active', TRUE
  ),
  (
    'b2000001-0001-4000-8000-000000000005',
    'a1000001-0001-4000-8000-000000000001',
    '스네일 리페어 앰플',
    'peach-blossom-snail-ampoule',
    '92% 스네일 mucin 함유 집중 앰플. 민감 피부용, 무향료 포뮬러.',
    '재생 케어 집중 앰플',
    'Peach Blossom K',
    'PBK-SA-50',
    35000, 21000, 39000,
    15, 90,
    'Snail Secretion Filtrate, Niacinamide, Allantoin',
    '세럼 단계에서 1~2펌프를 사용합니다.',
    'KR',
    'active', FALSE
  )
ON CONFLICT (slug) DO NOTHING;

-- Optional: promote a user to admin (uncomment and set email)
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';
