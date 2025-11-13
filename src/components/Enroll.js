import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import supabase from '../lib/supabaseClient';
import { analyzeFrameRecognize } from '../utils/emotion';
export default function Enroll({ videoRef }) {
    const [usn, setUsn] = useState('');
    const [name, setName] = useState('');
    const [descs, setDescs] = useState([]);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);
    async function captureOne() {
        setMsg(null);
        const v = videoRef.current;
        if (!v)
            return;
        const faces = await analyzeFrameRecognize(v, { inputSize: 160 });
        if (!faces.length) {
            setMsg('No face detected. Try again.');
            return;
        }
        const d = Array.from(faces[0].descriptor);
        setDescs(prev => [...prev, d]);
    }
    async function save() {
        if (!usn || !name) {
            setMsg('Enter USN and Name');
            return;
        }
        if (descs.length < 3) {
            setMsg('Capture at least 3 samples');
            return;
        }
        setSaving(true);
        setMsg(null);
        const { error } = await supabase.from('students').upsert({
            student_id: usn,
            student_name: name,
            descriptors: descs
        });
        setSaving(false);
        if (error)
            setMsg(error.message);
        else {
            setMsg('Saved!');
            setDescs([]);
        }
    }
    return (_jsxs("div", { className: "rounded-lg border bg-white p-4 shadow-sm", children: [_jsx("h2", { className: "mb-2 font-medium", children: "Enroll Student" }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("input", { className: "input", placeholder: "USN", value: usn, onChange: e => setUsn(e.target.value) }), _jsx("input", { className: "input", placeholder: "Name", value: name, onChange: e => setName(e.target.value) }), _jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("button", { className: "btn", onClick: captureOne, children: "Capture" }), _jsxs("span", { children: ["Samples: ", _jsx("b", { children: descs.length })] })] }), _jsx("button", { className: "btn", disabled: saving, onClick: save, children: saving ? 'Saving...' : 'Save to Supabase' }), msg && _jsx("div", { className: "text-xs text-slate-600", children: msg })] })] }));
}
