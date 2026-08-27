'use client'

import { useEffect, useRef } from 'react'

type DriftLoopOverlayProps = {
  onClose: () => void
}

const sceneWidth = 320
const sceneHeight = 180
const loopDurationMs = 10000
const reducedMotionLoopDurationMs = 20000

type Point = {
  x: number
  y: number
}

type CityLight = Point & {
  color: string
  phase: number
}

type SmokePuff = {
  layer: number
  offset: number
  radius: number
  tone: 'cool' | 'warm' | 'white'
  x: number
  y: number
}

type DriftState = {
  bodyRoll: number
  car: Point
  carAngle: number
  driftLean: number
  glow: number
  opacity: number
  phase: number
  scale: number
  smoke: Point
  smokeIntensity: number
  wheelFrame: number
}

type RouteKeyframe = {
  car: Point
  carAngle: number
  driftLean: number
  glow: number
  opacity: number
  phase: number
  scale: number
  smokeIntensity: number
}

type RoadGlint = Point & {
  length: number
  phase: number
  strength: number
}

type CarSpritePart = {
  alpha?: number
  angle?: number
  color: string
  height: number
  roll?: number
  width: number
  x: number
  y: number
}

type CarSpritePose = {
  parts: CarSpritePart[]
  sparkOffset: Point
}

const valleyLights: CityLight[] = [
  { x: 210, y: 74, color: '#f0c56d', phase: 0.1 },
  { x: 220, y: 70, color: '#8dd5df', phase: 0.6 },
  { x: 232, y: 76, color: '#ed9d62', phase: 0.4 },
  { x: 241, y: 71, color: '#d6e4a5', phase: 0.8 },
  { x: 254, y: 78, color: '#f0c56d', phase: 0.2 },
  { x: 267, y: 74, color: '#95e0ee', phase: 0.7 },
  { x: 281, y: 80, color: '#e5b05e', phase: 0.5 },
  { x: 294, y: 77, color: '#f4cf88', phase: 0.0 },
]

const foregroundTrees = [
  { x: 2, y: 90, h: 50 },
  { x: 16, y: 78, h: 68 },
  { x: 34, y: 91, h: 48 },
  { x: 292, y: 85, h: 55 },
  { x: 306, y: 72, h: 73 },
]

const farTrees = [
  { x: 4, y: 94, h: 28 },
  { x: 22, y: 88, h: 34 },
  { x: 48, y: 96, h: 24 },
  { x: 66, y: 91, h: 30 },
  { x: 278, y: 92, h: 31 },
  { x: 298, y: 88, h: 35 },
]

const wetRoadGlints: RoadGlint[] = [
  { x: 95, y: 150, length: 39, phase: 0.13, strength: 0.42 },
  { x: 126, y: 137, length: 47, phase: 0.61, strength: 0.34 },
  { x: 173, y: 123, length: 38, phase: 0.32, strength: 0.27 },
  { x: 198, y: 133, length: 43, phase: 0.75, strength: 0.3 },
  { x: 231, y: 146, length: 35, phase: 0.48, strength: 0.25 },
  { x: 78, y: 165, length: 54, phase: 0.85, strength: 0.2 },
]

const smokePuffs: SmokePuff[] = [
  { offset: 0.015, radius: 3.4, x: -4, y: 4, layer: 0, tone: 'white' },
  { offset: 0.03, radius: 4.2, x: -8, y: 6, layer: 1, tone: 'cool' },
  { offset: 0.055, radius: 5.6, x: -13, y: 8, layer: 2, tone: 'warm' },
  { offset: 0.08, radius: 6.2, x: -18, y: 11, layer: 0, tone: 'cool' },
  { offset: 0.11, radius: 7, x: -24, y: 13, layer: 1, tone: 'white' },
  { offset: 0.14, radius: 7.8, x: -30, y: 15, layer: 2, tone: 'cool' },
  { offset: 0.175, radius: 8.5, x: -38, y: 16, layer: 0, tone: 'warm' },
  { offset: 0.21, radius: 7.4, x: -45, y: 16, layer: 1, tone: 'cool' },
  { offset: 0.245, radius: 6.2, x: -52, y: 15, layer: 2, tone: 'white' },
]

