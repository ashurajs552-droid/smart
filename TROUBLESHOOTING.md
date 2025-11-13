# Troubleshooting Guide - Root Fixes

## Problem 1: Browser Shows Old "Edu Vision Dashboard" Title

### Root Cause
Your browser has aggressively cached the old version of the app.

### Complete Fix
1. **Close the browser tab completely**
2. **Clear browser cache**:
   - Chrome: Press `Cmd + Shift + Delete` → Select "Cached images and files" → Clear
   - Safari: Safari menu → Clear History → All History
3. **Open a new incognito/private window**: `Cmd + Shift + N` (Chrome) or `Cmd + Shift + P` (Safari)
4. **Navigate to**: http://localhost:5173

The incognito window will bypass all cache and show the updated "Smart Class Monitor" title.

## Problem 2: Camera Permission Error

### Root Cause
"The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission."

This means either:
- You clicked "Block" when asked for camera permission
- The browser has cached a "deny" decision

### Complete Fix

**Option A: Reset Camera Permission (Recommended)**

1. **In Chrome**:
   - Click the lock icon (🔒) in the address bar
   - Find "Camera" permission
   - Change it to "Allow"
   - Refresh the page

2. **In Safari**:
   - Safari menu → Settings → Websites → Camera
   - Find "localhost" 
   - Change to "Allow"
   - Refresh the page

**Option B: Check System Permissions**

1. Open **System Settings** → **Privacy & Security** → **Camera**
2. Ensure your browser (Chrome/Safari) is checked/enabled
3. Restart your browser

## Problem 3: Supabase RLS Error - "new row violates row-level security policy"

### Root Cause
The database tables either:
- Don't exist yet, OR
- Exist with wrong RLS policies that only allow authenticated users

### Complete Fix

**Step 1: Open Supabase SQL Editor**
- Go to: https://aivddofhdsdwkfdaeqms.supabase.co
- Click "SQL Editor" in left sidebar

**Step 2: Reset Tables (if they exist)**
Copy and paste this into SQL Editor:

```sql
-- Drop existing policies
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

-- Drop tables
DROP TABLE IF EXISTS public.emotion_stream CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

Click **Run** and wait for "Success"

**Step 3: Create Tables with Correct Policies**
Now copy and paste the contents of `supabase-schema.sql` and click **Run**

**Step 4: Verify Tables Were Created**
Run this query:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('students', 'emotion_stream', 'attendance');
```

You should see all three tables listed.

## Problem 4: Start/Stop Buttons Not Working

### Root Cause
The camera was auto-starting, making the Start button appear non-functional.

### Fix Applied
✅ Already fixed in code - camera no longer auto-starts. You must click Start button.

## Problem 5: Low Emotion Detection Confidence

### Root Cause
The confidence threshold was too high (0.45), rejecting valid detections.

### Fix Applied
✅ Already fixed in code - threshold lowered to 0.25 for better sensitivity.

---

## Complete Setup Checklist

Run through this checklist to ensure everything works:

- [ ] 1. Server is running (`npm run dev` shows port 5173)
- [ ] 2. Open **incognito/private browser window**
- [ ] 3. Navigate to http://localhost:5173
- [ ] 4. Title shows "Smart Class Monitor" ✓
- [ ] 5. Camera permission is "Allow" in browser
- [ ] 6. Supabase tables created via SQL Editor
- [ ] 7. Click "Start" button - camera should activate
- [ ] 8. Face detection box appears with emotion + confidence
- [ ] 9. Enroll student with USN/Name - no RLS error
- [ ] 10. "Save to Supabase" works without errors

---

## Still Having Issues?

### Check Browser Console
1. Press `F12` or `Cmd + Option + I` to open DevTools
2. Go to Console tab
3. Look for error messages (red text)
4. Share the error messages for more specific help

### Check Network Tab
1. In DevTools, go to Network tab
2. Refresh the page
3. Check if `index.html` is loaded (should show "Smart Class Monitor" in preview)
4. If showing old content, clear browser cache more aggressively

### Nuclear Option: Clear Everything
```bash
# Stop server (Ctrl+C)
# Clear all caches
rm -rf node_modules/.vite
rm -rf dist

# Restart
npm run dev
```

Then open a **completely new incognito window** at http://localhost:5173
