import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { setupModels, analyzeFrameMulti, analyzeFrameRecognize, type FaceReading } from './utils/emotion'
import { loadRosterFromSupabase, buildMatcher, type Matcher } from './utils/recognition'
import Papa from 'papaparse'
import './index.css'
import supabase from './lib/supabaseClient'

export type EmotionSnapshot = {
  timestamp: number
  faces: FaceReading[]
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [ready, setReady] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<EmotionSnapshot[]>([])
  const [studentId, setStudentId] = useState('')
  const [studentName, setStudentName] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [autoAttendance, setAutoAttendance] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [matcher, setMatcher] = useState<Matcher>(null)
  const lastMarkedRef = useRef<Record<string, number>>({})
  const lastRecognizeAtRef = useRef<number>(0)

  // Load models once, then auto-start camera
  useEffect(() => {
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
      faces = rich
      // Mark attendance for recognized labels (id::name)
      for (const r of rich) {
        const best = matcher.findBestMatch(r.descriptor)
        if (best.label !== 'unknown' && best.distance < 0.6) {
          const [sid, sname] = best.label.split('::')
          const last = lastMarkedRef.current[sid] || 0
          if (now - last > 5 * 60 * 1000) { // 5 min dedupe window
            await supabase.from('attendance').insert({
              student_id: sid,
              student_name: sname,
              at: new Date().toISOString(),
              emotion: r.emotion,
              attention: r.attention
            })
            lastMarkedRef.current[sid] = now
          }
        }
      }
    } else {
      faces = await analyzeFrameMulti(videoRef.current, { inputSize: 160 })
    }

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
        ctx.fillText(`${f.emotion} ${(f.confidence*100).toFixed(0)}%`, f.box.x + 4, f.box.y + f.box.height + 14)
        ctx.fillStyle = 'rgba(14,165,233,0.2)'
      })
    }

    setSnapshots(prev => [
      ...prev.slice(-120), // keep last ~120 frames
      { timestamp: Date.now(), faces }
    ])

    // upsert latest single reading if studentId set (choose highest-attention face)
    if (studentId && faces.length) {
      const top = faces.reduce((a, b) => (b.attention > a.attention ? b : a), faces[0])
      await supabase.from('emotion_stream').upsert({
        student_id: studentId,
        at: new Date().toISOString(),
        emotion: top.emotion,
        confidence: top.confidence,
        attention: top.attention
      })
    }

    if (streaming) requestAnimationFrame(loop)
  }, [streaming, studentId])

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

  // Load roster and build matcher once models are ready
  useEffect(() => {
    if (!ready) return
    loadRosterFromSupabase(supabase).then(entries => setMatcher(buildMatcher(entries))).catch(() => setMatcher(null))
  }, [ready])

  // Auto-start camera after models are ready
  useEffect(() => {
    if (ready && !streaming) {
      startCamera().catch(console.error)
    }
  }, [ready, streaming, startCamera])

  // Stop webcam
  function stopCamera() {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(t => t.stop())
      setStreaming(false)
    }
  }

  // Mark attendance with latest snapshot
  const markAttendance = useCallback(async () => {
    if (!studentId || !studentName) return
    const latest = snapshots[snapshots.length - 1]
    const face = latest?.faces?.[0]
    const { error } = await supabase.from('attendance').insert({
      student_id: studentId,
      student_name: studentName,
      at: new Date().toISOString(),
      emotion: face?.emotion ?? null,
      attention: face?.attention ?? null
    })
    if (error) alert(error.message)
  }, [snapshots, studentId, studentName])

  // Auto attendance interval
  useEffect(() => {
    if (!autoAttendance || !studentId || !studentName) return
    const id = setInterval(() => {
      markAttendance().catch(console.error)
    }, 30_000)
    return () => clearInterval(id)
  }, [autoAttendance, studentId, studentName, markAttendance])

  const csvData = useMemo(() => {
    return snapshots.flatMap(s => s.faces.map(f => ({
      timestamp: new Date(s.timestamp).toISOString(),
      emotion: f.emotion,
      confidence: f.confidence.toFixed(3),
      attention: f.attention.toFixed(3)
    })))
  }, [snapshots])

  function exportCSV() {
    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${studentId || 'student'}-history.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen p-6 text-slate-900">
      <h1 className="text-2xl font-semibold">Edu Vision Dashboard</h1>

      <section className="mt-4 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-medium">Camera</h2>
          <div className="relative w-full">
            <video ref={videoRef} className="w-full rounded border" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="pointer-events-none absolute left-0 top-0 h-full w-full" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button className="btn" disabled={!ready || streaming} onClick={startCamera}>Start</button>
            <button className="btn" disabled={!streaming} onClick={stopCamera}>Stop</button>
            {!ready && !modelError && <span className="text-sm text-slate-500">Loading models...</span>}
            {modelError && <span className="text-sm text-red-600">{modelError}</span>}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-medium">Student & Attendance</h2>
          <div className="flex flex-col gap-2">
            <input className="input" placeholder="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} />
            <input className="input" placeholder="Student Name" value={studentName} onChange={e => setStudentName(e.target.value)} />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={autoAttendance} onChange={e => setAutoAttendance(e.target.checked)} />
              Auto-mark attendance every 30s
            </label>
            <div className="flex gap-2">
              <button className="btn" onClick={markAttendance}>Mark attendance</button>
              <button className="btn-secondary" onClick={exportCSV}>Export CSV</button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-medium">Live Readings</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {snapshots.slice(-6).reverse().map((s, i) => (
            <div key={i} className="rounded border p-3 text-sm">
              <div className="font-mono text-xs text-slate-500">{new Date(s.timestamp).toLocaleTimeString()}</div>
              {s.faces.slice(0,3).map((f, idx) => (
                <div key={idx} className="mt-1">
                  <div>Emotion: <b>{f.emotion}</b> ({(f.confidence*100).toFixed(1)}%)</div>
                  <div>Attention: <b>{(f.attention*100).toFixed(0)}%</b></div>
                </div>
              ))}
              {s.faces.length === 0 && <div className="text-slate-500">No face</div>}
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-6 text-xs text-slate-500">
        Realtime writes to emotion_stream when a student ID is set. CSV export stores local snapshots.
      </footer>
    </div>
  )
}