const carSpritePoses: CarSpritePose[] = [
  {
    sparkOffset: { x: -9, y: 10 },
    parts: [
      { x: -2, y: 4, width: 42, height: 17, color: '#070910', alpha: 0.88 },
      { x: 0, y: 1, width: 40, height: 16, color: '#d5dad5' },
      { x: 11, y: -6, width: 17, height: 10, color: '#f4efdd' },
      { x: -10, y: 0, width: 14, height: 8, color: '#eef2ea' },
      { x: 8, y: -4, width: 15, height: 6, color: '#223146' },
      { x: 24, y: -3, width: 7, height: 6, color: '#2e415b' },
      { x: -15, y: 6, width: 11, height: 4, color: '#2c3038', roll: 0.35 },
      { x: 11, y: 7, width: 12, height: 4, color: '#2c3038', roll: -0.25 },
      { x: 17, y: -8, width: 5, height: 4, color: '#fff0a6', alpha: 0.96 },
      { x: 22, y: 0, width: 6, height: 4, color: '#ffe186', alpha: 0.96 },
      { x: -21, y: -4, width: 4, height: 4, color: '#ff3b55' },
      { x: -20, y: 5, width: 4, height: 4, color: '#e71f3b' },
      { x: -4, y: 10, width: 25, height: 2, color: '#151925', alpha: 0.78 },
      { x: -3, y: -9, width: 21, height: 2, color: '#fff7d9', alpha: 0.72 },
    ],
  },
  {
    sparkOffset: { x: -15, y: 10 },
    parts: [
      { x: -2, y: 6, width: 44, height: 18, color: '#070910', alpha: 0.9 },
      { x: 0, y: 1, width: 42, height: 16, color: '#dce0da', angle: -0.04 },
      { x: 10, y: -7, width: 18, height: 10, color: '#f6efde', angle: -0.03 },
      { x: -13, y: 2, width: 18, height: 8, color: '#f3f6ef', angle: 0.02 },
      { x: 7, y: -5, width: 16, height: 6, color: '#24354b' },
      { x: 23, y: -3, width: 8, height: 6, color: '#344b67' },
      { x: -18, y: 8, width: 13, height: 4, color: '#252932', roll: 0.55 },
      { x: 9, y: 9, width: 14, height: 4, color: '#252932', roll: -0.35 },
      { x: 17, y: -9, width: 5, height: 4, color: '#fff4ad', alpha: 0.96 },
      { x: 23, y: -1, width: 6, height: 4, color: '#ffdf72', alpha: 0.96 },
      { x: -23, y: -3, width: 5, height: 5, color: '#ff3551' },
      { x: -23, y: 7, width: 5, height: 5, color: '#e71b38' },
      { x: -6, y: 11, width: 27, height: 2, color: '#121723', alpha: 0.84 },
      { x: -6, y: -10, width: 24, height: 2, color: '#fff8dc', alpha: 0.76 },
      { x: 2, y: -12, width: 9, height: 1, color: '#8fcbd5', alpha: 0.5 },
    ],
  },
  {
    sparkOffset: { x: -13, y: 9 },
    parts: [
      { x: -2, y: 5, width: 41, height: 17, color: '#070910', alpha: 0.88 },
      { x: 0, y: 1, width: 39, height: 15, color: '#d7ddd7', angle: 0.03 },
      { x: 9, y: -6, width: 17, height: 9, color: '#f4eedc' },
      { x: -12, y: 2, width: 16, height: 7, color: '#eef2ea' },
      { x: 6, y: -4, width: 15, height: 6, color: '#223349' },
      { x: 21, y: -2, width: 8, height: 5, color: '#31465f' },
      { x: -17, y: 7, width: 12, height: 4, color: '#2a2e36', roll: 0.4 },
      { x: 8, y: 8, width: 13, height: 4, color: '#2a2e36', roll: -0.2 },
      { x: 16, y: -8, width: 5, height: 4, color: '#fff0a6', alpha: 0.95 },
      { x: 21, y: 0, width: 5, height: 4, color: '#ffe087', alpha: 0.95 },
      { x: -22, y: -3, width: 4, height: 4, color: '#fa3654' },
      { x: -21, y: 6, width: 4, height: 4, color: '#e71d3a' },
      { x: -6, y: 10, width: 25, height: 2, color: '#141925', alpha: 0.8 },
      { x: -4, y: -9, width: 21, height: 2, color: '#fff7d8', alpha: 0.7 },
    ],
  },
  {
    sparkOffset: { x: -10, y: 8 },
    parts: [
      { x: -1, y: 4, width: 36, height: 15, color: '#070910', alpha: 0.84 },
      { x: 0, y: 0, width: 35, height: 14, color: '#d3dad6' },
      { x: 8, y: -5, width: 14, height: 8, color: '#f1ecd9' },
      { x: -10, y: 1, width: 14, height: 6, color: '#edf2eb' },
      { x: 5, y: -4, width: 12, height: 5, color: '#223247' },
      { x: 18, y: -2, width: 7, height: 5, color: '#2c4159' },
      { x: -16, y: 6, width: 10, height: 3, color: '#2a2e36', roll: 0.25 },
      { x: 6, y: 7, width: 11, height: 3, color: '#2a2e36', roll: -0.15 },
      { x: 14, y: -7, width: 4, height: 3, color: '#fff0a6', alpha: 0.92 },
      { x: 19, y: 0, width: 5, height: 3, color: '#ffe087', alpha: 0.92 },
      { x: -19, y: -3, width: 4, height: 4, color: '#fa3654' },
      { x: -19, y: 5, width: 4, height: 4, color: '#e71d3a' },
      { x: -5, y: 9, width: 21, height: 2, color: '#141925', alpha: 0.72 },
      { x: -4, y: -8, width: 17, height: 2, color: '#fff7d8', alpha: 0.66 },
    ],
  },
]

