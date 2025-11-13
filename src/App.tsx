import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { setupModels, analyzeFrameMulti, analyzeFrameRecognize, configureEmotion, type FaceReading } from './utils/emotion'
import { loadRosterFromSupabase, buildMatcher, type Matcher } from './utils/recognition'
import Papa from 'papaparse'
import './index.css'
import supabase from './lib/supabaseClient'
import Dashboard from './components/Dashboard'
import Enroll from './components/Enroll'
import LandingPage from './components/LandingPage'

type RecognizedFace = FaceReading & { student_id?: string; student_name?: string }
export type EmotionSnapshot = {
  timestamp: number
  faces: RecognizedFace[]
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [ready, setReady] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [supabaseError, setSupabaseError] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<EmotionSnapshot[]>([])
  const [streaming, setStreaming] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [showLanding, setShowLanding] = useState(true)
  const [highAccuracy, setHighAccuracy] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [matcher, setMatcher] = useState<Matcher>(null)
  const lastMarkedRef = useRef<Record<string, number>>({})
  const lastRecognizeAtRef = useRef<number>(0)
  const latestFacesRef = useRef<RecognizedFace[]>([])
  const captureIntervalMs = 5000

  // Load models once, then auto-start camera
  useEffect(() => {
    // enable smoothing + quality gate
    configureEmotion({ smoothingAlpha: 0.6, qualityMin: 0.3 })
    setupModels().then(() => setReady(true)).catch((e) => {
      console.error(e)
      setModelError('Failed to load ML models. Check network and CORS.')
    })
  }, [])

  // Process frames (multi-face)
  const loop = useCallback(async () => {
    if (!videoRef.current) return

    // Throttle descriptor-based recognition to ~1fps for performance
    const now = Date.now()
    let faces: FaceReading[] = []
    if (matcher && now - lastRecognizeAtRef.current > 1000) {
      lastRecognizeAtRef.current = now
      const rich = await analyzeFrameRecognize(videoRef.current, { inputSize: 160 })
      // attach identities
      const recognized: RecognizedFace[] = rich.map(r => {
        let sid: string | undefined, sname: string | undefined
        if (matcher) {
          const best = matcher.findBestMatch(r.descriptor)
          if (best.label !== 'unknown' && best.distance < 0.6) {
            const parts = best.label.split('::')
            sid = parts[0]; sname = parts[1]
          }
        }
        return { ...r, student_id: sid, student_name: sname }
      })
      faces = recognized
      // auto attendance mark with 5min dedupe per recognized student
      for (const rf of recognized) {
        if (!rf.student_id) continue
        const sid = rf.student_id
        const sname = rf.student_name!
        const last = lastMarkedRef.current[sid] || 0
        if (now - last > 5 * 60 * 1000) {
          const { error } = await supabase.from('attendance').insert({
            student_id: sid,
            student_name: sname,
            at: new Date().toISOString(),
            emotion: rf.emotion,
            attention: rf.attention
          })
          if (error) setSupabaseError(error.message)
          else lastMarkedRef.current[sid] = now
        }
      }
    } else {
      const useSSD = highAccuracy || (now - lastRecognizeAtRef.current < 50)
      faces = await analyzeFrameMulti(videoRef.current, { inputSize: useSSD ? 256 : 224, detector: useSSD ? 'ssd' : 'tiny' })
    }

    // always keep latest faces for 5s snapshotter
    latestFacesRef.current = faces as RecognizedFace[]

    // draw overlay
    if (canvasRef.current && videoRef.current) {
      const ctx = canvasRef.current.getContext('2d')!
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      ctx.strokeStyle = '#0ea5e9'
      ctx.lineWidth = 2
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace'
      ctx.fillStyle = 'rgba(14,165,233,0.2)'
      faces.forEach(f => {
        ctx.strokeRect(f.box.x, f.box.y, f.box.width, f.box.height)
        ctx.fillRect(f.box.x, f.box.y + f.box.height + 2, f.box.width, 16)
        ctx.fillStyle = '#0ea5e9'
        ctx.fillText(`${f.emotion} ${(f.confidence*100).toFixed(0)}% | Attn ${(f.attention*100).toFixed(0)}% | Eng ${(f.engagement*100).toFixed(0)}%`, f.box.x + 4, f.box.y + f.box.height + 14)
        ctx.fillStyle = 'rgba(14,165,233,0.2)'
      })
    }

    // overlay only; snapshots are pushed by the 5s timer

    if (streaming) requestAnimationFrame(loop)
  }, [streaming, matcher, highAccuracy])

  // Start webcam
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      })
      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      // Ensure autoplay works on mobile
      videoRef.current.muted = true
      ;(videoRef.current as any).playsInline = true
      const onMeta = () => {
        if (!videoRef.current) return
        if (canvasRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth
          canvasRef.current.height = videoRef.current.videoHeight
        }
        setStreaming(true)
        loop()
      }
      videoRef.current.onloadedmetadata = onMeta
      await videoRef.current.play().catch(() => {/* ignore; will play after metadata */})
    } catch (err: any) {
      setModelError(err?.message || 'Camera permission denied or unavailable')
      console.error(err)
    }
  }, [loop])

  // Auth gate - check Supabase session on any device
  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAuthed(true)
        setShowLanding(false)
      }
    })
    
    // Listen for auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthed(true)
        setShowLanding(false)
      } else {
        setAuthed(false)
        setShowLanding(true)
      }
    })
    
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  // Load roster and build matcher once models are ready and authed
  useEffect(() => {
    if (!ready || !authed) return
    loadRosterFromSupabase(supabase).then(entries => setMatcher(buildMatcher(entries))).catch(() => setMatcher(null))
  }, [ready, authed])

  // Auto-start camera disabled - user must click Start button

  // Stop webcam
  function stopCamera() {
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(t => t.stop())
      }
      videoRef.current.srcObject = null
    }
    setStreaming(false)
    // clear overlay
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')!
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }

  // Manual attendance removed; recognition auto-marks attendance.

  // 5s snapshot + realtime upsert using most recent faces (more stable & accurate)
  useEffect(() => {
    const id = setInterval(async () => {
      const faces = latestFacesRef.current
      setSnapshots(prev => [...prev.slice(-120), { timestamp: Date.now(), faces }])
      // upsert all recognized faces into emotion_stream
      for (const f of faces) {
        if (!f.student_id) continue
        const { error } = await supabase.from('emotion_stream').upsert({
          student_id: f.student_id,
          at: new Date().toISOString(),
          emotion: f.emotion,
          confidence: f.confidence,
          attention: f.attention
        })
        if (error) setSupabaseError(error.message)
      }
    }, captureIntervalMs)
    return () => clearInterval(id)
  }, [])

  const csvData = useMemo(() => {
    return snapshots.flatMap(s => s.faces.map(f => ({
      timestamp: new Date(s.timestamp).toISOString(),
      emotion: f.emotion,
      confidence: f.confidence.toFixed(3),
      attention: f.attention.toFixed(3),
      yaw: f.yaw.toFixed(3),
      pitch: f.pitch.toFixed(3),
      engagement: f.engagement.toFixed(3)
    })))
  }, [snapshots])

  function exportCSV() {
    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `session-history.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Show landing page if not authed OR if explicitly showing landing
  if (!authed || showLanding) {
    return <LandingPage onSignIn={() => {
      setAuthed(true)
      setShowLanding(false)
    }} />
  }

  return (
    <div className="min-h-screen p-6 text-slate-900">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Smart Class Monitor</h1>
        <button className="btn-secondary" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>

      <section className="mt-4 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-medium">Camera</h2>
          <div className="relative w-full">
            <video ref={videoRef} className="w-full rounded border" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="pointer-events-none absolute left-0 top-0 h-full w-full" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="btn" disabled={!ready || streaming} onClick={startCamera}>Start</button>
            <button className="btn" disabled={!streaming} onClick={stopCamera}>Stop</button>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={highAccuracy} onChange={e => setHighAccuracy(e.target.checked)} /> High accuracy (SSD)
            </label>
            {!ready && !modelError && <span className="text-sm text-slate-500">Loading models...</span>}
            {modelError && <span className="text-sm text-red-600">{modelError}</span>}
          </div>
        </div>

        <Enroll videoRef={videoRef} />
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-medium">Export</h2>
          <div className="flex flex-col gap-2">
            <div className="text-sm text-slate-600">Recognition is automatic; attendance is marked per recognized student. Use Enroll to add a student USN.</div>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={exportCSV}>Export CSV</button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-medium">Live Readings</h2>
        <Dashboard snapshots={snapshots} />
      </section>

      <footer className="mt-6 text-xs text-slate-500">
        {supabaseError ? (
          <div className="text-red-600">Supabase error: {supabaseError}. Ensure tables exist (students, emotion_stream, attendance) and env keys are correct.</div>
        ) : (
          <div>Realtime writes to emotion_stream for recognized students. CSV export stores local snapshots.</div>
        )}
      </footer>
    </div>
  )
}
