# Supabase Setup Instructions

## Step 1: Configure Google OAuth

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Google** provider
4. Add your Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable Google+ API
   - Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Add authorized redirect URI: `https://aivddofhdsdwkfdaeqms.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client Secret**
   - Paste them into Supabase Google provider settings
5. Save the configuration

## Step 2: Set Up Database Tables

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-schema.sql` file
4. Paste it into the SQL editor
5. Click **Run** to execute the script

This will create:
- `students` table - for storing enrolled students and their face descriptors
- `emotion_stream` table - for real-time emotion monitoring
- `attendance` table - for logging attendance records
- Row Level Security (RLS) policies for authenticated users
- Indexes for better performance

## Step 3: Enable Realtime (Optional)

For live dashboard updates:

1. Navigate to **Database** → **Replication**
2. Find the `emotion_stream` table
3. Enable replication for this table
4. This allows real-time updates to be streamed to connected clients

## Step 4: Test the Connection

1. Start the development server: `npm run dev`
2. Open http://localhost:5173
3. Click "Continue with Google" to sign in
4. If authentication works, you should see the dashboard
5. The "Could not find table 'students'" error should be resolved

## Troubleshooting

### Authentication Issues
- Make sure the Google OAuth redirect URI matches exactly
- Check that the Supabase URL and Anon Key in `.env.local` are correct

### Database Connection Issues
- Verify that the SQL script ran without errors
- Check that RLS policies are properly configured
- Ensure you're signed in as an authenticated user

### Realtime Issues
- Confirm that realtime is enabled for `emotion_stream` table
- Check browser console for WebSocket connection errors