const routeKeyframes: RouteKeyframe[] = [
  {
    phase: 0,
    car: { x: -64, y: 172 },
    carAngle: -0.3,
    scale: 1.42,
    opacity: 0,
    driftLean: 0,
    glow: 0.15,
    smokeIntensity: 0,
  },
  {
    phase: 0.07,
    car: { x: -45, y: 169 },
    carAngle: -0.31,
    scale: 1.38,
    opacity: 0,
    driftLean: 0,
    glow: 0.25,
    smokeIntensity: 0,
  },
  {
    phase: 0.12,
    car: { x: 8, y: 162 },
    carAngle: -0.36,
    scale: 1.32,
    opacity: 0.95,
    driftLean: 0.08,
    glow: 0.82,
    smokeIntensity: 0.25,
  },
  {
    phase: 0.25,
    car: { x: 82, y: 145 },
    carAngle: -0.32,
    scale: 1.12,
    opacity: 1,
    driftLean: 0.42,
    glow: 0.92,
    smokeIntensity: 0.68,
  },
  {
    phase: 0.42,
    car: { x: 144, y: 126 },
    carAngle: -0.24,
    scale: 0.96,
    opacity: 1,
    driftLean: 1,
    glow: 1,
    smokeIntensity: 1,
  },
  {
    phase: 0.56,
    car: { x: 178, y: 116 },
    carAngle: -0.16,
    scale: 0.82,
    opacity: 1,
    driftLean: 0.82,
    glow: 0.92,
    smokeIntensity: 0.74,
  },
  {
    phase: 0.68,
    car: { x: 234, y: 127 },
    carAngle: 0.02,
    scale: 0.94,
    opacity: 1,
    driftLean: 0.36,
    glow: 0.72,
    smokeIntensity: 0.44,
  },
  {
    phase: 0.8,
    car: { x: 318, y: 146 },
    carAngle: 0.3,
    scale: 1.14,
    opacity: 0.9,
    driftLean: 0.1,
    glow: 0.7,
    smokeIntensity: 0.18,
  },
  {
    phase: 0.9,
    car: { x: 380, y: 163 },
    carAngle: 0.44,
    scale: 1.28,
    opacity: 0,
    driftLean: 0,
    glow: 0.18,
    smokeIntensity: 0,
  },
  {
    phase: 1,
    car: { x: 380, y: 163 },
    carAngle: 0.44,
    scale: 1.28,
    opacity: 0,
    driftLean: 0,
    glow: 0.15,
    smokeIntensity: 0,
  },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

function smoothstep(value: number) {
  const amount = clamp(value, 0, 1)

  return amount * amount * (3 - 2 * amount)
}

function pixelRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
) {
  context.fillStyle = color
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height))
}

function pixelLine(
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 1
) {
  context.strokeStyle = color
  context.lineWidth = width
  context.beginPath()
  context.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5)
  context.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5)
  context.stroke()
}

function tracePolygon(context: CanvasRenderingContext2D, points: Point[]) {
  context.beginPath()
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(Math.round(point.x), Math.round(point.y))
      return
    }

    context.lineTo(Math.round(point.x), Math.round(point.y))
  })
  context.closePath()
}

function fillPolygon(context: CanvasRenderingContext2D, points: Point[], color: string) {
  context.fillStyle = color
  tracePolygon(context, points)
  context.fill()
}

function strokePolyline(
  context: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  width = 1,
  closed = false
) {
  context.strokeStyle = color
  context.lineWidth = width
  context.beginPath()
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(Math.round(point.x) + 0.5, Math.round(point.y) + 0.5)
      return
    }

    context.lineTo(Math.round(point.x) + 0.5, Math.round(point.y) + 0.5)
  })

  if (closed) {
    context.closePath()
  }

  context.stroke()
}

function drawPixelCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string
) {
  const centerX = Math.round(x)
  const centerY = Math.round(y)
  const roundedRadius = Math.round(radius)

  context.fillStyle = color

  for (let row = -roundedRadius; row <= roundedRadius; row += 1) {
    const span = Math.floor(Math.sqrt(roundedRadius * roundedRadius - row * row))
    context.fillRect(centerX - span, centerY + row, span * 2 + 1, 1)
  }
}

function rotatePoint(x: number, y: number, angle: number) {
  const sin = Math.sin(angle)
  const cos = Math.cos(angle)

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  }
}

function drawRotatedRect(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  angle: number,
  color: string
) {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const corners = [
    rotatePoint(-halfWidth, -halfHeight, angle),
    rotatePoint(halfWidth, -halfHeight, angle),
    rotatePoint(halfWidth, halfHeight, angle),
    rotatePoint(-halfWidth, halfHeight, angle),
  ].map((point) => ({
    x: point.x + centerX,
    y: point.y + centerY,
  }))

  fillPolygon(context, corners, color)
}

function sampleSmokePoint(state: Pick<DriftState, 'car' | 'carAngle' | 'scale'>) {
  const rearWheel = rotatePoint(-16 * state.scale, 8 * state.scale, state.carAngle)

  return {
    x: state.car.x + rearWheel.x,
    y: state.car.y + rearWheel.y,
  }
}

function getBodyRoll(phase: number, driftLean: number) {
  return Math.sin(phase * Math.PI * 8 + 0.55) * driftLean * 1.2
}

function getWheelFrame(phase: number) {
  return Math.floor(phase * 96) % 2
}

