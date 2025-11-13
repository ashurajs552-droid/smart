# 🚀 Deploy to Vercel - Quick Guide

## ✅ Code is Pushed to GitHub!

Repository: https://github.com/ashurajs552-droid/smart

## Step 1: Import to Vercel

1. Go to https://vercel.com/new
2. Sign in with GitHub
3. Click "Import Git Repository"
4. Select: **ashurajs552-droid/smart**
5. Click "Import"

## Step 2: Configure Build Settings

Vercel will auto-detect most settings, but verify:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node Version**: 18.x (default is fine)

## Step 3: Add Environment Variables

Click "Environment Variables" and add:

**Variable 1:**
```
Name: VITE_SUPABASE_URL
Value: https://aivddofhdsdwkfdaeqms.supabase.co
```

**Variable 2:**
```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpdmRkb2ZoZHNkd2tmZGFlcW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDI5NTUsImV4cCI6MjA3NzY3ODk1NX0.1mk7u_lB4nDhEO1sAt3b5tm2vHvThvqENmbUcdtxJGM
```

## Step 4: Deploy!

Click **"Deploy"** button

⏳ Wait 2-3 minutes for build to complete...

## Step 5: Get Your URL

After deployment, you'll get a URL like:
```
https://smart-xxx.vercel.app
```

## Step 6: Configure Supabase for Production

1. Go to Supabase Dashboard: https://app.supabase.com
2. Navigate to: **Authentication** → **URL Configuration**
3. Set **Site URL** to: `https://your-vercel-url.vercel.app`
4. Add to **Redirect URLs**: `https://your-vercel-url.vercel.app/**`

## Step 7: Configure Google OAuth (Optional)

If you want Google sign-in to work in production:

1. Go to https://console.cloud.google.com/apis/credentials
2. Select your OAuth client
3. Add to **Authorized JavaScript origins**:
   - `https://your-vercel-url.vercel.app`
4. Add to **Authorized redirect URIs**:
   - `https://aivddofhdsdwkfdaeqms.supabase.co/auth/v1/callback`

## 🎉 Done!

Your app is now live at: `https://your-vercel-url.vercel.app`

---

## Features That Will Work

✅ Landing page with beautiful gradient design  
✅ Camera access (HTTPS required, Vercel provides it automatically)  
✅ Multi-face detection  
✅ Real-time emotion recognition  
✅ Student enrollment  
✅ Automatic attendance  
✅ Live analytics  
✅ CSV export  
✅ Google OAuth (after configuration)  

---

## Troubleshooting

### Build fails
- Check that all dependencies are in `package.json`
- Verify Node version is 18.x or higher

### Camera doesn't work
- Must use HTTPS (Vercel provides this automatically)
- User must grant camera permission

### Google OAuth doesn't work
- Complete Step 7 above
- Ensure redirect URLs match exactly
- Check Supabase Authentication settings

---

## Custom Domain (Optional)

1. In Vercel dashboard, go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update Supabase redirect URLs to use custom domain
