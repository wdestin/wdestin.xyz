import { sceneWidth } from './constants'
import { clamp, getKeyframeSegmentIndex, lerp, sampleKeyframeValue, smoothstep } from './math'
import type { ForegroundRailSample, MotionKeyframe, RoadControlPoint, RoadSample } from './types'

const roadControlPoints: RoadControlPoint[] = [
  { phase: 0, center: { x: -72, y: 174 }, roadWidth: 98, depthScale: 1.36 },
  { phase: 0.12, center: { x: -8, y: 163 }, roadWidth: 88, depthScale: 1.24 },
  { phase: 0.28, center: { x: 82, y: 145 }, roadWidth: 68, depthScale: 1.03 },
  { phase: 0.46, center: { x: 146, y: 126 }, roadWidth: 50, depthScale: 0.82 },
  { phase: 0.6, center: { x: 184, y: 114 }, roadWidth: 36, depthScale: 0.63 },
  { phase: 0.72, center: { x: 226, y: 105 }, roadWidth: 27, depthScale: 0.48 },
  { phase: 0.84, center: { x: 284, y: 100 }, roadWidth: 19, depthScale: 0.32 },
  { phase: 0.93, center: { x: 338, y: 102 }, roadWidth: 13, depthScale: 0.22 },
  { phase: 1, center: { x: 354, y: 103 }, roadWidth: 11, depthScale: 0.2 },
]

const motionKeyframes: MotionKeyframe[] = [
  {
    phase: 0,
    progress: 0,
    lateralOffset: 0,
    opacity: 0,
    driftLean: 0,
    glow: 0.12,
    slideLag: 0,
    smokeIntensity: 0,
  },
  {
    phase: 0.1,
    progress: 0.02,
    lateralOffset: 0.02,
    opacity: 0,
    driftLean: 0,
    glow: 0.2,
    slideLag: 0.02,
    smokeIntensity: 0,
  },
  {
    phase: 0.18,
    progress: 0.16,
    lateralOffset: 0.08,
    opacity: 1,
    driftLean: 0.16,
    glow: 0.82,
    slideLag: 0.08,
    smokeIntensity: 0.26,
  },
  {
    phase: 0.34,
    progress: 0.36,
    lateralOffset: 0.18,
    opacity: 1,
    driftLean: 0.62,
    glow: 0.96,
    slideLag: 0.22,
    smokeIntensity: 0.72,
  },
  {
    phase: 0.48,
    progress: 0.52,
    lateralOffset: 0.34,
    opacity: 1,
    driftLean: 1,
    glow: 1,
    slideLag: 0.33,
    smokeIntensity: 1,
  },
  {
    phase: 0.6,
    progress: 0.64,
    lateralOffset: 0.18,
    opacity: 0.96,
    driftLean: 0.56,
    glow: 0.72,
    slideLag: 0.19,
    smokeIntensity: 0.45,
  },
  {
    phase: 0.72,
    progress: 0.78,
    lateralOffset: 0.04,
    opacity: 0.74,
    driftLean: 0.18,
    glow: 0.34,
    slideLag: 0.08,
    smokeIntensity: 0.1,
  },
  {
    phase: 0.82,
    progress: 0.9,
    lateralOffset: 0,
    opacity: 0.32,
    driftLean: 0.04,
    glow: 0.16,
    slideLag: 0.03,
    smokeIntensity: 0,
  },
  {
    phase: 0.86,
    progress: 0.98,
    lateralOffset: 0,
    opacity: 0,
    driftLean: 0,
    glow: 0.12,
    slideLag: 0,
    smokeIntensity: 0,
  },
  {
    phase: 1,
    progress: 1,
    lateralOffset: 0,
    opacity: 0,
    driftLean: 0,
    glow: 0.12,
    slideLag: 0,
    smokeIntensity: 0,
  },
]

export function sampleMotionValue(phase: number, readValue: (keyframe: MotionKeyframe) => number) {
  return sampleKeyframeValue(
    motionKeyframes,
    phase,
    getKeyframeSegmentIndex(motionKeyframes, phase),
    readValue
  )
}

function sampleRoadValue(progress: number, readValue: (keyframe: RoadControlPoint) => number) {
  return sampleKeyframeValue(
    roadControlPoints,
    progress,
    getKeyframeSegmentIndex(roadControlPoints, progress),
    readValue
  )
}

function sampleRoadCenter(progress: number) {
  const clampedProgress = clamp(progress, 0, 1)

  return {
    x: sampleRoadValue(clampedProgress, (keyframe) => keyframe.center.x),
    y: sampleRoadValue(clampedProgress, (keyframe) => keyframe.center.y),
  }
}

export function sampleRoad(progress: number): RoadSample {
  const clampedProgress = clamp(progress, 0, 1)
  const center = sampleRoadCenter(clampedProgress)
  const previous = sampleRoadCenter(clamp(clampedProgress - 0.006, 0, 1))
  const next = sampleRoadCenter(clamp(clampedProgress + 0.006, 0, 1))
  const tangentLength = Math.hypot(next.x - previous.x, next.y - previous.y) || 1
  const tangent = {
    x: (next.x - previous.x) / tangentLength,
    y: (next.y - previous.y) / tangentLength,
  }
  const normal = {
    x: -tangent.y,
    y: tangent.x,
  }
  const roadWidth = sampleRoadValue(clampedProgress, (keyframe) => keyframe.roadWidth)
  const depthScale = sampleRoadValue(clampedProgress, (keyframe) => keyframe.depthScale)
  const halfWidth = roadWidth / 2

  return {
    center,
    depthScale,
    lowerEdge: {
      x: center.x + normal.x * halfWidth,
      y: center.y + normal.y * halfWidth,
    },
    normal,
    progress: clampedProgress,
    roadWidth,
    tangent,
    upperEdge: {
      x: center.x - normal.x * halfWidth,
      y: center.y - normal.y * halfWidth,
    },
  }
}

export function getRoadSamples(count = 32) {
  return Array.from({ length: count }, (_, index) => sampleRoad(index / (count - 1)))
}

export function sampleRoadOffset(progress: number, lateralOffset: number) {
  const road = sampleRoad(progress)

  return {
    x: road.center.x + road.normal.x * road.roadWidth * lateralOffset,
    y: road.center.y + road.normal.y * road.roadWidth * lateralOffset,
  }
}

export function getForegroundRailSamples(count = 28): ForegroundRailSample[] {
  return Array.from({ length: count }, (_, index) => {
    const amount = index / (count - 1)
    const progress = lerp(0.1, 0.9, amount)
    const road = sampleRoad(progress)
    const depth = road.depthScale
    const railOffset = 2 + depth * 3
    const foregroundDrop = 1 + depth * 2.5
    const foregroundLift = smoothstep((0.38 - progress) / 0.24) * (27 + depth * 13)

    return {
      depthScale: depth,
      normal: road.normal,
      point: {
        x: road.lowerEdge.x + road.normal.x * railOffset,
        y: road.lowerEdge.y + road.normal.y * railOffset + foregroundDrop - foregroundLift,
      },
      progress,
      tangent: road.tangent,
    }
  }).filter((sample) => sample.point.x > -34 && sample.point.x < sceneWidth + 34)
}