function getDriftState(phase: number): DriftState {
  const routePhase = clamp(phase, 0, 1)
  const lastKeyframe = routeKeyframes[routeKeyframes.length - 1]
  const start = routeKeyframes.find((keyframe, index) => {
    const next = routeKeyframes[index + 1]

    return next ? routePhase >= keyframe.phase && routePhase <= next.phase : false
  })

  if (!start) {
    const smoke = sampleSmokePoint(lastKeyframe)

    return {
      ...lastKeyframe,
      bodyRoll: 0,
      phase: routePhase,
      smoke,
      wheelFrame: 0,
    }
  }

  const end = routeKeyframes[routeKeyframes.indexOf(start) + 1]
  const amount = smoothstep((routePhase - start.phase) / (end.phase - start.phase))
  const driftLean = lerp(start.driftLean, end.driftLean, amount)
  const driftSway =
    Math.sin(routePhase * Math.PI * 2) * 2.2 * lerp(start.driftLean, end.driftLean, amount)
  const state: DriftState = {
    bodyRoll: getBodyRoll(routePhase, driftLean),
    car: {
      x: lerp(start.car.x, end.car.x, amount),
      y: lerp(start.car.y, end.car.y, amount) + driftSway,
    },
    carAngle: lerp(start.carAngle, end.carAngle, amount),
    driftLean,
    glow: lerp(start.glow, end.glow, amount) + Math.sin(routePhase * Math.PI * 10) * 0.05,
    opacity: lerp(start.opacity, end.opacity, amount),
    phase: routePhase,
    scale: lerp(start.scale, end.scale, amount),
    smoke: { x: 0, y: 0 },
    smokeIntensity: lerp(start.smokeIntensity, end.smokeIntensity, amount),
    wheelFrame: getWheelFrame(routePhase),
  }

  return {
    ...state,
    smoke: sampleSmokePoint(state),
  }
}

function drawSky(context: CanvasRenderingContext2D, phase: number) {
  pixelRect(context, 0, 0, sceneWidth, sceneHeight, '#050713')
  pixelRect(context, 0, 34, sceneWidth, 51, '#081020')

  fillPolygon(
    context,
    [
      { x: 0, y: 79 },
      { x: 21, y: 61 },
      { x: 47, y: 73 },
      { x: 73, y: 51 },
      { x: 103, y: 78 },
      { x: 136, y: 58 },
      { x: 174, y: 80 },
      { x: 205, y: 54 },
      { x: 248, y: 76 },
      { x: 280, y: 58 },
      { x: 320, y: 74 },
      { x: 320, y: 104 },
      { x: 0, y: 104 },
    ],
    '#10152b'
  )
  fillPolygon(
    context,
    [
      { x: 0, y: 90 },
      { x: 39, y: 73 },
      { x: 83, y: 92 },
      { x: 126, y: 70 },
      { x: 165, y: 94 },
      { x: 207, y: 75 },
      { x: 252, y: 94 },
      { x: 320, y: 78 },
      { x: 320, y: 111 },
      { x: 0, y: 111 },
    ],
    '#131d2a'
  )

  valleyLights.forEach((light) => {
    const twinkle = 0.45 + 0.55 * Math.sin((phase + light.phase) * Math.PI * 2)
    pixelRect(context, light.x, light.y, twinkle > 0.45 ? 2 : 1, 1, light.color)
    if (twinkle > 0.82) {
      pixelRect(context, light.x - 1, light.y, 1, 1, '#fff4bc')
    }
  })
}

function drawTrees(context: CanvasRenderingContext2D, phase: number) {
  farTrees.forEach((tree, index) => {
    const sway = Math.round(Math.sin(phase * Math.PI * 2 + index) * 1)
    fillPolygon(
      context,
      [
        { x: tree.x + sway, y: tree.y - tree.h },
        { x: tree.x - 9 + sway, y: tree.y },
        { x: tree.x + 9 + sway, y: tree.y },
      ],
      '#0d2424'
    )
    pixelRect(context, tree.x - 1 + sway, tree.y - 8, 2, 12, '#081817')
  })

  foregroundTrees.forEach((tree, index) => {
    const sway = Math.round(Math.sin(phase * Math.PI * 2 + index * 0.7) * 1)
    fillPolygon(
      context,
      [
        { x: tree.x + sway, y: tree.y - tree.h },
        { x: tree.x - 17 + sway, y: tree.y + 12 },
        { x: tree.x + 17 + sway, y: tree.y + 12 },
      ],
      '#071715'
    )
    fillPolygon(
      context,
      [
        { x: tree.x + sway, y: tree.y - tree.h + 16 },
        { x: tree.x - 22 + sway, y: tree.y + 18 },
        { x: tree.x + 22 + sway, y: tree.y + 18 },
      ],
      '#0b221d'
    )
    pixelRect(context, tree.x - 2 + sway, tree.y - 11, 4, 28, '#05100f')
  })
}

