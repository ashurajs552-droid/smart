import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setupModels, analyzeFrameMulti, analyzeFrameRecognize } from './utils/emotion';
import { loadRosterFromSupabase, buildMatcher } from './utils/recognition';
import Papa from 'papaparse';
import './index.css';
import supabase from './lib/supabaseClient';
export default function App() {
    const videoRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [modelError, setModelError] = useState(null);
    const [snapshots, setSnapshots] = useState([]);
    const [studentId, setStudentId] = useState('');
    const [studentName, setStudentName] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [autoAttendance, setAutoAttendance] = useState(true);
    const canvasRef = useRef(null);
    const [matcher, setMatcher] = useState(null);
    const lastMarkedRef = useRef({});
    const lastRecognizeAtRef = useRef(0);
    // Load models once, then auto-start camera
    useEffect(() => {
        setupModels().then(() => setReady(true)).catch((e) => {
            console.error(e);
            setModelError('Failed to load ML models. Check network and CORS.');
        });
    }, []);
    // Process frames (multi-face)
    const loop = useCallback(async () => {
        if (!videoRef.current)
            return;
        // Throttle descriptor-based recognition to ~1fps for performance
        const now = Date.now();
        let faces = [];
        if (matcher && now - lastRecognizeAtRef.current > 1000) {
            lastRecognizeAtRef.current = now;
            const rich = await analyzeFrameRecognize(videoRef.current, { inputSize: 160 });
            faces = rich;
            // Mark attendance for recognized labels (id::name)
            for (const r of rich) {
                const best = matcher.findBestMatch(r.descriptor);
                if (best.label !== 'unknown' && best.distance < 0.6) {
                    const [sid, sname] = best.label.split('::');
                    const last = lastMarkedRef.current[sid] || 0;
                    if (now - last > 5 * 60 * 1000) { // 5 min dedupe window
                        await supabase.from('attendance').insert({
                            student_id: sid,
                            student_name: sname,
                            at: new Date().toISOString(),
                            emotion: r.emotion,
                            attention: r.attention
                        });
                        lastMarkedRef.current[sid] = now;
                    }
                }
            }
        }
        else {
            faces = await analyzeFrameMulti(videoRef.current, { inputSize: 160 });
        }
        // draw overlay
        if (canvasRef.current && videoRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.strokeStyle = '#0ea5e9';
            ctx.lineWidth = 2;
            ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
            ctx.fillStyle = 'rgba(14,165,233,0.2)';
            faces.forEach(f => {
                ctx.strokeRect(f.box.x, f.box.y, f.box.width, f.box.height);
                ctx.fillRect(f.box.x, f.box.y + f.box.height + 2, f.box.width, 16);
                ctx.fillStyle = '#0ea5e9';
                ctx.fillText(`${f.emotion} ${(f.confidence * 100).toFixed(0)}%`, f.box.x + 4, f.box.y + f.box.height + 14);
                ctx.fillStyle = 'rgba(14,165,233,0.2)';
            });
        }
        setSnapshots(prev => [
            ...prev.slice(-120), // keep last ~120 frames
            { timestamp: Date.now(), faces }
        ]);
        // upsert latest single reading if studentId set (choose highest-attention face)
        if (studentId && faces.length) {
            const top = faces.reduce((a, b) => (b.attention > a.attention ? b : a), faces[0]);
            await supabase.from('emotion_stream').upsert({
                student_id: studentId,
                at: new Date().toISOString(),
                emotion: top.emotion,
                confidence: top.confidence,
                attention: top.attention
            });
        }
        if (streaming)
            requestAnimationFrame(loop);
    }, [streaming, studentId]);
    // Start webcam
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            if (!videoRef.current)
                return;
            videoRef.current.srcObject = stream;
            // Ensure autoplay works on mobile
            videoRef.current.muted = true;
            videoRef.current.playsInline = true;
            const onMeta = () => {
                if (!videoRef.current)
                    return;
                if (canvasRef.current) {
                    canvasRef.current.width = videoRef.current.videoWidth;
                    canvasRef.current.height = videoRef.current.videoHeight;
                }
                setStreaming(true);
                loop();
            };
            videoRef.current.onloadedmetadata = onMeta;
            await videoRef.current.play().catch(() => { });
        }
        catch (err) {
            setModelError(err?.message || 'Camera permission denied or unavailable');
            console.error(err);
        }
    }, [loop]);
    // Load roster and build matcher once models are ready
    useEffect(() => {
        if (!ready)
            return;
        loadRosterFromSupabase(supabase).then(entries => setMatcher(buildMatcher(entries))).catch(() => setMatcher(null));
    }, [ready]);
    // Auto-start camera after models are ready
    useEffect(() => {
        if (ready && !streaming) {
            startCamera().catch(console.error);
        }
    }, [ready, streaming, startCamera]);
    // Stop webcam
    function stopCamera() {
        if (videoRef.current?.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(t => t.stop());
            setStreaming(false);
        }
    }
    // Mark attendance with latest snapshot
    const markAttendance = useCallback(async () => {
        if (!studentId || !studentName)
            return;
        const latest = snapshots[snapshots.length - 1];
        const face = latest?.faces?.[0];
        const { error } = await supabase.from('attendance').insert({
            student_id: studentId,
            student_name: studentName,
            at: new Date().toISOString(),
            emotion: face?.emotion ?? null,
            attention: face?.attention ?? null
        });
        if (error)
            alert(error.message);
    }, [snapshots, studentId, studentName]);
    // Auto attendance interval
    useEffect(() => {
        if (!autoAttendance || !studentId || !studentName)
            return;
        const id = setInterval(() => {
            markAttendance().catch(console.error);
        }, 30000);
        return () => clearInterval(id);
    }, [autoAttendance, studentId, studentName, markAttendance]);
    const csvData = useMemo(() => {
        return snapshots.flatMap(s => s.faces.map(f => ({
            timestamp: new Date(s.timestamp).toISOString(),
            emotion: f.emotion,
            confidence: f.confidence.toFixed(3),
            attention: f.attention.toFixed(3)
        })));
    }, [snapshots]);
    function exportCSV() {
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${studentId || 'student'}-history.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
    return (_jsxs("div", { className: "min-h-screen p-6 text-slate-900", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Edu Vision Dashboard" }), _jsxs("section", { className: "mt-4 grid gap-6 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-lg border bg-white p-4 shadow-sm", children: [_jsx("h2", { className: "mb-2 font-medium", children: "Camera" }), _jsxs("div", { className: "relative w-full", children: [_jsx("video", { ref: videoRef, className: "w-full rounded border", autoPlay: true, muted: true, playsInline: true }), _jsx("canvas", { ref: canvasRef, className: "pointer-events-none absolute left-0 top-0 h-full w-full" })] }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2", children: [_jsx("button", { className: "btn", disabled: !ready || streaming, onClick: startCamera, children: "Start" }), _jsx("button", { className: "btn", disabled: !streaming, onClick: stopCamera, children: "Stop" }), !ready && !modelError && _jsx("span", { className: "text-sm text-slate-500", children: "Loading models..." }), modelError && _jsx("span", { className: "text-sm text-red-600", children: modelError })] })] }), _jsxs("div", { className: "rounded-lg border bg-white p-4 shadow-sm", children: [_jsx("h2", { className: "mb-2 font-medium", children: "Student & Attendance" }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("input", { className: "input", placeholder: "Student ID", value: studentId, onChange: e => setStudentId(e.target.value) }), _jsx("input", { className: "input", placeholder: "Student Name", value: studentName, onChange: e => setStudentName(e.target.value) }), _jsxs("label", { className: "flex items-center gap-2 text-sm text-slate-600", children: [_jsx("input", { type: "checkbox", checked: autoAttendance, onChange: e => setAutoAttendance(e.target.checked) }), "Auto-mark attendance every 30s"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "btn", onClick: markAttendance, children: "Mark attendance" }), _jsx("button", { className: "btn-secondary", onClick: exportCSV, children: "Export CSV" })] })] })] })] }), _jsxs("section", { className: "mt-6 rounded-lg border bg-white p-4 shadow-sm", children: [_jsx("h2", { className: "mb-2 font-medium", children: "Live Readings" }), _jsx("div", { className: "grid grid-cols-1 gap-2 md:grid-cols-3", children: snapshots.slice(-6).reverse().map((s, i) => (_jsxs("div", { className: "rounded border p-3 text-sm", children: [_jsx("div", { className: "font-mono text-xs text-slate-500", children: new Date(s.timestamp).toLocaleTimeString() }), s.faces.slice(0, 3).map((f, idx) => (_jsxs("div", { className: "mt-1", children: [_jsxs("div", { children: ["Emotion: ", _jsx("b", { children: f.emotion }), " (", (f.confidence * 100).toFixed(1), "%)"] }), _jsxs("div", { children: ["Attention: ", _jsxs("b", { children: [(f.attention * 100).toFixed(0), "%"] })] })] }, idx))), s.faces.length === 0 && _jsx("div", { className: "text-slate-500", children: "No face" })] }, i))) })] }), _jsx("footer", { className: "mt-6 text-xs text-slate-500", children: "Realtime writes to emotion_stream when a student ID is set. CSV export stores local snapshots." })] }));
}
