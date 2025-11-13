import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs';
let modelsLoaded = false;
// Smoothing + quality configuration
let SMOOTH_ALPHA = 0; // 0 = off, closer to 1 = more smoothing
let QUALITY_MIN = 0; // 0 = off
const smoothStore = new Map();
export function configureEmotion(cfg) {
    if (cfg.smoothingAlpha !== undefined)
        SMOOTH_ALPHA = cfg.smoothingAlpha;
    if (cfg.qualityMin !== undefined)
        QUALITY_MIN = cfg.qualityMin;
}
export async function setupModels() {
    if (modelsLoaded)
        return;
    // Ensure the fastest backend where available
    try {
        await tf.setBackend('webgl');
    }
    catch { }
    await tf.ready();
    const BASES = ['/models'];
    let loaded = false;
    for (const base of BASES) {
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(base),
                faceapi.nets.ssdMobilenetv1.loadFromUri(base),
                faceapi.nets.faceExpressionNet.loadFromUri(base),
                faceapi.nets.faceLandmark68Net.loadFromUri(base),
                faceapi.nets.faceRecognitionNet.loadFromUri(base)
            ]);
            loaded = true;
            break;
        }
        catch (e) {
            // try next base
        }
    }
    if (!loaded)
        throw new Error('Failed to load face-api models');
    modelsLoaded = true;
}
const MIN_EMOTION_CONF = 0.45;
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function smoothExpressions(key, expr) {
    const incoming = { ...expr };
    if (SMOOTH_ALPHA <= 0)
        return incoming;
    const prev = smoothStore.get(key) || {};
    const out = {};
    for (const k of Object.keys(incoming)) {
        const p = prev[k] ?? incoming[k];
        out[k] = SMOOTH_ALPHA * p + (1 - SMOOTH_ALPHA) * incoming[k];
    }
    smoothStore.set(key, out);
    return out;
}
export async function analyzeFrame(video) {
    if (!modelsLoaded)
        return null;
    const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
        .withFaceLandmarks()
        .withFaceExpressions();
    if (!detections)
        return { emotion: 'no-face', confidence: 0, attention: 0, yaw: 0, pitch: 0, engagement: 0 };
    const box = detections.detection.box;
    const key = `${Math.round(box.x / 40)}-${Math.round(box.y / 40)}`;
    const expressions = smoothExpressions(key, detections.expressions);
    let top = { key: 'neutral', value: 0 };
    for (const [k, v] of Object.entries(expressions)) {
        if (v > top.value)
            top = { key: k, value: v };
    }
    const faceArea = box.width * box.height;
    const normAttention = clamp01(faceArea / (video.videoWidth * video.videoHeight / 6));
    if (top.value < MIN_EMOTION_CONF)
        top = { key: 'neutral', value: top.value };
    // very light-weight head pose proxy from landmarks (yaw/pitch normalized -1..1)
    const lm = detections.landmarks;
    const leftEye = lm.getLeftEye();
    const rightEye = lm.getRightEye();
    const nose = lm.getNose();
    const eyeMidX = (leftEye[0].x + rightEye[3].x) / 2;
    const eyeMidY = (leftEye[0].y + rightEye[3].y) / 2;
    const noseTip = nose[3];
    const yaw = clamp01((noseTip.x - eyeMidX) / (box.width / 2)) * (noseTip.x - eyeMidX >= 0 ? 1 : -1);
    const pitch = clamp01((eyeMidY - noseTip.y) / (box.height / 2)) * (eyeMidY - noseTip.y >= 0 ? 1 : -1);
    const positive = ['happy', 'surprised'];
    const neutralish = ['neutral'];
    const emotionScore = positive.includes(top.key) ? 1 : neutralish.includes(top.key) ? 0.6 : 0.3;
    const engagement = clamp01(0.7 * normAttention + 0.3 * emotionScore);
    const quality = clamp01(normAttention * (1 - 0.5 * Math.abs(yaw)) * (1 - 0.5 * Math.abs(pitch)));
    if (QUALITY_MIN > 0 && quality < QUALITY_MIN)
        return { emotion: 'no-face', confidence: 0, attention: 0, yaw: 0, pitch: 0, engagement: 0 };
    return { emotion: top.key, confidence: top.value, attention: normAttention, yaw, pitch, engagement };
}
export async function analyzeFrameMulti(video, opts) {
    if (!modelsLoaded)
        return [];
    const inputSize = opts?.inputSize ?? 192;
    const scoreThreshold = opts?.scoreThreshold ?? 0.4;
    const detections = await (opts?.detector === 'ssd'
        ? faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        : faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold }))).withFaceLandmarks().withFaceExpressions();
    if (!detections || detections.length === 0)
        return [];
    return detections.map(d => {
        const box = d.detection.box;
        const key = `${Math.round(box.x / 40)}-${Math.round(box.y / 40)}`;
        const expressions = smoothExpressions(key, d.expressions);
        let top = { key: 'neutral', value: 0 };
        for (const [k, v] of Object.entries(expressions)) {
            if (v > top.value)
                top = { key: k, value: v };
        }
        const faceArea = box.width * box.height;
        const minSize = 40 * 40;
        if (faceArea < minSize)
            return null; // skip tiny faces
        const normAttention = clamp01(faceArea / (video.videoWidth * video.videoHeight / 6));
        if (top.value < MIN_EMOTION_CONF)
            top = { key: 'neutral', value: top.value };
        const lm = d.landmarks;
        const leftEye = lm.getLeftEye();
        const rightEye = lm.getRightEye();
        const nose = lm.getNose();
        const eyeMidX = (leftEye[0].x + rightEye[3].x) / 2;
        const eyeMidY = (leftEye[0].y + rightEye[3].y) / 2;
        const noseTip = nose[3];
        const yaw = clamp01((noseTip.x - eyeMidX) / (box.width / 2)) * (noseTip.x - eyeMidX >= 0 ? 1 : -1);
        const pitch = clamp01((eyeMidY - noseTip.y) / (box.height / 2)) * (eyeMidY - noseTip.y >= 0 ? 1 : -1);
        const positive = ['happy', 'surprised'];
        const neutralish = ['neutral'];
        const emotionScore = positive.includes(top.key) ? 1 : neutralish.includes(top.key) ? 0.6 : 0.3;
        const engagement = clamp01(0.7 * normAttention + 0.3 * emotionScore);
        const quality = clamp01(normAttention * (1 - 0.5 * Math.abs(yaw)) * (1 - 0.5 * Math.abs(pitch)));
        if (QUALITY_MIN > 0 && quality < QUALITY_MIN)
            return null;
        return {
            emotion: top.key,
            confidence: top.value,
            attention: normAttention,
            yaw,
            pitch,
            engagement,
            box: { x: box.x, y: box.y, width: box.width, height: box.height }
        };
    }).filter(Boolean);
}
export async function analyzeFrameRecognize(video, opts) {
    if (!modelsLoaded)
        return [];
    const inputSize = opts?.inputSize ?? 192;
    const scoreThreshold = opts?.scoreThreshold ?? 0.4;
    const results = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold }))
        .withFaceLandmarks()
        .withFaceExpressions()
        .withFaceDescriptors();
    return results.map(r => {
        const box = r.detection.box;
        const key = `${Math.round(box.x / 40)}-${Math.round(box.y / 40)}`;
        const expressions = smoothExpressions(key, r.expressions);
        let top = { key: 'neutral', value: 0 };
        for (const [k, v] of Object.entries(expressions)) {
            if (v > top.value)
                top = { key: k, value: v };
        }
        const faceArea = box.width * box.height;
        const attention = clamp01(faceArea / (video.videoWidth * video.videoHeight / 6));
        if (top.value < MIN_EMOTION_CONF)
            top = { key: 'neutral', value: top.value };
        const lm = r.landmarks;
        const leftEye = lm.getLeftEye();
        const rightEye = lm.getRightEye();
        const nose = lm.getNose();
        const eyeMidX = (leftEye[0].x + rightEye[3].x) / 2;
        const eyeMidY = (leftEye[0].y + rightEye[3].y) / 2;
        const noseTip = nose[3];
        const yaw = clamp01((noseTip.x - eyeMidX) / (box.width / 2)) * (noseTip.x - eyeMidX >= 0 ? 1 : -1);
        const pitch = clamp01((eyeMidY - noseTip.y) / (box.height / 2)) * (eyeMidY - noseTip.y >= 0 ? 1 : -1);
        const positive = ['happy', 'surprised'];
        const neutralish = ['neutral'];
        const emotionScore = positive.includes(top.key) ? 1 : neutralish.includes(top.key) ? 0.6 : 0.3;
        const engagement = clamp01(0.7 * attention + 0.3 * emotionScore);
        const quality = clamp01(attention * (1 - 0.5 * Math.abs(yaw)) * (1 - 0.5 * Math.abs(pitch)));
        if (QUALITY_MIN > 0 && quality < QUALITY_MIN)
            return null;
        return {
            emotion: top.key,
            confidence: top.value,
            attention,
            yaw,
            pitch,
            engagement,
            box: { x: box.x, y: box.y, width: box.width, height: box.height },
            descriptor: r.descriptor
        };
    });
}