function drawRoad(context: CanvasRenderingContext2D, phase: number) {
  fillPolygon(
    context,
    [
      { x: 0, y: 180 },
      { x: 0, y: 149 },
      { x: 57, y: 125 },
      { x: 111, y: 105 },
      { x: 156, y: 91 },
      { x: 204, y: 88 },
      { x: 252, y: 98 },
      { x: 320, y: 123 },
      { x: 320, y: 180 },
    ],
    '#202738'
  )
  fillPolygon(
    context,
    [
      { x: 0, y: 180 },
      { x: 0, y: 160 },
      { x: 68, y: 133 },
      { x: 129, y: 112 },
      { x: 173, y: 101 },
      { x: 213, y: 101 },
      { x: 266, y: 113 },
      { x: 320, y: 134 },
      { x: 320, y: 180 },
    ],
    '#171d2c'
  )

  strokePolyline(
    context,
    [
      { x: 3, y: 153 },
      { x: 58, y: 130 },
      { x: 117, y: 109 },
      { x: 160, y: 97 },
      { x: 205, y: 95 },
      { x: 256, y: 106 },
      { x: 320, y: 129 },
    ],
    '#394458',
    3
  )
  strokePolyline(
    context,
    [
      { x: 2, y: 164 },
      { x: 72, y: 137 },
      { x: 136, y: 116 },
      { x: 176, y: 107 },
      { x: 214, y: 108 },
      { x: 269, y: 120 },
      { x: 320, y: 139 },
    ],
    '#4a5264',
    1
  )

  for (let dash = 0; dash < 9; dash += 1) {
    const travel = (dash + 0.45) / 9
    const shimmer = Math.sin((phase + dash / 9) * Math.PI * 2)
    const y = 171 - travel * 70
    const x = 45 + travel * 187 + Math.sin(travel * Math.PI) * 30 + shimmer * 1.4
    const dashWidth = 10 - travel * 6
    const color = travel > 0.56 ? '#5f6674' : '#848b93'

    pixelLine(context, x, y + shimmer * 0.4, x + dashWidth, y - 2, color, travel > 0.35 ? 1 : 2)
  }

  strokePolyline(
    context,
    [
      { x: 25, y: 171 },
      { x: 78, y: 149 },
      { x: 125, y: 132 },
      { x: 160, y: 121 },
    ],
    'rgba(7, 10, 18, 0.48)',
    2
  )
  strokePolyline(
    context,
    [
      { x: 45, y: 169 },
      { x: 100, y: 146 },
      { x: 148, y: 127 },
      { x: 182, y: 116 },
    ],
    'rgba(54, 64, 80, 0.42)',
    1
  )

  wetRoadGlints.forEach((glint) => {
    const shimmer = 0.5 + 0.5 * Math.sin((phase + glint.phase) * Math.PI * 2)
    const alpha = 0.09 + shimmer * glint.strength

    pixelLine(
      context,
      glint.x,
      glint.y,
      glint.x + glint.length,
      glint.y - Math.max(1, Math.round(glint.length / 28)),
      `rgba(166, 184, 197, ${alpha})`,
      1
    )
    if (shimmer > 0.76) {
      pixelRect(context, glint.x + glint.length * 0.44, glint.y - 1, 9, 1, '#d8e3e3')
    }
  })

  const roadHighlight = 0.4 + 0.3 * Math.sin(phase * Math.PI * 2)
  pixelRect(context, 101, 132, 63, 2, `rgba(146, 170, 187, ${roadHighlight})`)
  pixelRect(context, 179, 110, 48, 1, 'rgba(170, 180, 181, 0.28)')
}

function drawGuardrails(context: CanvasRenderingContext2D, phase: number) {
  const shine = 0.5 + 0.45 * Math.sin(phase * Math.PI * 2)

  strokePolyline(
    context,
    [
      { x: 0, y: 138 },
      { x: 49, y: 118 },
      { x: 96, y: 103 },
      { x: 137, y: 94 },
      { x: 178, y: 91 },
      { x: 222, y: 97 },
      { x: 276, y: 113 },
      { x: 320, y: 128 },
    ],
    '#96a0a9',
    2
  )
  strokePolyline(
    context,
    [
      { x: 0, y: 143 },
      { x: 49, y: 122 },
      { x: 96, y: 107 },
      { x: 137, y: 99 },
      { x: 178, y: 96 },
      { x: 222, y: 102 },
      { x: 276, y: 118 },
      { x: 320, y: 133 },
    ],
    `rgba(208, 220, 222, ${shine})`,
    1
  )

  for (let index = 0; index < 11; index += 1) {
    const t = index / 10
    const x = t * 320
    const y = 140 - Math.sin(t * Math.PI) * 48 + t * 4

    pixelLine(context, x, y, x - 1, y + 11, '#52606a', 1)
  }
}

function drawForegroundGuardrail(context: CanvasRenderingContext2D, phase: number) {
  const shine = 0.38 + 0.36 * Math.sin((phase + 0.21) * Math.PI * 2)

  strokePolyline(
    context,
    [
      { x: 0, y: 184 },
      { x: 62, y: 160 },
      { x: 126, y: 141 },
      { x: 183, y: 134 },
      { x: 245, y: 146 },
      { x: 320, y: 171 },
    ],
    'rgba(4, 7, 14, 0.82)',
    4
  )
  strokePolyline(
    context,
    [
      { x: 0, y: 181 },
      { x: 62, y: 157 },
      { x: 126, y: 138 },
      { x: 183, y: 131 },
      { x: 245, y: 143 },
      { x: 320, y: 168 },
    ],
    '#65717e',
    2
  )
  strokePolyline(
    context,
    [
      { x: 0, y: 179 },
      { x: 62, y: 155 },
      { x: 126, y: 136 },
      { x: 183, y: 129 },
      { x: 245, y: 141 },
      { x: 320, y: 166 },
    ],
    `rgba(218, 226, 224, ${shine})`,
    1
  )

  for (let index = 0; index < 8; index += 1) {
    const t = index / 7
    const x = lerp(9, 306, t)
    const y = 181 - Math.sin(t * Math.PI) * 47 + t * 6

    pixelLine(context, x, y, x - 1, y + 16 + t * 7, '#303b49', 2)
    pixelLine(context, x + 1, y + 1, x, y + 13 + t * 6, '#7e8a92', 1)
  }
}

