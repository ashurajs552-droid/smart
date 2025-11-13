# FINAL SETUP - DO THESE STEPS IN ORDER

## ✅ Step 1: Force Browser to Load New Code

Your browser has cached the old version. Do **ALL** of these:

### Option A: Hard Refresh (Try this first)
1. Press `Cmd + Shift + R` in Chrome
2. Or press `Cmd + Option + E` to empty cache, then refresh

### Option B: Clear Site Data (If hard refresh doesn't work)
1. Open Chrome DevTools: `Cmd + Option + I`
2. Go to **Application** tab
3. Click **Clear site data** button
4. Close and reopen http://localhost:5173

### Option C: Incognito (Nuclear option)
1. Press `Cmd + Shift + N` for new incognito window
2. Go to http://localhost:5173
3. Should show "**Smart Class Monitor**" title

---

## ✅ Step 2: Fix Supabase Database (CRITICAL)

The "Save to Supabase" error is because tables don't exist yet.

### Go to Supabase SQL Editor:
1. Open: https://aivddofhdsdwkfdaeqms.supabase.co
2. Click **"SQL Editor"** in left sidebar
3. Click **"New query"**
4. Copy **ALL** the SQL below and paste it:

```sql
-- Clean up
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

-- Create tables
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

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create policies (allows everyone - for development)
CREATE POLICY "Allow all to read students" ON public.students FOR SELECT TO public USING (true);
CREATE POLICY "Allow all to insert students" ON public.students FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow all to update students" ON public.students FOR UPDATE TO public USING (true);
CREATE POLICY "Allow all to read emotion_stream" ON public.emotion_stream FOR SELECT TO public USING (true);
CREATE POLICY "Allow all to upsert emotion_stream" ON public.emotion_stream FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow all to update emotion_stream" ON public.emotion_stream FOR UPDATE TO public USING (true);
CREATE POLICY "Allow all to read attendance" ON public.attendance FOR SELECT TO public USING (true);
CREATE POLICY "Allow all to insert attendance" ON public.attendance FOR INSERT TO public WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_emotion_stream_student_id ON public.emotion_stream(student_id);
CREATE INDEX idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX idx_attendance_at ON public.attendance(at DESC);

-- Create trigger function
CREATE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_emotion_stream_updated_at BEFORE UPDATE ON public.emotion_stream FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

5. Click **"Run"** button
6. Wait for "Success" message

---

## ✅ Step 3: Test Emotion Detection

Once the browser shows "Smart Class Monitor":

1. **Click "Start" button** - Camera should already be running
2. **Look for blue overlay box** around your face with emotion text
3. If no overlay appears:
   - Open DevTools Console (`Cmd + Option + I`)
   - Look for errors
   - Check if "Loading models..." message appears

---

## ✅ Step 4: Test Student Enrollment

1. Enter **USN**: `test001`
2. Enter **Name**: `Test Student`
3. Click **"Capture"** button 3 times (wait 1 second between clicks)
4. Should show "Samples: 3"
5. Click **"Save to Supabase"**
6. Should show "Saved!" message (not an error)

---

## 🔍 Troubleshooting

### Title Still Shows "Edu Vision Dashboard"
- Your browser cache is VERY sticky
- Try incognito mode (`Cmd + Shift + N`)
- Or completely quit and restart Chrome

### No Emotion Overlay Appearing
- Check Console for errors (`Cmd + Option + I`)
- Models might still be loading (wait 10-15 seconds)
- Face might be too small - move closer to camera

### "Save to Supabase" Still Fails
- Make sure you ran the SQL script in Step 2
- Check that all 3 tables exist in Supabase
- Refresh the page after creating tables

### Camera Permission Denied
- Click lock icon 🔒 in address bar
- Set Camera to "Allow"
- Refresh page

---

## 📋 What Should Work After Setup

✅ Title: "Smart Class Monitor"  
✅ Start/Stop buttons work  
✅ Blue box around face with emotion + confidence %  
✅ Enroll student without errors  
✅ "Saved!" message appears  

---

## 🆘 Still Having Issues?

1. Check browser Console for red errors
2. Verify server is running (`npm run dev` in terminal)
3. Verify Supabase tables exist (check SQL Editor)
4. Try completely different browser (Safari/Firefox)
