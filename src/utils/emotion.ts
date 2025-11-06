import * as faceapi from 'face-api.js'
import * as tf from '@tensorflow/tfjs'

let modelsLoaded = false

export async function setupModels() {
  if (modelsLoaded) return
  // Ensure the fastest backend where available
  try { await tf.setBackend('webgl') } catch {}
  await tf.ready()

  const BASES = ['/models', 'https://cdn.jsdelivr.net/npm/face-api.js/models']
  let loaded = false
  for (const base of BASES) {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(base),
        faceapi.nets.faceExpressionNet.loadFromUri(base),
        faceapi.nets.faceLandmark68Net.loadFromUri(base),
        faceapi.nets.faceRecognitionNet.loadFromUri(base)
      ])
      loaded = true
      break
    } catch (e) {
      // try next base
    }
  }
  if (!loaded) throw new Error('Failed to load face-api models')
  modelsLoaded = true
}

export type FaceReading = {
  emotion: string
  confidence: number
  attention: number
  box: { x: number; y: number; width: number; height: number }
}

export type FaceWithDescriptor = FaceReading & { descriptor: Float32Array }

export async function analyzeFrame(video: HTMLVideoElement): Promise<{
  emotion: string,
  confidence: number,
  attention: number
} | null> {
  if (!modelsLoaded) return null
  const detections = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
    .withFaceExpressions()

  if (!detections) return { emotion: 'no-face', confidence: 0, attention: 0 }

  const expressions = detections.expressions
  let top: { key: string, value: number } = { key: 'neutral', value: 0 }
  for (const [k, v] of Object.entries(expressions)) {
    if (v > top.value) top = { key: k, value: v }
  }

  const box = detections.detection.box
  const faceArea = box.width * box.height
  const normAttention = Math.max(0, Math.min(1, faceArea / (video.videoWidth * video.videoHeight / 6)))

  return { emotion: top.key, confidence: top.value, attention: normAttention }
}

export async function analyzeFrameMulti(video: HTMLVideoElement, opts?: { inputSize?: number; scoreThreshold?: number }): Promise<FaceReading[]> {
  if (!modelsLoaded) return []
  const inputSize = opts?.inputSize ?? 192
  const scoreThreshold = opts?.scoreThreshold ?? 0.4
  const detections = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold }))
    .withFaceExpressions()

  if (!detections || detections.length === 0) return []

  return detections.map(d => {
    const expressions = d.expressions
    let top: { key: string, value: number } = { key: 'neutral', value: 0 }
    for (const [k, v] of Object.entries(expressions)) {
      if (v > top.value) top = { key: k, value: v }
    }
    const box = d.detection.box
    const faceArea = box.width * box.height
    const normAttention = Math.max(0, Math.min(1, faceArea / (video.videoWidth * video.videoHeight / 6)))
    return {
      emotion: top.key,
      confidence: top.value,
      attention: normAttention,
      box: { x: box.x, y: box.y, width: box.width, height: box.height }
    }
  })
}

export async function analyzeFrameRecognize(video: HTMLVideoElement, opts?: { inputSize?: number; scoreThreshold?: number }): Promise<FaceWithDescriptor[]> {
  if (!modelsLoaded) return []
  const inputSize = opts?.inputSize ?? 192
  const scoreThreshold = opts?.scoreThreshold ?? 0.4
  const results = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold }))
    .withFaceLandmarks()
    .withFaceExpressions()
    .withFaceDescriptors()

  return results.map(r => {
    const expressions = r.expressions
    let top: { key: string, value: number } = { key: 'neutral', value: 0 }
    for (const [k, v] of Object.entries(expressions)) {
      if (v > top.value) top = { key: k, value: v }
    }
    const box = r.detection.box
    const faceArea = box.width * box.height
    const attention = Math.max(0, Math.min(1, faceArea / (video.videoWidth * video.videoHeight / 6)))
    return {
      emotion: top.key,
      confidence: top.value,
      attention,
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      descriptor: r.descriptor
    }
  })
}
