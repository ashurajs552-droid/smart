import * as faceapi from 'face-api.js'

let modelsLoaded = false

export async function setupModels() {
  if (modelsLoaded) return
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js/models'
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
  ])
  modelsLoaded = true
}

export type FaceReading = {
  emotion: string
  confidence: number
  attention: number
  box: { x: number; y: number; width: number; height: number }
}

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

  // emotion with highest probability
  const expressions = detections.expressions
  let top: { key: string, value: number } = { key: 'neutral', value: 0 }
  for (const [k, v] of Object.entries(expressions)) {
    if (v > top.value) top = { key: k, value: v }
  }

  // naive attention proxy: larger face box => closer/attentive (normalized), ensure [0..1]
  const box = detections.detection.box
  const faceArea = box.width * box.height
  const normAttention = Math.max(0, Math.min(1, faceArea / (video.videoWidth * video.videoHeight / 6)))

  return { emotion: top.key, confidence: top.value, attention: normAttention }
}

export async function analyzeFrameMulti(video: HTMLVideoElement): Promise<FaceReading[]> {
  if (!modelsLoaded) return []
  const detections = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
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
