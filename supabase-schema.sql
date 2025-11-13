-- Smart Class Monitor Database Schema
-- Run this in your Supabase SQL editor to set up the required tables

-- 1. Students table for enrollment and face recognition
CREATE TABLE IF NOT EXISTS public.students (
  student_id TEXT PRIMARY KEY,
  student_name TEXT NOT NULL,
  descriptors JSONB, -- Array of face descriptors for recognition
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Emotion stream table for real-time monitoring
CREATE TABLE IF NOT EXISTS public.emotion_stream (
  student_id TEXT PRIMARY KEY REFERENCES public.students(student_id) ON DELETE CASCADE,
  at TIMESTAMPTZ NOT NULL,
  emotion TEXT,
  confidence FLOAT8,
  attention FLOAT8,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Attendance table for logging student presence
CREATE TABLE IF NOT EXISTS public.attendance (
  id BIGSERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL,
  emotion TEXT,
  attention FLOAT8,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users AND anon (for localhost development)
-- Students table policies
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

-- Emotion stream policies
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

-- Attendance policies
CREATE POLICY "Allow all to read attendance" 
  ON public.attendance FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Allow all to insert attendance" 
  ON public.attendance FOR INSERT 
  TO public 
  WITH CHECK (true);

-- Enable Realtime for emotion_stream (for live dashboard)
-- Note: You may need to enable this in Supabase UI under Database > Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.emotion_stream;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emotion_stream_student_id ON public.emotion_stream(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_at ON public.attendance(at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_students_updated_at 
  BEFORE UPDATE ON public.students 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emotion_stream_updated_at 
  BEFORE UPDATE ON public.emotion_stream 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
