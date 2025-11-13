import React, { useState } from 'react'
import supabase from '../lib/supabaseClient'
import { analyzeFrameRecognize } from '../utils/emotion'

export default function Enroll({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement> }) {
  const [usn, setUsn] = useState('')
  const [name, setName] = useState('')
  const [descs, setDescs] = useState<number[][]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function captureOne() {
    setMsg(null)
    const v = videoRef.current
    if (!v) return
    const faces = await analyzeFrameRecognize(v, { inputSize: 160 })
    if (!faces.length) { setMsg('No face detected. Try again.'); return }
    const d = Array.from(faces[0].descriptor as Float32Array)
    setDescs(prev => [...prev, d])
  }

  async function save() {
    if (!usn || !name) { setMsg('Enter USN and Name'); return }
    if (descs.length < 3) { setMsg('Capture at least 3 samples'); return }
    setSaving(true)
    setMsg(null)
    const { error } = await supabase.from('students').upsert({
      student_id: usn,
      student_name: name,
      descriptors: descs
    })
    setSaving(false)
    if (error) setMsg(error.message)
    else { setMsg('Saved!'); setDescs([]) }
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="mb-2 font-medium">Enroll Student</h2>
      <div className="flex flex-col gap-2">
        <input className="input" placeholder="USN" value={usn} onChange={e => setUsn(e.target.value)} />
        <input className="input" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <div className="flex items-center gap-2 text-sm">
          <button className="btn" onClick={captureOne}>Capture</button>
          <span>Samples: <b>{descs.length}</b></span>
        </div>
        <button className="btn" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save to Supabase'}</button>
        {msg && <div className="text-xs text-slate-600">{msg}</div>}
      </div>
    </div>
  )
}
