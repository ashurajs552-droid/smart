# Smart Class Monitor

AI-powered classroom monitoring system with real-time face detection, emotion recognition, and automatic attendance tracking.

## Features

- 🎭 **Real-time Emotion Detection** - Tracks 7 different emotions
- 👥 **Multi-Face Recognition** - Detects multiple students simultaneously  
- ✅ **Automatic Attendance** - No manual roll calls needed
- 📊 **Live Analytics Dashboard** - Real-time engagement metrics
- 📈 **Attention Tracking** - Monitors student focus levels
- 📥 **CSV Export** - Download session data
- 🔐 **Google OAuth** - Secure authentication
- 🎨 **Beautiful Landing Page** - Professional UI with gradients

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **AI/ML**: TensorFlow.js + face-api.js
- **Database**: Supabase
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/ashurajs552-droid/smart.git
cd smart
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
# Add your Supabase credentials
```

4. Run the development server:
```bash
npm run dev
```

5. Open http://localhost:5174 in your browser

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to Vercel.

## Database Setup

Run the SQL in `COMPLETE_SETUP.sql` in your Supabase SQL Editor to create required tables.

## Project Structure

```
src/
├── components/
│   ├── LandingPage.tsx    # Landing page with features
│   ├── Dashboard.tsx       # Live readings display
│   ├── Enroll.tsx         # Student enrollment
│   └── Login.tsx          # Login component
├── utils/
│   ├── emotion.ts         # Face detection & emotion analysis
│   └── recognition.ts     # Face recognition matching
├── lib/
│   └── supabaseClient.ts  # Supabase configuration
└── App.tsx                # Main app component
```

## License

MIT

## Author

ashurajs552-droid
