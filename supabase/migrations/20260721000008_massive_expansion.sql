-- ==============================================================================
-- PHASE 8: MASSIVE EXPANSION (E-Commerce, Social Threads, Advanced Telemetry)
-- ==============================================================================

-- 1. E-Commerce (Shopping Cart & Orders)
CREATE TABLE public.shopping_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES public.shopping_carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(cart_id, product_id)
);

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    shipping_address JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.marketplace_products(id),
    quantity INTEGER NOT NULL,
    price_at_time NUMERIC(10, 2) NOT NULL
);

-- 2. Social Threads (Nested Comments)
CREATE TABLE public.post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Advanced Telemetry (Lap Times)
CREATE TABLE public.telemetry_laps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.telemetry_sessions(id) ON DELETE CASCADE,
    lap_number INTEGER NOT NULL,
    lap_time_ms BIGINT NOT NULL,
    sector_1_ms BIGINT,
    sector_2_ms BIGINT,
    sector_3_ms BIGINT,
    top_speed_mph NUMERIC(5, 2),
    avg_speed_mph NUMERIC(5, 2),
    max_g_lateral NUMERIC(4, 2),
    max_g_longitudinal NUMERIC(4, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.shopping_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_laps ENABLE ROW LEVEL SECURITY;

-- Cart Policies
CREATE POLICY "Users can manage their own cart" ON public.shopping_carts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own cart items" ON public.cart_items FOR ALL USING (
    cart_id IN (SELECT id FROM public.shopping_carts WHERE user_id = auth.uid())
);

-- Order Policies
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
);

-- Comments Policies
CREATE POLICY "Anyone can view comments" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

-- Telemetry Laps Policies
CREATE POLICY "Users can view public laps" ON public.telemetry_laps FOR SELECT USING (
    session_id IN (SELECT id FROM public.telemetry_sessions)
);
CREATE POLICY "Users can insert laps for own sessions" ON public.telemetry_laps FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM public.telemetry_sessions WHERE user_id = auth.uid())
);

-- Add reply_count to post_comments
ALTER TABLE public.post_comments ADD COLUMN reply_count INTEGER DEFAULT 0;

-- Function to increment reply_count
CREATE OR REPLACE FUNCTION increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_comment_id IS NOT NULL THEN
        UPDATE public.post_comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_comment_reply
    AFTER INSERT ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION increment_reply_count();
