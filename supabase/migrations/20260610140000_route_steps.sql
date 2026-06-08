-- Phase 4: turn-by-turn step storage on transitional rides table
ALTER TABLE public.rides
ADD COLUMN IF NOT EXISTS route_steps jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.rides.route_steps IS
  'Serialized navigation maneuver steps for turn-by-turn guidance. Empty array for legacy meets.';
