import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { setupModels, analyzeFrame } from './utils/emotion';
import Papa from 'papaparse';
import './index.css';
import supabase from './lib/supabaseClient';
export default function App() {
    const videoRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [snapshots, setSnapshots] = useState([]);
    const [studentId, setStudentId] = useState('');
    const [studentName, setStudentName] = useState('');
    const [streaming, setStreaming] = useState(false);
    // Load models once
    useEffect(() => {
        setupModels().then(() => setReady(true)).catch(console.error);
    }, []);
    // Start webcam
    async function startCamera() {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setStreaming(true);
            loop();
        }
    }
    // Stop webcam
    function stopCamera() {
        if (videoRef.current?.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(t => t.stop());
            setStreaming(false);
        }
    }
    // Process frames
    async function loop() {
        if (!videoRef.current)
            return;
        const res = await analyzeFrame(videoRef.current);
        if (res) {
            setSnapshots(prev => [
                ...prev,
                {
                    timestamp: Date.now(),
                    emotion: res.emotion,
                    confidence: res.confidence,
                    attention: res.attention
                }
            ]);
            // upsert realtime row for live dashboard
            if (studentId) {
                await supabase.from('emotion_stream').upsert({
                    student_id: studentId,
                    at: new Date().toISOString(),
                    emotion: res.emotion,
                    confidence: res.confidence,
                    attention: res.attention
                });
            }
        }
        if (streaming)
            requestAnimationFrame(loop);
    }
    // Mark attendance with latest snapshot
    async function markAttendance() {
        if (!studentId || !studentName)
            return alert('Enter student id and name');
        const latest = snapshots[snapshots.length - 1];
        const { error } = await supabase.from('attendance').insert({
            student_id: studentId,
            student_name: studentName,
            at: new Date().toISOString(),
            emotion: latest?.emotion ?? null,
            attention: latest?.attention ?? null
        });
        if (error)
            alert(error.message);
        else
            alert('Attendance marked!');
    }
    const csvData = useMemo(() => {
        return snapshots.map(s => ({
            timestamp: new Date(s.timestamp).toISOString(),
            emotion: s.emotion,
            confidence: s.confidence.toFixed(3),
            attention: s.attention.toFixed(3)
        }));
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
    return (_jsxs("div", { className: "min-h-screen p-6 text-slate-900", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Edu Vision Dashboard" }), _jsxs("section", { className: "mt-4 grid gap-6 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-lg border bg-white p-4 shadow-sm", children: [_jsx("h2", { className: "mb-2 font-medium", children: "Camera" }), _jsx("video", { ref: videoRef, className: "w-full rounded border" }), _jsxs("div", { className: "mt-3 flex items-center gap-2", children: [_jsx("button", { className: "btn", disabled: !ready || streaming, onClick: startCamera, children: "Start" }), _jsx("button", { className: "btn", disabled: !streaming, onClick: stopCamera, children: "Stop" }), !ready && _jsx("span", { className: "text-sm text-slate-500", children: "Loading models..." })] })] }), _jsxs("div", { className: "rounded-lg border bg-white p-4 shadow-sm", children: [_jsx("h2", { className: "mb-2 font-medium", children: "Student & Attendance" }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("input", { className: "input", placeholder: "Student ID", value: studentId, onChange: e => setStudentId(e.target.value) }), _jsx("input", { className: "input", placeholder: "Student Name", value: studentName, onChange: e => setStudentName(e.target.value) }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "btn", onClick: markAttendance, children: "Mark attendance" }), _jsx("button", { className: "btn-secondary", onClick: exportCSV, children: "Export CSV" })] })] })] })] }), _jsxs("section", { className: "mt-6 rounded-lg border bg-white p-4 shadow-sm", children: [_jsx("h2", { className: "mb-2 font-medium", children: "Live Readings" }), _jsx("div", { className: "grid grid-cols-1 gap-2 md:grid-cols-3", children: snapshots.slice(-6).reverse().map((s, i) => (_jsxs("div", { className: "rounded border p-3 text-sm", children: [_jsx("div", { className: "font-mono text-xs text-slate-500", children: new Date(s.timestamp).toLocaleTimeString() }), _jsxs("div", { children: ["Emotion: ", _jsx("b", { children: s.emotion }), " (", (s.confidence * 100).toFixed(1), "%)"] }), _jsxs("div", { children: ["Attention: ", _jsxs("b", { children: [(s.attention * 100).toFixed(0), "%"] })] })] }, i))) })] }), _jsx("footer", { className: "mt-6 text-xs text-slate-500", children: "Connected to Supabase Realtime for live data; CSV export stores local snapshot. Hook up Supabase Storage to persist CSVs by user if desired." })] }));
}
