# Deployment Guide - Smart Class Monitor

## Deploy to Vercel

### 1. Push to GitHub

Already configured! Repository: `https://github.com/ashurajs552-droid/smart`

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import from GitHub: `ashurajs552-droid/smart`
4. Configure project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3. Environment Variables

Add these in Vercel dashboard:

```
VITE_SUPABASE_URL=https://aivddofhdsdwkfdaeqms.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpdmRkb2ZoZHNkd2tmZGFlcW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDI5NTUsImV4cCI6MjA3NzY3ODk1NX0.1mk7u_lB4nDhEO1sAt3b5tm2vHvThvqENmbUcdtxJGM
```

### 4. Configure Google OAuth in Supabase

After deployment, update the redirect URLs:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your Vercel URL to **Site URL**: `https://your-project.vercel.app`
3. Add to **Redirect URLs**: `https://your-project.vercel.app/**`

4. Go to Google Cloud Console → Credentials → Your OAuth Client
5. Add authorized redirect URI: `https://aivddofhdsdwkfdaeqms.supabase.co/auth/v1/callback`
6. Add authorized JavaScript origin: `https://your-project.vercel.app`

### 5. Deploy

Click "Deploy" in Vercel! 🚀

---

## Post-Deployment Checklist

- [ ] Landing page loads correctly
- [ ] Google sign-in works
- [ ] Dashboard appears after login
- [ ] Camera permissions prompt works
- [ ] Face detection overlay appears
- [ ] Student enrollment works
- [ ] Supabase saves data correctly
- [ ] CSV export works

---

## Troubleshooting

### Camera not working on mobile
- Vercel automatically uses HTTPS, which is required for camera access
- Users need to grant camera permission

### Google OAuth fails
- Check redirect URIs match exactly
- Ensure Supabase URL is in Google Cloud Console

### Face detection slow
- Models load from CDN on first use
- Subsequent loads are cached

---

## Features

✅ AI-powered face detection  
✅ Real-time emotion recognition  
✅ Automatic attendance tracking  
✅ Multi-face detection  
✅ Live analytics dashboard  
✅ CSV data export  
✅ Google OAuth authentication  
✅ Beautiful landing page  
