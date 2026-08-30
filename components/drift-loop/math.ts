export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

export function smoothstep(value: number) {
  const amount = clamp(value, 0, 1)

  return amount * amount * (3 - 2 * amount)
}

export function smootherstep(value: number) {
  const amount = clamp(value, 0, 1)

  return amount * amount * amount * (amount * (amount * 6 - 15) + 10)
}

export function cubicHermite(
  start: number,
  end: number,
  startSlope: number,
  endSlope: number,
  duration: number,
  amount: number
) {
  const amount2 = amount * amount
  const amount3 = amount2 * amount
  const startBlend = 2 * amount3 - 3 * amount2 + 1
  const startSlopeBlend = amount3 - 2 * amount2 + amount
  const endBlend = -2 * amount3 + 3 * amount2
  const endSlopeBlend = amount3 - amount2

  return (
    startBlend * start +
    startSlopeBlend * duration * startSlope +
    endBlend * end +
    endSlopeBlend * duration * endSlope
  )
}

export function getKeyframeSlope<T extends { phase: number }>(
  keyframes: T[],
  index: number,
  readValue: (keyframe: T) => number
) {
  const previous = keyframes[Math.max(0, index - 1)]
  const next = keyframes[Math.min(keyframes.length - 1, index + 1)]
  const duration = next.phase - previous.phase

  if (duration <= 0) {
    return 0
  }

  return (readValue(next) - readValue(previous)) / duration
}

export function sampleKeyframeValue<T extends { phase: number }>(
  keyframes: T[],
  phase: number,
  segmentIndex: number,
  readValue: (keyframe: T) => number
) {
  const start = keyframes[segmentIndex]
  const end = keyframes[segmentIndex + 1]
  const duration = end.phase - start.phase

  if (duration <= 0) {
    return readValue(start)
  }

  const amount = clamp((phase - start.phase) / duration, 0, 1)

  return cubicHermite(
    readValue(start),
    readValue(end),
    getKeyframeSlope(keyframes, segmentIndex, readValue),
    getKeyframeSlope(keyframes, segmentIndex + 1, readValue),
    duration,
    amount
  )
}

export function getKeyframeSegmentIndex<T extends { phase: number }>(
  keyframes: T[],
  phase: number
) {
  const segmentIndex = keyframes.findIndex((keyframe, index) => {
    const next = keyframes[index + 1]

    return next ? phase >= keyframe.phase && phase <= next.phase : false
  })

  return segmentIndex === -1 ? keyframes.length - 2 : segmentIndex
}

export function normalizeLoopPhase(phase: number) {
  const wrappedPhase = ((phase % 1) + 1) % 1

  if (wrappedPhase < 0.005 || wrappedPhase > 0.995) {
    return 0
  }

  return wrappedPhase
}

export function rotatePoint(x: number, y: number, angle: number) {
  const sin = Math.sin(angle)
  const cos = Math.cos(angle)

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  }
}
