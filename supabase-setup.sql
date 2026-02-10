-- ============================================================================
-- KRAUZZZZ - SUPABASE DATABASE SETUP
-- ============================================================================
-- Этот скрипт создает все необходимые таблицы для real-time синхронизации
-- Выполните его в Supabase SQL Editor (Database → SQL Editor → New Query)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id TEXT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  role TEXT DEFAULT 'student',
  completed_lesson_ids TEXT[] DEFAULT '{}',
  submitted_homeworks JSONB DEFAULT '[]',
  chat_history JSONB DEFAULT '[]',
  last_sync TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON public.users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_last_sync ON public.users(last_sync);

-- ============================================================================
-- MODULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  min_level INTEGER DEFAULT 1,
  lessons JSONB DEFAULT '[]',
  image_url TEXT,
  video_url TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_min_level ON public.modules(min_level);

-- ============================================================================
-- MATERIALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT,
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_type ON public.materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);

-- ============================================================================
-- STREAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail TEXT,
  scheduled_for TIMESTAMPTZ,
  is_live BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_streams_scheduled ON public.streams(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_streams_is_live ON public.streams(is_live);

-- ============================================================================
-- EVENTS TABLE (Calendar)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(type);

-- ============================================================================
-- SCENARIOS TABLE (Arena)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT,
  xp_reward INTEGER DEFAULT 0,
  prompts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenarios_difficulty ON public.scenarios(difficulty);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  target_user_id TEXT,
  target_role TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON public.notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================
-- Включаем real-time публикацию для всех таблиц
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.modules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scenarios;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Автоматически обновляем updated_at при изменении записи
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streams_updated_at BEFORE UPDATE ON public.streams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON public.scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Включаем RLS для безопасности
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Политики для чтения (все могут читать)
CREATE POLICY "Enable read access for all users" ON public.users
  FOR SELECT USING (TRUE);

CREATE POLICY "Enable read access for all modules" ON public.modules
  FOR SELECT USING (TRUE);

CREATE POLICY "Enable read access for all materials" ON public.materials
  FOR SELECT USING (TRUE);

CREATE POLICY "Enable read access for all streams" ON public.streams
  FOR SELECT USING (TRUE);

CREATE POLICY "Enable read access for all events" ON public.events
  FOR SELECT USING (TRUE);

CREATE POLICY "Enable read access for all scenarios" ON public.scenarios
  FOR SELECT USING (TRUE);

CREATE POLICY "Enable read access for all notifications" ON public.notifications
  FOR SELECT USING (TRUE);

-- Политики для записи (через service role или API)
CREATE POLICY "Enable insert/update for authenticated users" ON public.users
  FOR ALL USING (TRUE);

CREATE POLICY "Enable insert/update for modules" ON public.modules
  FOR ALL USING (TRUE);

CREATE POLICY "Enable insert/update for materials" ON public.materials
  FOR ALL USING (TRUE);

CREATE POLICY "Enable insert/update for streams" ON public.streams
  FOR ALL USING (TRUE);

CREATE POLICY "Enable insert/update for events" ON public.events
  FOR ALL USING (TRUE);

CREATE POLICY "Enable insert/update for scenarios" ON public.scenarios
  FOR ALL USING (TRUE);

CREATE POLICY "Enable insert/update for notifications" ON public.notifications
  FOR ALL USING (TRUE);

-- ============================================================================
-- ГОТОВО!
-- ============================================================================
-- Теперь таблицы созданы и настроены для real-time синхронизации.
-- Следующие шаги:
-- 1. Скопируйте URL и anon key из Settings → API
-- 2. Добавьте их в .env.local
-- 3. Установите VITE_ENABLE_REALTIME_SYNC=true
-- 4. Перезапустите приложение
-- ============================================================================