function drawFog(context: CanvasRenderingContext2D, phase: number, reducedMotion: boolean) {
  const drift = reducedMotion ? 0.25 : 1

  for (let band = 0; band < 3; band += 1) {
    const loop = phase * Math.PI * 2
    const x = 24 + band * 110 + Math.sin(loop + band * 1.7) * 18 * drift
    const y = 72 + band * 18 + Math.sin(loop + band * 0.9) * 2 * drift
    const alpha = 0.08 + band * 0.025

    context.fillStyle = `rgba(169, 190, 202, ${alpha})`
    context.fillRect(Math.round(x), Math.round(y), 75, 1)
    context.fillRect(Math.round(x + 19), Math.round(y + 3), 94, 1)
    context.fillRect(Math.round(x - 28), Math.round(y + 6), 50, 1)
  }
}

function traceRoadSurfaceClip(context: CanvasRenderingContext2D) {
  tracePolygon(context, [
    { x: 0, y: 180 },
    { x: 0, y: 149 },
    { x: 57, y: 125 },
    { x: 111, y: 105 },
    { x: 156, y: 91 },
    { x: 204, y: 88 },
    { x: 252, y: 98 },
    { x: 320, y: 123 },
    { x: 320, y: 180 },
  ])
}

function drawHeadlights(context: CanvasRenderingContext2D, state: DriftState) {
  if (state.opacity <= 0.03) {
    return
  }

  const scale = Math.max(0.45, state.scale)
  const startLeft = rotatePoint(14 * state.scale, -4 * state.scale, state.carAngle)
  const startRight = rotatePoint(14 * state.scale, 4 * state.scale, state.carAngle)
  const beamTip = rotatePoint(
    (86 + state.driftLean * 20) * scale,
    -2 * scale,
    state.carAngle + 0.18
  )
  const sideTip = rotatePoint(63 * scale, (18 + state.driftLean * 8) * scale, state.carAngle + 0.04)
  const alpha = (0.13 + state.glow * 0.12) * state.opacity

  context.save()
  traceRoadSurfaceClip(context)
  context.clip()
  fillPolygon(
    context,
    [
      { x: state.car.x + startLeft.x, y: state.car.y + startLeft.y },
      { x: state.car.x + beamTip.x, y: state.car.y + beamTip.y },
      { x: state.car.x + sideTip.x, y: state.car.y + sideTip.y },
      { x: state.car.x + startRight.x, y: state.car.y + startRight.y },
    ],
    `rgba(248, 226, 153, ${alpha})`
  )
  fillPolygon(
    context,
    [
      { x: state.car.x + startLeft.x, y: state.car.y + startLeft.y },
      { x: state.car.x + beamTip.x * 0.66, y: state.car.y + beamTip.y * 0.66 },
      { x: state.car.x + sideTip.x * 0.52, y: state.car.y + sideTip.y * 0.52 },
      { x: state.car.x + startRight.x, y: state.car.y + startRight.y },
    ],
    `rgba(255, 239, 182, ${alpha * 0.85})`
  )

  const roadSweep = rotatePoint(46 * scale, (17 + state.bodyRoll) * scale, state.carAngle + 0.16)
  const reflection = rotatePoint(
    72 * scale,
    (24 + state.driftLean * 7) * scale,
    state.carAngle + 0.12
  )

  pixelLine(
    context,
    state.car.x + roadSweep.x,
    state.car.y + roadSweep.y,
    state.car.x + reflection.x,
    state.car.y + reflection.y,
    `rgba(255, 240, 178, ${alpha * 0.72})`,
    Math.max(1, Math.round(scale))
  )
  pixelLine(
    context,
    state.car.x + roadSweep.x - 9 * scale,
    state.car.y + roadSweep.y + 6 * scale,
    state.car.x + reflection.x - 21 * scale,
    state.car.y + reflection.y + 7 * scale,
    `rgba(175, 183, 172, ${alpha * 0.44})`,
    1
  )
  context.restore()
}

