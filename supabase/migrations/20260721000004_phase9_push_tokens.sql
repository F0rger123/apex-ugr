-- ============================================================
-- Apex UGR — Phase 9 Push Notifications Migration
-- Adds: push_token to profiles
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS push_token TEXT;
