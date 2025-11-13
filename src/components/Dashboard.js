import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
export default function Dashboard({ snapshots }) {
    const last = snapshots.slice(-120);
    const attentionTrend = useMemo(() => {
        const points = last.map(s => (s.faces[0]?.attention ?? 0));
        return {
            labels: points.map((_, i) => `${i}`),
            datasets: [{ label: 'Attention', data: points, borderColor: '#0ea5e9', tension: 0.2 }]
        };
    }, [last]);
    const emotionDist = useMemo(() => {
        const counts = {};
        last.forEach(s => s.faces.forEach(f => { counts[f.emotion] = (counts[f.emotion] || 0) + 1; }));
        const labels = Object.keys(counts);
        const data = labels.map(k => counts[k]);
        return { labels, datasets: [{ data, backgroundColor: ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa'] }] };
    }, [last]);
    const engagement = useMemo(() => {
        const avg = last.length ? (last.reduce((acc, s) => acc + (s.faces[0]?.engagement ?? 0), 0) / last.length) : 0;
        return Math.round(avg * 100);
    }, [last]);
    return (_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "rounded border p-3", children: [_jsx("div", { className: "mb-2 text-sm font-medium", children: "Attention trend (last ~120 frames)" }), _jsx(Line, { data: attentionTrend, options: { responsive: true, scales: { y: { min: 0, max: 1 } } } })] }), _jsxs("div", { className: "rounded border p-3", children: [_jsx("div", { className: "mb-2 text-sm font-medium", children: "Emotion distribution" }), _jsx(Doughnut, { data: emotionDist })] }), _jsxs("div", { className: "rounded border p-3 md:col-span-2", children: [_jsx("div", { className: "text-sm", children: "Live engagement level" }), _jsxs("div", { className: "mt-1 text-3xl font-semibold", children: [engagement, "%"] })] })] }));
}