function drawSmoke(context: CanvasRenderingContext2D, phase: number, state: DriftState) {
  const resetFade = phase < 0.9 ? 1 : clamp(1 - (phase - 0.9) / 0.07, 0, 1)

  if (phase < 0.08 || resetFade <= 0 || state.smokeIntensity <= 0.02) {
    return
  }

  smokePuffs.forEach((puff, index) => {
    const samplePhase = phase - puff.offset

    if (samplePhase < 0.08 || samplePhase > 0.9) {
      return
    }

    const trailState = getDriftState(samplePhase)
    const ageFade = clamp(1 - puff.offset / 0.23, 0, 1)
    const intensity = trailState.smokeIntensity * resetFade * ageFade

    if (intensity <= 0.02) {
      return
    }

    const trailScale = clamp(trailState.scale, 0.55, 1.18)
    const wind = Math.sin((phase + index * 0.17) * Math.PI * 2 + puff.layer * 0.9)
    const lift = Math.cos((phase + index * 0.13) * Math.PI * 2 + puff.layer * 0.7)
    const driftX = (puff.x - puff.offset * 82 + wind * (2.4 + puff.layer)) * trailScale
    const driftY =
      (puff.y + puff.offset * 52 + lift * (1.2 + puff.layer * 0.5) - puff.layer * 1.5) * trailScale
    const alpha =
      (0.035 + ageFade * 0.15) * trailState.smokeIntensity * resetFade * (1 - puff.layer * 0.06)
    const radius = (puff.radius + puff.offset * 28 + puff.layer * 0.7) * trailScale
    const tone =
      puff.tone === 'warm'
        ? '185, 178, 168'
        : puff.tone === 'white'
          ? '214, 219, 218'
          : '158, 171, 185'

    drawPixelCircle(
      context,
      trailState.smoke.x + driftX,
      trailState.smoke.y + driftY,
      radius,
      `rgba(${tone}, ${alpha})`
    )
    drawPixelCircle(
      context,
      trailState.smoke.x + driftX + radius * 0.38,
      trailState.smoke.y + driftY - radius * 0.2,
      radius * 0.56,
      `rgba(224, 229, 226, ${alpha * 0.36})`
    )
    pixelRect(
      context,
      trailState.smoke.x + driftX - radius,
      trailState.smoke.y + driftY + radius * 0.45,
      radius * 2.2,
      1,
      `rgba(221, 225, 223, ${alpha * 0.64})`
    )
  })
}

function drawTaillightStreaks(context: CanvasRenderingContext2D, phase: number, state: DriftState) {
  const resetFade = phase < 0.86 ? 1 : clamp(1 - (phase - 0.86) / 0.065, 0, 1)

  if (phase < 0.08 || resetFade <= 0) {
    return
  }

  const samples = [0, 0.025, 0.05, 0.078]

  samples.forEach((offset, index) => {
    const samplePhase = phase - offset

    if (samplePhase < 0.08 || samplePhase > 0.9) {
      return
    }

    const trailState = index === 0 ? state : getDriftState(samplePhase)
    const fade = trailState.opacity * resetFade * (1 - index * 0.2)

    if (fade <= 0.03) {
      return
    }

    const alpha = (0.2 + trailState.driftLean * 0.42) * fade
    const scale = trailState.scale
    const rear = rotatePoint(-17 * scale, 0, trailState.carAngle)
    const tail = rotatePoint(
      (-36 - trailState.driftLean * 18 - index * 8) * scale,
      -1 * scale,
      trailState.carAngle + 0.04
    )
    const lineWidth = Math.max(1, Math.round((2 - index * 0.22) * scale))

    pixelLine(
      context,
      trailState.car.x + rear.x - 1,
      trailState.car.y + rear.y - 3 * scale,
      trailState.car.x + tail.x,
      trailState.car.y + tail.y - 5 * scale,
      `rgba(255, 65, 84, ${alpha})`,
      lineWidth
    )
    pixelLine(
      context,
      trailState.car.x + rear.x - 1,
      trailState.car.y + rear.y + 4 * scale,
      trailState.car.x + tail.x - 3 * scale,
      trailState.car.y + tail.y + 4 * scale,
      `rgba(255, 29, 58, ${alpha * 0.84})`,
      lineWidth
    )
  })
}

function drawCarPart(
  context: CanvasRenderingContext2D,
  state: DriftState,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
  color: string,
  alpha = 1,
  angleOffset = 0
) {
  const offset = rotatePoint(offsetX * state.scale, offsetY * state.scale, state.carAngle)

  context.save()
  context.globalAlpha = context.globalAlpha * alpha
  drawRotatedRect(
    context,
    state.car.x + offset.x,
    state.car.y + offset.y,
    width * state.scale,
    height * state.scale,
    state.carAngle + angleOffset,
    color
  )
  context.restore()
}

function getCarSpritePose(phase: number) {
  if (phase < 0.27) {
    return carSpritePoses[0]
  }

  if (phase < 0.57) {
    return carSpritePoses[1]
  }

  if (phase < 0.74) {
    return carSpritePoses[2]
  }

  return carSpritePoses[3]
}

function drawCarSpritePart(
  context: CanvasRenderingContext2D,
  state: DriftState,
  part: CarSpritePart
) {
  const rollOffset = state.bodyRoll * (part.roll ?? 0)

  drawCarPart(
    context,
    state,
    part.x,
    part.y + rollOffset,
    part.width,
    part.height,
    part.color,
    part.alpha ?? 1,
    part.angle ?? 0
  )
}

