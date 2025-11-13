-- Reset Script - Run this first if you already have tables with wrong policies
-- This will drop existing tables and recreate them with correct permissions

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read students" ON public.students;
DROP POLICY IF EXISTS "Allow authenticated users to insert students" ON public.students;
DROP POLICY IF EXISTS "Allow authenticated users to update students" ON public.students;
DROP POLICY IF EXISTS "Allow authenticated users to read emotion_stream" ON public.emotion_stream;
DROP POLICY IF EXISTS "Allow authenticated users to upsert emotion_stream" ON public.emotion_stream;
DROP POLICY IF EXISTS "Allow authenticated users to update emotion_stream" ON public.emotion_stream;
DROP POLICY IF EXISTS "Allow authenticated users to read attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow authenticated users to insert attendance" ON public.attendance;

-- Drop existing tables (CASCADE will also drop the emotion_stream foreign key)
DROP TABLE IF EXISTS public.emotion_stream CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;

-- Drop trigger function if exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Now run the supabase-schema.sql file to recreate everything
