-- ============================================================
-- COMPLETE SUPABASE SETUP - COPY ALL AND RUN IN SQL EDITOR
-- ============================================================

-- Step 1: Clean up any existing tables and policies
DROP POLICY IF EXISTS "Allow authenticated users to read students" ON public.students;
DROP POLICY IF EXISTS "Allow authenticated users to insert students" ON public.students;
DROP POLICY IF EXISTS "Allow authenticated users to update students" ON public.students;
DROP POLICY IF EXISTS "Allow all to read students" ON public.students;
DROP POLICY IF EXISTS "Allow all to insert students" ON public.students;
DROP POLICY IF EXISTS "Allow all to update students" ON public.students;

DROP POLICY IF EXISTS "Allow authenticated users to read emotion_stream" ON public.emotion_stream;
DROP POLICY IF EXISTS "Allow authenticated users to upsert emotion_stream" ON public.emotion_stream;
DROP POLICY IF EXISTS "Allow authenticated users to update emotion_stream" ON public.emotion_stream;
DROP POLICY IF EXISTS "Allow all to read emotion_stream" ON public.emotion_stream;
DROP POLICY IF EXISTS "Allow all to upsert emotion_stream" ON public.emotion_stream;
DROP POLICY IF EXISTS "Allow all to update emotion_stream" ON public.emotion_stream;

DROP POLICY IF EXISTS "Allow authenticated users to read attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow authenticated users to insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow all to read attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow all to insert attendance" ON public.attendance;

DROP TABLE IF EXISTS public.emotion_stream CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Step 2: Create tables
CREATE TABLE public.students (
  student_id TEXT PRIMARY KEY,
  student_name TEXT NOT NULL,
  descriptors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.emotion_stream (
  student_id TEXT PRIMARY KEY REFERENCES public.students(student_id) ON DELETE CASCADE,
  at TIMESTAMPTZ NOT NULL,
  emotion TEXT,
  confidence FLOAT8,
  attention FLOAT8,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.attendance (
  id BIGSERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL,
  emotion TEXT,
  attention FLOAT8,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Step 4: Create permissive policies (allows both authenticated and anon)
CREATE POLICY "Allow all to read students" 
  ON public.students FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Allow all to insert students" 
  ON public.students FOR INSERT 
  TO public 
  WITH CHECK (true);

CREATE POLICY "Allow all to update students" 
  ON public.students FOR UPDATE 
  TO public 
  USING (true);

CREATE POLICY "Allow all to read emotion_stream" 
  ON public.emotion_stream FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Allow all to upsert emotion_stream" 
  ON public.emotion_stream FOR INSERT 
  TO public 
  WITH CHECK (true);

CREATE POLICY "Allow all to update emotion_stream" 
  ON public.emotion_stream FOR UPDATE 
  TO public 
  USING (true);

CREATE POLICY "Allow all to read attendance" 
  ON public.attendance FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Allow all to insert attendance" 
  ON public.attendance FOR INSERT 
  TO public 
  WITH CHECK (true);

-- Step 5: Create indexes
CREATE INDEX idx_emotion_stream_student_id ON public.emotion_stream(student_id);
CREATE INDEX idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX idx_attendance_at ON public.attendance(at DESC);

-- Step 6: Create trigger function for updated_at
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_students_updated_at 
  BEFORE UPDATE ON public.students 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emotion_stream_updated_at 
  BEFORE UPDATE ON public.emotion_stream 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Done! Tables are ready with proper permissions.