function drawWheelFlicker(
  context: CanvasRenderingContext2D,
  state: DriftState,
  pose: CarSpritePose
) {
  const flickerColor = state.wheelFrame === 0 ? '#d8dee0' : '#596170'
  const sparkAlpha = clamp((state.driftLean - 0.35) * 1.25, 0, 0.55) * state.opacity

  drawCarPart(context, state, -17, 8 + state.bodyRoll * 0.25, 5, 1, flickerColor, 0.62)
  drawCarPart(context, state, 10, 9 - state.bodyRoll * 0.2, 5, 1, flickerColor, 0.54)

  if (sparkAlpha <= 0.03) {
    return
  }

  drawCarPart(
    context,
    state,
    pose.sparkOffset.x,
    pose.sparkOffset.y,
    state.wheelFrame === 0 ? 4 : 2,
    1,
    '#ffd16b',
    sparkAlpha,
    -0.18
  )
  drawCarPart(
    context,
    state,
    pose.sparkOffset.x - 5,
    pose.sparkOffset.y + 2,
    3,
    1,
    '#ff8d54',
    sparkAlpha * 0.62,
    -0.2
  )
}

function drawCar(context: CanvasRenderingContext2D, state: DriftState) {
  if (state.opacity <= 0.03) {
    return
  }

  const pose = getCarSpritePose(state.phase)

  context.save()
  context.globalAlpha = context.globalAlpha * state.opacity
  pose.parts.forEach((part) => {
    drawCarSpritePart(context, state, part)
  })
  drawWheelFlicker(context, state, pose)
  context.restore()
}

function drawScanlines(context: CanvasRenderingContext2D, phase: number) {
  context.fillStyle = 'rgba(255, 255, 255, 0.035)'
  for (let y = Math.round(phase * 12) % 4; y < sceneHeight; y += 4) {
    context.fillRect(0, y, sceneWidth, 1)
  }

  context.fillStyle = 'rgba(3, 5, 12, 0.22)'
  context.fillRect(0, 0, sceneWidth, 2)
  context.fillRect(0, sceneHeight - 2, sceneWidth, 2)
}

function drawAtmosphericDither(context: CanvasRenderingContext2D, phase: number) {
  for (let index = 0; index < 54; index += 1) {
    const x = (index * 47 + 13) % sceneWidth
    const y = 83 + ((index * 31 + 7) % 85)
    const shimmer = Math.sin((phase + index * 0.071) * Math.PI * 2)

    if (shimmer <= 0.25) {
      continue
    }

    const alpha = 0.035 + shimmer * 0.025
    const tone = index % 3 === 0 ? '210, 214, 207' : '125, 146, 164'

    pixelRect(context, x, y, index % 5 === 0 ? 2 : 1, 1, `rgba(${tone}, ${alpha})`)
  }
}

function drawScene(context: CanvasRenderingContext2D, phase: number, reducedMotion: boolean) {
  const motionPhase = reducedMotion ? (Math.floor(phase * 24) / 24) % 1 : phase
  const state = getDriftState(motionPhase)

  context.clearRect(0, 0, sceneWidth, sceneHeight)
  drawSky(context, motionPhase)
  drawTrees(context, motionPhase)
  drawRoad(context, motionPhase)
  drawGuardrails(context, motionPhase)
  drawFog(context, motionPhase, reducedMotion)
  drawHeadlights(context, state)
  drawSmoke(context, motionPhase, state)
  drawTaillightStreaks(context, motionPhase, state)
  drawCar(context, state)
  drawForegroundGuardrail(context, motionPhase)
  drawAtmosphericDither(context, motionPhase)
  drawScanlines(context, motionPhase)
}

export default function DriftLoopOverlay({ onClose }: DriftLoopOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context) {
      return
    }

    const drawingContext = context
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reducedMotion = reducedMotionQuery.matches
    let animationFrame = 0
    let animationStartedAt: number | null = null

    canvas.width = sceneWidth
    canvas.height = sceneHeight
    drawingContext.imageSmoothingEnabled = false

    const updateReducedMotion = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches
    }

    function render(now: number) {
      animationStartedAt ??= now
      const duration = reducedMotion ? reducedMotionLoopDurationMs : loopDurationMs
      const elapsed = now - animationStartedAt

      drawScene(drawingContext, (elapsed % duration) / duration, reducedMotion)
      animationFrame = window.requestAnimationFrame(render)
    }

    drawScene(drawingContext, 0, reducedMotion)
    animationFrame = window.requestAnimationFrame(render)
    reducedMotionQuery.addEventListener('change', updateReducedMotion)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      reducedMotionQuery.removeEventListener('change', updateReducedMotion)
    }
  }, [])

  return (
    <div
      className="drift-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget ||
          event.target === event.currentTarget.firstElementChild
        ) {
          onClose()
        }
      }}
    >
      <section
        aria-label="Pixel art downhill drift animation"
        aria-modal="true"
        className="drift-shell"
        role="dialog"
      >
        <div className="drift-stage" aria-hidden="true">
          <canvas
            ref={canvasRef}
            className="drift-canvas"
            width={sceneWidth}
            height={sceneHeight}
          />
          <div className="drift-vignette" />
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          className="drift-close"
          aria-label="Close drift animation"
          onClick={onClose}
        >
          x
        </button>
      </section>
    </div>
  )
}
