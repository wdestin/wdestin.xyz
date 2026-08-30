'use client'

import { useEffect, useRef } from 'react'

import {
  clamp,
  lerp,
  normalizeLoopPhase,
  rotatePoint,
  smootherstep,
  smoothstep,
} from './drift-loop/math'
import {
  getForegroundRailSamples,
  getRoadSamples,
  sampleMotionValue,
  sampleRoad,
  sampleRoadOffset,
} from './drift-loop/road'
import {
  loopDurationMs,
  reducedMotionLoopDurationMs,
  sceneHeight,
  sceneWidth,
} from './drift-loop/constants'
import { createSceneLayer } from './drift-loop/effects'
import { validateCarVoxelAnimationData } from './drift-loop/car-voxel'
import type {
  CarSpritePart,
  CarSpritePose,
  ChevronMarker,
  CityLight,
  DriftState,
  LightCatch,
  Point,
  ProjectedVoxelFace,
  RoadGlint,
  RoadScratch,
  RoadsideMarker,
  RoadSpeedStreak,
  SmokePuff,
  VoxelCarPose,
  VoxelCuboid,
  VoxelPalette,
  VoxelPoint,
  VoxelPoseFrame,
  VoxelPoseTimelineFrame,
} from './drift-loop/types'

type DriftLoopOverlayProps = {
  onClose: () => void
}

const valleyLights: CityLight[] = [
  { x: 139, y: 86, color: '#f4cf88', phase: 0.22 },
  { x: 146, y: 88, color: '#8dd5df', phase: 0.62 },
  { x: 152, y: 84, color: '#ed9d62', phase: 0.05 },
  { x: 158, y: 82, color: '#e5b05e', phase: 0.32 },
  { x: 164, y: 84, color: '#8dd5df', phase: 0.72 },
  { x: 171, y: 81, color: '#f4cf88', phase: 0.18 },
  { x: 178, y: 86, color: '#d6e4a5', phase: 0.84 },
  { x: 187, y: 83, color: '#ed9d62', phase: 0.46 },
  { x: 196, y: 87, color: '#f0c56d', phase: 0.04 },
  { x: 210, y: 74, color: '#f0c56d', phase: 0.1 },
  { x: 214, y: 82, color: '#f4cf88', phase: 0.36 },
  { x: 220, y: 70, color: '#8dd5df', phase: 0.6 },
  { x: 224, y: 84, color: '#d6e4a5', phase: 0.94 },
  { x: 232, y: 76, color: '#ed9d62', phase: 0.4 },
  { x: 241, y: 71, color: '#d6e4a5', phase: 0.8 },
  { x: 244, y: 82, color: '#f0c56d', phase: 0.24 },
  { x: 254, y: 78, color: '#f0c56d', phase: 0.2 },
  { x: 260, y: 83, color: '#f4cf88', phase: 0.58 },
  { x: 267, y: 74, color: '#95e0ee', phase: 0.7 },
  { x: 272, y: 86, color: '#ed9d62', phase: 0.12 },
  { x: 281, y: 80, color: '#e5b05e', phase: 0.5 },
  { x: 288, y: 84, color: '#d6e4a5', phase: 0.68 },
  { x: 294, y: 77, color: '#f4cf88', phase: 0.0 },
  { x: 303, y: 83, color: '#8dd5df', phase: 0.88 },
  { x: 311, y: 86, color: '#e5b05e', phase: 0.28 },
  { x: 316, y: 80, color: '#f4cf88', phase: 0.52 },
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
  { x: 93, y: 98, h: 19 },
  { x: 119, y: 95, h: 23 },
  { x: 141, y: 101, h: 17 },
  { x: 176, y: 96, h: 21 },
  { x: 205, y: 101, h: 18 },
  { x: 244, y: 96, h: 25 },
  { x: 278, y: 92, h: 31 },
  { x: 298, y: 88, h: 35 },
]

const wetRoadGlints: RoadGlint[] = [
  { x: 95, y: 150, length: 39, phase: 0.13, strength: 0.42 },
  { x: 126, y: 137, length: 47, phase: 0.61, strength: 0.34 },
  { x: 173, y: 123, length: 38, phase: 0.32, strength: 0.27 },
  { x: 196, y: 112, length: 36, phase: 0.75, strength: 0.22 },
  { x: 231, y: 109, length: 31, phase: 0.48, strength: 0.2 },
  { x: 78, y: 165, length: 54, phase: 0.85, strength: 0.2 },
]

const roadScratches: RoadScratch[] = [
  { x: 23, y: 169, length: 38, angle: -0.36, width: 1, alpha: 0.18 },
  { x: 51, y: 158, length: 31, angle: -0.32, width: 1, alpha: 0.16 },
  { x: 74, y: 148, length: 27, angle: -0.31, width: 1, alpha: 0.15 },
  { x: 103, y: 137, length: 42, angle: -0.24, width: 1, alpha: 0.17 },
  { x: 138, y: 126, length: 34, angle: -0.15, width: 1, alpha: 0.14 },
  { x: 171, y: 118, length: 26, angle: 0.03, width: 1, alpha: 0.12 },
  { x: 204, y: 114, length: 31, angle: 0.06, width: 1, alpha: 0.13 },
  { x: 236, y: 110, length: 30, angle: 0.08, width: 1, alpha: 0.13 },
  { x: 266, y: 111, length: 25, angle: 0.1, width: 1, alpha: 0.11 },
  { x: 118, y: 158, length: 58, angle: -0.06, width: 1, alpha: 0.12 },
  { x: 176, y: 140, length: 51, angle: 0.08, width: 1, alpha: 0.11 },
  { x: 222, y: 121, length: 42, angle: 0.08, width: 1, alpha: 0.08 },
]

const roadSpeedStreaks: RoadSpeedStreak[] = [
  { x: 34, y: 168, length: 24, phase: 0.04, strength: 0.34, lane: 0 },
  { x: 71, y: 154, length: 20, phase: 0.23, strength: 0.24, lane: 1 },
  { x: 112, y: 141, length: 28, phase: 0.39, strength: 0.28, lane: 0 },
  { x: 153, y: 130, length: 22, phase: 0.57, strength: 0.2, lane: 2 },
  { x: 194, y: 115, length: 24, phase: 0.68, strength: 0.2, lane: 1 },
  { x: 245, y: 107, length: 18, phase: 0.82, strength: 0.18, lane: 2 },
  { x: 267, y: 112, length: 16, phase: 0.15, strength: 0.16, lane: 1 },
  { x: 128, y: 160, length: 38, phase: 0.74, strength: 0.18, lane: 0 },
]

const guardrailLightCatches: LightCatch[] = [
  {
    center: 0.36,
    span: 0.12,
    width: 1,
    points: [
      { x: 113, y: 101 },
      { x: 159, y: 93 },
      { x: 203, y: 93 },
    ],
  },
  {
    center: 0.48,
    span: 0.16,
    width: 1,
    points: [
      { x: 178, y: 96 },
      { x: 222, y: 99 },
      { x: 276, y: 106 },
    ],
  },
  {
    center: 0.56,
    span: 0.15,
    width: 1,
    points: [
      { x: 142, y: 136 },
      { x: 184, y: 129 },
      { x: 232, y: 137 },
    ],
  },
  {
    center: 0.68,
    span: 0.12,
    width: 2,
    points: [
      { x: 197, y: 111 },
      { x: 250, y: 107 },
      { x: 312, y: 111 },
    ],
  },
]

const roadsideMarkers: RoadsideMarker[] = [
  { x: 58, y: 121, height: 10, center: 0.2, span: 0.1, size: 1, color: 'white', layer: 'back' },
  { x: 102, y: 106, height: 9, center: 0.31, span: 0.11, size: 1, color: 'amber', layer: 'back' },
  { x: 152, y: 96, height: 8, center: 0.43, span: 0.13, size: 1, color: 'white', layer: 'back' },
  { x: 214, y: 102, height: 8, center: 0.58, span: 0.13, size: 1, color: 'amber', layer: 'back' },
  { x: 277, y: 102, height: 9, center: 0.74, span: 0.1, size: 1, color: 'white', layer: 'back' },
  { x: 34, y: 168, height: 16, center: 0.14, span: 0.09, size: 2, color: 'red', layer: 'front' },
  { x: 96, y: 148, height: 18, center: 0.27, span: 0.12, size: 2, color: 'amber', layer: 'front' },
  { x: 153, y: 136, height: 19, center: 0.43, span: 0.15, size: 2, color: 'white', layer: 'front' },
  { x: 219, y: 140, height: 20, center: 0.6, span: 0.14, size: 2, color: 'amber', layer: 'front' },
  { x: 289, y: 151, height: 18, center: 0.78, span: 0.1, size: 1, color: 'red', layer: 'front' },
]

const chevronMarkers: ChevronMarker[] = [
  { x: 230, y: 102, center: 0.58, span: 0.14, scale: 0.82 },
  { x: 250, y: 102, center: 0.64, span: 0.14, scale: 0.9 },
  { x: 273, y: 104, center: 0.72, span: 0.12, scale: 1 },
]

const smokePuffs: SmokePuff[] = [
  { offset: 0.015, radius: 3.4, x: -4, y: 4, layer: 0, tone: 'white', depth: 'front' },
  { offset: 0.03, radius: 4.2, x: -8, y: 6, layer: 1, tone: 'cool', depth: 'front' },
  { offset: 0.055, radius: 5.6, x: -13, y: 8, layer: 2, tone: 'warm', depth: 'back' },
  { offset: 0.08, radius: 6.2, x: -18, y: 11, layer: 0, tone: 'cool', depth: 'front' },
  { offset: 0.11, radius: 7, x: -24, y: 13, layer: 1, tone: 'white', depth: 'back' },
  { offset: 0.14, radius: 7.8, x: -30, y: 15, layer: 2, tone: 'cool', depth: 'back' },
  { offset: 0.175, radius: 8.5, x: -38, y: 16, layer: 0, tone: 'warm', depth: 'front' },
  { offset: 0.21, radius: 7.4, x: -45, y: 16, layer: 1, tone: 'cool', depth: 'back' },
  { offset: 0.245, radius: 6.2, x: -52, y: 15, layer: 2, tone: 'white', depth: 'back' },
  { offset: 0.025, radius: 2.4, x: -5, y: 1, layer: 2, tone: 'white', depth: 'front' },
  { offset: 0.068, radius: 3.1, x: -16, y: 2, layer: 0, tone: 'cool', depth: 'front' },
  { offset: 0.128, radius: 4.7, x: -29, y: 6, layer: 2, tone: 'white', depth: 'front' },
  { offset: 0.198, radius: 5.3, x: -44, y: 8, layer: 1, tone: 'cool', depth: 'back' },
]

const skidTrailOffsets = [0, 0.018, 0.036, 0.058, 0.084, 0.114, 0.148, 0.186, 0.228]

const tireSprayOffsets = [0.01, 0.024, 0.041, 0.063, 0.089, 0.118]

const voxelPalettes = {
  amber: { top: '#ffd46a', side: '#f0a13c', front: '#ffbf47', back: '#9c572b' },
  black: { top: '#1a1d22', side: '#080a0f', front: '#101218', back: '#05070b' },
  bodyShadow: { top: '#e8ece7', side: '#abb6b6', front: '#d8ddd8', back: '#8f9a9b' },
  chrome: { top: '#dfe7e5', side: '#7f8c96', front: '#bac5c6', back: '#566371' },
  glass: { top: '#324058', side: '#111827', front: '#1c2535', back: '#0c111c' },
  red: { top: '#ff5364', side: '#b7162c', front: '#e72a43', back: '#7f1022' },
  rim: { top: '#59616b', side: '#242a32', front: '#424951', back: '#151922' },
  rubber: { top: '#191d24', side: '#080a0d', front: '#11141a', back: '#05060a' },
  warmWhite: { top: '#fff8d2', side: '#decf9a', front: '#fff4bf', back: '#a69a7c' },
  white: { top: '#ffffff', side: '#c8cfcb', front: '#eef1e8', back: '#9fa7a5' },
}

const carVoxelModel: VoxelCuboid[] = [
  { x: 0, y: 0, z: 5, width: 62, depth: 21, height: 7, palette: voxelPalettes.black },
  { x: -1, y: 0, z: 10, width: 58, depth: 22, height: 9, palette: voxelPalettes.white },
  { x: 23, y: 0, z: 12, width: 20, depth: 19, height: 5, palette: voxelPalettes.white },
  { x: 31, y: 0, z: 8, width: 9, depth: 22, height: 6, palette: voxelPalettes.black },
  { x: -30, y: 0, z: 8, width: 7, depth: 22, height: 7, palette: voxelPalettes.black },
  { x: -3, y: 0, z: 19, width: 26, depth: 18, height: 8, palette: voxelPalettes.glass },
  { x: -5, y: 0, z: 25, width: 25, depth: 17, height: 3, palette: voxelPalettes.white },
  { x: -19, y: 0, z: 17, width: 14, depth: 18, height: 5, palette: voxelPalettes.glass },
  { x: 22, y: -8, z: 18, width: 6, depth: 4, height: 6, palette: voxelPalettes.black },
  { x: 22, y: 8, z: 18, width: 6, depth: 4, height: 6, palette: voxelPalettes.black },
  { x: 22, y: -8, z: 22, width: 5, depth: 3, height: 3, palette: voxelPalettes.warmWhite },
  { x: 22, y: 8, z: 22, width: 5, depth: 3, height: 3, palette: voxelPalettes.warmWhite },
  { x: 31, y: -6, z: 12, width: 4, depth: 4, height: 3, palette: voxelPalettes.warmWhite },
  { x: 31, y: 6, z: 12, width: 4, depth: 4, height: 3, palette: voxelPalettes.warmWhite },
  { x: 33, y: -10, z: 7, width: 5, depth: 4, height: 3, palette: voxelPalettes.amber },
  { x: 33, y: 10, z: 7, width: 5, depth: 4, height: 3, palette: voxelPalettes.amber },
  { x: -33, y: -7, z: 11, width: 4, depth: 5, height: 4, palette: voxelPalettes.red },
  { x: -33, y: 7, z: 11, width: 4, depth: 5, height: 4, palette: voxelPalettes.red },
  { x: -33, y: -1, z: 11, width: 4, depth: 4, height: 3, palette: voxelPalettes.amber },
  { x: -19, y: -13, z: 6, width: 9, depth: 4, height: 9, palette: voxelPalettes.rubber },
  { x: 15, y: -13, z: 6, width: 9, depth: 4, height: 9, palette: voxelPalettes.rubber },
  { x: -19, y: 13, z: 6, width: 9, depth: 4, height: 9, palette: voxelPalettes.rubber },
  { x: 15, y: 13, z: 6, width: 9, depth: 4, height: 9, palette: voxelPalettes.rubber },
  { x: -19, y: -14, z: 7, width: 4, depth: 2, height: 4, palette: voxelPalettes.rim },
  { x: 15, y: -14, z: 7, width: 4, depth: 2, height: 4, palette: voxelPalettes.rim },
  { x: -19, y: 14, z: 7, width: 4, depth: 2, height: 4, palette: voxelPalettes.rim },
  { x: 15, y: 14, z: 7, width: 4, depth: 2, height: 4, palette: voxelPalettes.rim },
  { x: -1, y: -12, z: 11, width: 40, depth: 2, height: 3, palette: voxelPalettes.black },
  { x: -1, y: 12, z: 11, width: 40, depth: 2, height: 3, palette: voxelPalettes.black },
  { x: 35, y: 0, z: 12, width: 3, depth: 23, height: 3, palette: voxelPalettes.black },
  { x: -36, y: 0, z: 9, width: 4, depth: 22, height: 4, palette: voxelPalettes.black },
  { x: 4, y: -14, z: 17, width: 6, depth: 3, height: 4, palette: voxelPalettes.black },
  { x: 4, y: 14, z: 17, width: 6, depth: 3, height: 4, palette: voxelPalettes.black },
  { x: -24, y: 0, z: 21, width: 8, depth: 17, height: 4, palette: voxelPalettes.glass },
  { x: 10, y: 0, z: 24, width: 4, depth: 17, height: 5, palette: voxelPalettes.white },
  { x: 12, y: -10, z: 19, width: 22, depth: 1, height: 2, palette: voxelPalettes.bodyShadow },
  { x: 12, y: 10, z: 17, width: 22, depth: 1, height: 2, palette: voxelPalettes.bodyShadow },
  { x: -7, y: -11, z: 16, width: 2, depth: 3, height: 8, palette: voxelPalettes.black },
  { x: 8, y: -11, z: 15, width: 2, depth: 3, height: 6, palette: voxelPalettes.black },
  { x: -16, y: 11, z: 15, width: 2, depth: 3, height: 6, palette: voxelPalettes.black },
  { x: 15, y: -12, z: 12, width: 14, depth: 2, height: 2, palette: voxelPalettes.chrome },
  { x: -20, y: -12, z: 12, width: 10, depth: 2, height: 2, palette: voxelPalettes.chrome },
  { x: -25, y: 0, z: 25, width: 12, depth: 15, height: 2, palette: voxelPalettes.glass },
  { x: -31, y: 0, z: 15, width: 3, depth: 16, height: 2, palette: voxelPalettes.chrome },
  { x: 27, y: 0, z: 19, width: 11, depth: 14, height: 2, palette: voxelPalettes.bodyShadow },
]

const carVoxelPoses: VoxelCarPose[] = [
  {
    name: 'entry-01',
    yaw: -0.62,
    bodyPitch: -0.25,
    bodyShadeAlpha: 0.08,
    detailAlpha: 0.78,
    headlightEmphasis: 1.08,
    lightJitter: 0.1,
    suspension: 0.08,
    wheelPhase: 0,
    wheelTurn: -0.08,
    spriteScale: 0.97,
    sparkOffset: { x: -12, y: 10 },
    wheelHighlights: [
      { x: -18, y: 8, width: 6, angle: 0.08 },
      { x: 14, y: 8, width: 6, angle: -0.1 },
    ],
  },
  {
    name: 'entry-02',
    yaw: -0.57,
    bodyPitch: -0.1,
    bodyShadeAlpha: 0.1,
    detailAlpha: 0.9,
    headlightEmphasis: 1.16,
    lightJitter: -0.16,
    suspension: 0.32,
    wheelPhase: 0.22,
    wheelTurn: -0.15,
    spriteScale: 0.99,
    sparkOffset: { x: -13, y: 10 },
    wheelHighlights: [
      { x: -18, y: 8, width: 7, angle: 0.12 },
      { x: 14, y: 8, width: 7, angle: -0.18 },
    ],
  },
  {
    name: 'entry-03',
    yaw: -0.52,
    bodyPitch: 0.12,
    bodyShadeAlpha: 0.13,
    detailAlpha: 0.98,
    headlightEmphasis: 1.22,
    lightJitter: 0.18,
    suspension: 0.58,
    wheelPhase: 0.44,
    wheelTurn: -0.22,
    spriteScale: 1.01,
    sparkOffset: { x: -14, y: 10 },
    wheelHighlights: [
      { x: -19, y: 8.5, width: 7, angle: 0.18 },
      { x: 13, y: 8.5, width: 8, angle: -0.24 },
    ],
  },
  {
    name: 'entry-04',
    yaw: -0.5,
    bodyPitch: 0.22,
    bodyShadeAlpha: 0.15,
    bodySquash: 0.08,
    detailAlpha: 1,
    headlightEmphasis: 1.26,
    lightJitter: -0.06,
    suspension: 0.78,
    wheelPhase: 0.56,
    wheelTurn: -0.26,
    spriteScale: 1.02,
    spriteYOffset: 0.3,
    sparkOffset: { x: -15, y: 11 },
    wheelHighlights: [
      { x: -19, y: 9, width: 7, angle: 0.22 },
      { x: 13, y: 9, width: 8, angle: -0.28 },
    ],
  },
  {
    name: 'load-01',
    yaw: -0.48,
    bodyPitch: 0.32,
    bodyShadeAlpha: 0.16,
    bodySquash: 0.18,
    detailAlpha: 1,
    headlightEmphasis: 1.28,
    lightJitter: -0.1,
    suspension: 0.92,
    wheelPhase: 0.66,
    wheelTurn: -0.3,
    spriteScale: 1.03,
    spriteYOffset: 0.8,
    sparkOffset: { x: -16, y: 11 },
    wheelHighlights: [
      { x: -20, y: 9, width: 7, angle: 0.24 },
      { x: 13, y: 9, width: 8, angle: -0.32 },
    ],
  },
  {
    name: 'load-02',
    yaw: -0.45,
    bodyPitch: 0.26,
    bodyShadeAlpha: 0.19,
    bodySquash: 0.28,
    detailAlpha: 1,
    headlightEmphasis: 1.3,
    lightJitter: 0.08,
    rearKick: 0.5,
    suspension: 1.15,
    wheelPhase: 0.78,
    wheelTurn: -0.34,
    spriteScale: 1.04,
    spriteYOffset: 1.1,
    sparkOffset: { x: -17, y: 11 },
    wheelHighlights: [
      { x: -20, y: 9.5, width: 8, angle: 0.28 },
      { x: 12, y: 9.5, width: 8, angle: -0.38 },
    ],
  },
  {
    name: 'load-03',
    yaw: -0.42,
    bodyPitch: 0.18,
    bodyShadeAlpha: 0.22,
    bodySquash: 0.22,
    detailAlpha: 1,
    headlightEmphasis: 1.24,
    lightJitter: 0.16,
    rearKick: 0.9,
    suspension: 1.2,
    wheelPhase: 0.9,
    wheelTurn: -0.38,
    spriteScale: 1.045,
    spriteYOffset: 1.15,
    sparkOffset: { x: -17, y: 11 },
    wheelHighlights: [
      { x: -20, y: 9.5, width: 8, angle: 0.3 },
      { x: 12, y: 9.8, width: 8, angle: -0.4 },
    ],
  },
  {
    name: 'load-04',
    yaw: -0.39,
    bodyPitch: 0.1,
    bodyShadeAlpha: 0.21,
    bodySquash: 0.12,
    detailAlpha: 1,
    headlightEmphasis: 1.22,
    lightJitter: -0.14,
    rearKick: 1.25,
    suspension: 1.02,
    wheelPhase: 0.02,
    wheelTurn: -0.41,
    spriteScale: 1.045,
    spriteYOffset: 0.85,
    sparkOffset: { x: -18, y: 11 },
    wheelHighlights: [
      { x: -21, y: 9.3, width: 8, angle: 0.31 },
      { x: 12, y: 9.8, width: 8, angle: -0.42 },
    ],
  },
  {
    name: 'drift-init-01',
    yaw: -0.36,
    bodyPitch: 0.02,
    bodyShadeAlpha: 0.2,
    detailAlpha: 1,
    headlightEmphasis: 1.2,
    lightJitter: -0.18,
    rearKick: 1.6,
    suspension: 0.78,
    wheelPhase: 0.1,
    wheelTurn: -0.43,
    spriteScale: 1.04,
    spriteYOffset: 0.6,
    sparkOffset: { x: -18, y: 11 },
    wheelHighlights: [
      { x: -21, y: 9, width: 8, angle: 0.32 },
      { x: 12, y: 10, width: 8, angle: -0.43 },
    ],
  },
  {
    name: 'drift-init-02',
    yaw: -0.29,
    bodyPitch: -0.08,
    bodyShadeAlpha: 0.23,
    detailAlpha: 1,
    headlightEmphasis: 1.16,
    lightJitter: 0.14,
    rearKick: 2.5,
    suspension: 0.58,
    wheelPhase: 0.32,
    wheelTurn: -0.48,
    spriteScale: 1.05,
    sparkOffset: { x: -20, y: 11 },
    wheelHighlights: [
      { x: -22, y: 9.5, width: 8, angle: 0.36 },
      { x: 12, y: 10, width: 9, angle: -0.48 },
    ],
  },
  {
    name: 'drift-init-03',
    yaw: -0.26,
    bodyPitch: -0.12,
    bodyShadeAlpha: 0.24,
    detailAlpha: 1,
    headlightEmphasis: 1.14,
    lightJitter: -0.04,
    rearKick: 2.95,
    suspension: 0.5,
    wheelPhase: 0.44,
    wheelTurn: -0.5,
    spriteScale: 1.05,
    spriteYOffset: 0.2,
    sparkOffset: { x: -21, y: 11 },
    wheelHighlights: [
      { x: -22, y: 9.4, width: 8, angle: 0.38 },
      { x: 13, y: 10, width: 9, angle: -0.5 },
    ],
  },
  {
    name: 'drift-init-04',
    yaw: -0.24,
    bodyPitch: -0.14,
    bodyShadeAlpha: 0.25,
    detailAlpha: 1,
    headlightEmphasis: 1.12,
    lightJitter: 0.1,
    rearKick: 3.25,
    suspension: 0.46,
    wheelPhase: 0.5,
    wheelTurn: -0.52,
    spriteScale: 1.05,
    sparkOffset: { x: -22, y: 11 },
    wheelHighlights: [
      { x: -23, y: 9, width: 8, angle: 0.4 },
      { x: 13, y: 10, width: 9, angle: -0.52 },
    ],
  },
  {
    name: 'apex-01',
    yaw: -0.22,
    bodyPitch: -0.14,
    bodyShadeAlpha: 0.25,
    detailAlpha: 1,
    headlightEmphasis: 1.12,
    lightJitter: -0.06,
    rearKick: 3.4,
    suspension: 0.46,
    wheelPhase: 0.54,
    wheelTurn: -0.52,
    spriteScale: 1.05,
    sparkOffset: { x: -22, y: 11 },
    wheelHighlights: [
      { x: -23, y: 9, width: 8, angle: 0.4 },
      { x: 13, y: 10, width: 9, angle: -0.52 },
    ],
  },
  {
    name: 'apex-02',
    yaw: -0.18,
    bodyPitch: -0.2,
    bodyShadeAlpha: 0.26,
    detailAlpha: 1,
    headlightEmphasis: 1.08,
    lightJitter: 0.16,
    rearKick: 3.8,
    suspension: 0.3,
    wheelPhase: 0.76,
    wheelTurn: -0.5,
    spriteScale: 1.045,
    sparkOffset: { x: -23, y: 11 },
    wheelHighlights: [
      { x: -23, y: 9, width: 8, angle: 0.34 },
      { x: 13, y: 10, width: 9, angle: -0.5 },
    ],
  },
  {
    name: 'apex-03',
    yaw: -0.16,
    bodyPitch: -0.18,
    bodyShadeAlpha: 0.25,
    detailAlpha: 0.98,
    headlightEmphasis: 1.06,
    lightJitter: -0.12,
    rearKick: 3.6,
    suspension: 0.2,
    wheelPhase: 0.92,
    wheelTurn: -0.46,
    spriteScale: 1.035,
    sparkOffset: { x: -22, y: 11 },
    wheelHighlights: [
      { x: -22, y: 9, width: 8, angle: 0.3 },
      { x: 14, y: 10, width: 8, angle: -0.46 },
    ],
  },
  {
    name: 'apex-04',
    yaw: -0.13,
    bodyPitch: -0.12,
    bodyShadeAlpha: 0.22,
    detailAlpha: 0.96,
    headlightEmphasis: 1.03,
    lightJitter: 0.08,
    rearKick: 3.1,
    suspension: 0.1,
    wheelPhase: 0.08,
    wheelTurn: -0.38,
    spriteScale: 1.02,
    sparkOffset: { x: -21, y: 11 },
    wheelHighlights: [
      { x: -22, y: 9, width: 7, angle: 0.24 },
      { x: 14, y: 10, width: 8, angle: -0.38 },
    ],
  },
  {
    name: 'apex-05',
    yaw: -0.09,
    bodyPitch: -0.05,
    bodyShadeAlpha: 0.22,
    detailAlpha: 0.94,
    headlightEmphasis: 1,
    lightJitter: -0.1,
    rearKick: 2.45,
    suspension: -0.04,
    wheelPhase: 0.18,
    wheelTurn: -0.3,
    spriteScale: 0.995,
    sparkOffset: { x: -20, y: 10 },
    wheelHighlights: [
      { x: -22, y: 8.7, width: 7, angle: 0.21 },
      { x: 13, y: 9.5, width: 7, angle: -0.3 },
    ],
  },
  {
    name: 'recovery-01',
    yaw: -0.04,
    bodyPitch: 0.02,
    depthScale: 0.82,
    farWheelAlpha: 0.5,
    frontDetailAlpha: 0.62,
    headlightAlpha: 0.5,
    rearDetailAlpha: 1.16,
    rearEmphasis: 1.1,
    bodyShadeAlpha: 0.21,
    detailAlpha: 0.92,
    lightJitter: 0.05,
    rearKick: 1.7,
    suspension: -0.12,
    wheelPhase: 0.18,
    wheelTurn: -0.22,
    spriteScale: 0.95,
    sparkOffset: { x: -18, y: 10 },
    wheelHighlights: [
      { x: -21, y: 8.5, width: 7, angle: 0.18 },
      { x: 11, y: 8.5, width: 6, angle: -0.14 },
    ],
  },
  {
    name: 'recovery-02',
    yaw: 0.04,
    bodyPitch: 0.12,
    depthScale: 0.75,
    farWheelAlpha: 0.42,
    frontDetailAlpha: 0.54,
    headlightAlpha: 0.44,
    rearDetailAlpha: 1.22,
    rearEmphasis: 1.18,
    bodyShadeAlpha: 0.2,
    detailAlpha: 0.86,
    lightJitter: -0.08,
    rearKick: 0.8,
    suspension: -0.2,
    wheelPhase: 0.4,
    wheelTurn: -0.12,
    spriteScale: 0.9,
    sparkOffset: { x: -17, y: 10 },
    wheelHighlights: [
      { x: -20, y: 8, width: 7, angle: 0.16 },
      { x: 10, y: 8, width: 5, angle: -0.08 },
    ],
  },
  {
    name: 'recovery-03',
    yaw: 0.03,
    bodyPitch: 0.08,
    depthScale: 0.7,
    farWheelAlpha: 0.36,
    frontDetailAlpha: 0.46,
    headlightAlpha: 0.36,
    rearDetailAlpha: 1.26,
    rearEmphasis: 1.22,
    bodyShadeAlpha: 0.18,
    detailAlpha: 0.8,
    lightJitter: 0.04,
    rearKick: 0.35,
    suspension: -0.1,
    wheelPhase: 0.52,
    wheelTurn: -0.08,
    spriteScale: 0.84,
    sparkOffset: { x: -16, y: 9 },
    wheelHighlights: [
      { x: -19, y: 7.6, width: 6, angle: 0.1 },
      { x: 10, y: 7.6, width: 5, angle: -0.06 },
    ],
  },
  {
    name: 'exit-near-01',
    yaw: 0.02,
    bodyPitch: 0.06,
    depthScale: 0.66,
    farWheelAlpha: 0.3,
    frontDetailAlpha: 0.42,
    headlightAlpha: 0.32,
    rearDetailAlpha: 1.28,
    rearEmphasis: 1.24,
    bodyShadeAlpha: 0.16,
    detailAlpha: 0.74,
    lightJitter: 0.06,
    rearKick: 0.3,
    suspension: -0.05,
    wheelPhase: 0.62,
    wheelTurn: -0.06,
    spriteScale: 0.76,
    sparkOffset: { x: -15, y: 8 },
    wheelHighlights: [
      { x: -17, y: 7, width: 5, angle: 0.06 },
      { x: 9, y: 7, width: 4, angle: -0.06 },
    ],
  },
  {
    name: 'exit-near-02',
    yaw: -0.02,
    bodyPitch: 0.02,
    depthScale: 0.62,
    farWheelAlpha: 0.24,
    frontDetailAlpha: 0.34,
    headlightAlpha: 0.24,
    rearDetailAlpha: 1.3,
    rearEmphasis: 1.25,
    bodyShadeAlpha: 0.14,
    detailAlpha: 0.68,
    lightJitter: -0.04,
    suspension: 0,
    wheelPhase: 0.84,
    wheelTurn: -0.03,
    spriteScale: 0.7,
    sparkOffset: { x: -14, y: 8 },
    wheelHighlights: [
      { x: -16, y: 7, width: 5, angle: 0.04 },
      { x: 9, y: 7, width: 4, angle: -0.04 },
    ],
  },
  {
    name: 'exit-far-01',
    yaw: 0.01,
    bodyPitch: 0,
    depthScale: 0.55,
    farWheelAlpha: 0.16,
    frontDetailAlpha: 0.24,
    headlightAlpha: 0.14,
    rearDetailAlpha: 1.16,
    rearEmphasis: 1.16,
    bodyShadeAlpha: 0.1,
    detailAlpha: 0.54,
    lightJitter: 0.03,
    suspension: 0,
    wheelPhase: 0.06,
    wheelTurn: 0,
    spriteScale: 0.6,
    sparkOffset: { x: -12, y: 7 },
    wheelHighlights: [
      { x: -14, y: 6, width: 4, angle: 0 },
      { x: 8, y: 6, width: 3, angle: 0 },
    ],
  },
  {
    name: 'exit-far-02',
    yaw: 0.02,
    bodyPitch: 0,
    depthScale: 0.5,
    farWheelAlpha: 0.1,
    frontDetailAlpha: 0.18,
    headlightAlpha: 0.1,
    rearDetailAlpha: 1.1,
    rearEmphasis: 1.08,
    bodyShadeAlpha: 0.08,
    detailAlpha: 0.44,
    lightJitter: -0.02,
    suspension: 0,
    wheelPhase: 0.28,
    wheelTurn: 0,
    spriteScale: 0.52,
    sparkOffset: { x: -11, y: 7 },
    wheelHighlights: [
      { x: -13, y: 6, width: 3, angle: 0 },
      { x: 7, y: 6, width: 3, angle: 0 },
    ],
  },
]

const carVoxelPoseTimeline: VoxelPoseTimelineFrame[] = [
  { pose: carVoxelPoses[0], phase: 0 },
  { pose: carVoxelPoses[1], phase: 0.08 },
  { pose: carVoxelPoses[2], phase: 0.13 },
  { pose: carVoxelPoses[3], phase: 0.18 },
  { pose: carVoxelPoses[4], phase: 0.23 },
  { pose: carVoxelPoses[5], phase: 0.28 },
  { pose: carVoxelPoses[6], phase: 0.32 },
  { pose: carVoxelPoses[7], phase: 0.36 },
  { pose: carVoxelPoses[8], phase: 0.4 },
  { pose: carVoxelPoses[9], phase: 0.44 },
  { pose: carVoxelPoses[10], phase: 0.47 },
  { pose: carVoxelPoses[11], phase: 0.5 },
  { pose: carVoxelPoses[12], phase: 0.53 },
  { pose: carVoxelPoses[13], phase: 0.56 },
  { pose: carVoxelPoses[14], phase: 0.59 },
  { pose: carVoxelPoses[15], phase: 0.62 },
  { pose: carVoxelPoses[16], phase: 0.65 },
  { pose: carVoxelPoses[17], phase: 0.68 },
  { pose: carVoxelPoses[18], phase: 0.71 },
  { pose: carVoxelPoses[19], phase: 0.74 },
  { pose: carVoxelPoses[20], phase: 0.77 },
  { pose: carVoxelPoses[21], phase: 0.8 },
  { pose: carVoxelPoses[22], phase: 0.83 },
  { pose: carVoxelPoses[23], phase: 0.86 },
]

validateCarVoxelAnimationData(carVoxelPoses, carVoxelPoseTimeline)

const voxelSpriteWidth = 160
const voxelSpriteHeight = 104
const voxelRenderScale = 1.34
const carVoxelSpriteCache = new Map<string, HTMLCanvasElement>()
let backgroundDetailLayerCache: HTMLCanvasElement | null = null
let roadDetailLayerCache: HTMLCanvasElement | null = null

const carSpritePoses: CarSpritePose[] = [
  {
    sparkOffset: { x: -12, y: 10 },
    wheelHighlights: [
      { x: -17, y: 8, width: 6, angle: 0.18 },
      { x: 14, y: 8, width: 6, angle: -0.12 },
    ],
    parts: [
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#05070c',
        alpha: 0.9,
        points: [
          { x: -31, y: 8 },
          { x: -16, y: 14 },
          { x: 21, y: 14 },
          { x: 36, y: 7 },
          { x: 23, y: 3 },
          { x: -25, y: 4 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#090b10',
        points: [
          { x: -30, y: 1 },
          { x: -23, y: 8 },
          { x: 21, y: 9 },
          { x: 36, y: 3 },
          { x: 32, y: -2 },
          { x: -24, y: -2 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#e5e9e3',
        points: [
          { x: -30, y: -2 },
          { x: -18, y: -12 },
          { x: 10, y: -13 },
          { x: 28, y: -7 },
          { x: 37, y: 0 },
          { x: 24, y: 7 },
          { x: -24, y: 7 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#f8f8ee',
        alpha: 0.96,
        points: [
          { x: 0, y: -11 },
          { x: 25, y: -7 },
          { x: 37, y: 0 },
          { x: 20, y: 4 },
          { x: -2, y: 1 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#c8cecb',
        points: [
          { x: -27, y: 1 },
          { x: -18, y: -9 },
          { x: -7, y: -8 },
          { x: -11, y: 5 },
          { x: -26, y: 6 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#10151f',
        points: [
          { x: -15, y: -12 },
          { x: 7, y: -13 },
          { x: 18, y: -7 },
          { x: 10, y: -3 },
          { x: -18, y: -4 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#29354a',
        alpha: 0.92,
        points: [
          { x: -12, y: -10 },
          { x: 4, y: -11 },
          { x: 12, y: -7 },
          { x: 4, y: -5 },
          { x: -16, y: -5 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#25364d',
        alpha: 0.88,
        points: [
          { x: 10, y: -7 },
          { x: 21, y: -5 },
          { x: 27, y: -1 },
          { x: 14, y: 0 },
        ],
      },
      { x: -4, y: -14, width: 22, height: 2, color: '#fbfbf0', alpha: 0.86 },
      { x: -3, y: -7.5, width: 2, height: 8, color: '#05070c', alpha: 0.72 },
      { x: 11, y: -6, width: 2, height: 8, color: '#05070c', alpha: 0.7 },
      { x: -27, y: 4, width: 11, height: 3, color: '#111318' },
      { x: -12, y: 6, width: 37, height: 3, color: '#121419' },
      { x: 23, y: 3, width: 16, height: 3, color: '#0c0e12' },
      { x: -18, y: 8, width: 13, height: 5, color: '#20242c', roll: 0.26, angle: 0.12 },
      { x: 11, y: 8, width: 14, height: 5, color: '#20242c', roll: -0.2, angle: -0.12 },
      { x: -18, y: 8, width: 7, height: 2, color: '#3a414a', alpha: 0.74, angle: 0.12 },
      { x: 11, y: 8, width: 7, height: 2, color: '#3d444c', alpha: 0.7, angle: -0.12 },
      { x: 18, y: -9, width: 7, height: 5, color: '#101216', angle: 0.02 },
      { x: 19, y: -8, width: 5, height: 3, color: '#fff8d7', alpha: 0.98, angle: 0.02 },
      { x: 26, y: -1, width: 8, height: 4, color: '#ffe286', alpha: 0.98, angle: 0.02 },
      { x: 26, y: 4, width: 7, height: 3, color: '#f2a13f', alpha: 0.9 },
      { x: -28, y: -3, width: 5, height: 4, color: '#ff3b55' },
      { x: -27, y: 4, width: 5, height: 4, color: '#e71f3b' },
      { x: -2, y: 4, width: 19, height: 1, color: '#b9c0be', alpha: 0.62 },
      { x: -11, y: -1, width: 1, height: 9, color: '#4d5358', alpha: 0.7 },
      { x: 9, y: -1, width: 1, height: 8, color: '#555b60', alpha: 0.58 },
      { x: -7, y: -15, width: 17, height: 1, color: '#ffffff', alpha: 0.72 },
    ],
  },
  {
    sparkOffset: { x: -17, y: 11 },
    wheelHighlights: [
      { x: -21, y: 9, width: 7, angle: 0.32 },
      { x: 12, y: 10, width: 8, angle: -0.34 },
    ],
    parts: [
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#070910',
        alpha: 0.92,
        points: [
          { x: -31, y: 9 },
          { x: 0, y: 16 },
          { x: 28, y: 12 },
          { x: 39, y: 4 },
          { x: 9, y: 3 },
          { x: -24, y: 4 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#dfe6e1',
        points: [
          { x: -29, y: 3 },
          { x: -13, y: -12 },
          { x: 18, y: -11 },
          { x: 37, y: -2 },
          { x: 30, y: 9 },
          { x: 3, y: 13 },
          { x: -24, y: 11 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#fbfaec',
        alpha: 0.98,
        points: [
          { x: 1, y: -10 },
          { x: 24, y: -10 },
          { x: 38, y: -2 },
          { x: 30, y: 7 },
          { x: 7, y: 6 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#cbd2cf',
        points: [
          { x: -29, y: 3 },
          { x: -14, y: -9 },
          { x: -7, y: -5 },
          { x: -13, y: 11 },
          { x: -27, y: 10 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#24354b',
        points: [
          { x: -11, y: -11 },
          { x: 7, y: -12 },
          { x: 19, y: -8 },
          { x: 9, y: -3 },
          { x: -14, y: -4 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#334d68',
        alpha: 0.92,
        points: [
          { x: 12, y: -8 },
          { x: 26, y: -5 },
          { x: 30, y: 0 },
          { x: 15, y: 0 },
        ],
      },
      { x: -5, y: -14, width: 24, height: 2, color: '#fbfbef', alpha: 0.84 },
      { x: -3, y: -7, width: 2, height: 9, color: '#06080e', alpha: 0.78 },
      { x: 12, y: -6, width: 2, height: 8, color: '#05070c', alpha: 0.74 },
      { x: -25, y: 6, width: 18, height: 5, color: '#111319', roll: 0.45, angle: 0.22 },
      { x: 8, y: 8, width: 17, height: 5, color: '#111319', roll: -0.36, angle: -0.28 },
      { x: -23, y: 7, width: 8, height: 2, color: '#3c434c', alpha: 0.78, angle: 0.22 },
      { x: 9, y: 8, width: 9, height: 2, color: '#4a515a', alpha: 0.76, angle: -0.28 },
      { x: 29, y: -7, width: 7, height: 5, color: '#111319', angle: 0.04 },
      { x: 30, y: -6, width: 5, height: 3, color: '#fff7c9', alpha: 1, angle: 0.04 },
      { x: 31, y: 2, width: 8, height: 4, color: '#ffdf72', alpha: 0.98 },
      { x: 25, y: 7, width: 8, height: 3, color: '#0b0d12', alpha: 0.9 },
      { x: -30, y: 0, width: 6, height: 4, color: '#ff3551' },
      { x: -28, y: 8, width: 6, height: 4, color: '#e71b38' },
      { x: -12, y: 12, width: 31, height: 2, color: '#111621', alpha: 0.84 },
      { x: -9, y: -13, width: 28, height: 1, color: '#ffffff', alpha: 0.74 },
      { x: 0, y: -15, width: 11, height: 1, color: '#8fcbd5', alpha: 0.48 },
      { x: 2, y: 5, width: 14, height: 1, color: '#b8c0be', alpha: 0.64 },
    ],
  },
  {
    sparkOffset: { x: -16, y: 10 },
    wheelHighlights: [
      { x: -20, y: 8, width: 7, angle: 0.18 },
      { x: 12, y: 8, width: 6, angle: -0.08 },
    ],
    parts: [
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#05070c',
        alpha: 0.9,
        points: [
          { x: -33, y: 7 },
          { x: -20, y: 13 },
          { x: 18, y: 13 },
          { x: 34, y: 6 },
          { x: 24, y: 2 },
          { x: -29, y: 1 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#dce2df',
        points: [
          { x: -32, y: -1 },
          { x: -20, y: -12 },
          { x: 10, y: -13 },
          { x: 30, y: -6 },
          { x: 35, y: 1 },
          { x: 19, y: 9 },
          { x: -28, y: 8 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#f4f5ea',
        points: [
          { x: 3, y: -11 },
          { x: 27, y: -6 },
          { x: 35, y: 0 },
          { x: 18, y: 4 },
          { x: -2, y: 1 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#c8cfcd',
        points: [
          { x: -32, y: 0 },
          { x: -22, y: -9 },
          { x: -8, y: -8 },
          { x: -8, y: 7 },
          { x: -29, y: 8 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#1d2738',
        points: [
          { x: -20, y: -11 },
          { x: -2, y: -12 },
          { x: 8, y: -8 },
          { x: -2, y: -4 },
          { x: -23, y: -4 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#26394f',
        points: [
          { x: 6, y: -8 },
          { x: 20, y: -6 },
          { x: 27, y: -1 },
          { x: 11, y: 0 },
        ],
      },
      { x: -5, y: -14, width: 22, height: 2, color: '#f9faf0', alpha: 0.82 },
      { x: -5, y: -7, width: 2, height: 9, color: '#07090f', alpha: 0.74 },
      { x: 10, y: -6, width: 2, height: 8, color: '#07090f', alpha: 0.68 },
      { x: -31, y: 1, width: 16, height: 5, color: '#111318' },
      { x: -29, y: 0, width: 6, height: 4, color: '#d5243b' },
      { x: -22, y: 0, width: 6, height: 4, color: '#ff4756' },
      { x: -15, y: 0, width: 4, height: 4, color: '#f2a13f' },
      { x: -10, y: 5, width: 35, height: 3, color: '#111318' },
      { x: 21, y: 3, width: 13, height: 3, color: '#0d0f14' },
      { x: -23, y: 8, width: 13, height: 5, color: '#20242c', roll: 0.34, angle: 0.12 },
      { x: 9, y: 8, width: 13, height: 4, color: '#22262e', roll: -0.18, angle: -0.1 },
      { x: -22, y: 8, width: 7, height: 2, color: '#424952', alpha: 0.68, angle: 0.12 },
      { x: 9, y: 8, width: 7, height: 2, color: '#3d444d', alpha: 0.64, angle: -0.1 },
      { x: 22, y: -6, width: 6, height: 4, color: '#111318', angle: 0.02 },
      { x: 23, y: -5, width: 4, height: 3, color: '#fff1ae', alpha: 0.94, angle: 0.02 },
      { x: 28, y: 1, width: 6, height: 3, color: '#ffe087', alpha: 0.9 },
      { x: -8, y: 4, width: 1, height: 9, color: '#555b60', alpha: 0.68 },
      { x: 8, y: 3, width: 1, height: 8, color: '#545a60', alpha: 0.56 },
      { x: -11, y: -14, width: 21, height: 1, color: '#ffffff', alpha: 0.68 },
    ],
  },
  {
    sparkOffset: { x: -14, y: 8 },
    wheelHighlights: [
      { x: -17, y: 7, width: 5, angle: 0.08 },
      { x: 12, y: 7, width: 5, angle: -0.08 },
    ],
    parts: [
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#06080d',
        alpha: 0.86,
        points: [
          { x: -27, y: 7 },
          { x: -15, y: 12 },
          { x: 19, y: 12 },
          { x: 31, y: 7 },
          { x: 23, y: 4 },
          { x: -24, y: 3 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#d8dfdc',
        points: [
          { x: -28, y: 0 },
          { x: -16, y: -10 },
          { x: 10, y: -10 },
          { x: 28, y: -4 },
          { x: 31, y: 2 },
          { x: 18, y: 8 },
          { x: -25, y: 8 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#f4f5eb',
        alpha: 0.94,
        points: [
          { x: 0, y: -8 },
          { x: 25, y: -4 },
          { x: 31, y: 1 },
          { x: 15, y: 4 },
          { x: -2, y: 2 },
        ],
      },
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#1c2636',
        points: [
          { x: -16, y: -9 },
          { x: 4, y: -9 },
          { x: 13, y: -5 },
          { x: 4, y: -2 },
          { x: -19, y: -3 },
        ],
      },
      { x: -4, y: -11, width: 18, height: 2, color: '#fafbf1', alpha: 0.72 },
      { x: -5, y: -5, width: 2, height: 7, color: '#06080d', alpha: 0.7 },
      { x: -27, y: 1, width: 11, height: 4, color: '#111318' },
      { x: -27, y: 0, width: 5, height: 4, color: '#d42a3f' },
      { x: -21, y: 0, width: 5, height: 4, color: '#f04451' },
      { x: -8, y: 5, width: 31, height: 3, color: '#111318' },
      { x: -18, y: 7, width: 11, height: 4, color: '#20242c', roll: 0.22 },
      { x: 8, y: 7, width: 11, height: 4, color: '#20242c', roll: -0.12 },
      { x: -17, y: 7, width: 5, height: 2, color: '#3e454e', alpha: 0.62 },
      { x: 8, y: 7, width: 5, height: 2, color: '#3f464f', alpha: 0.58 },
      { x: 22, y: -4, width: 5, height: 3, color: '#fff0a5', alpha: 0.9 },
      { x: 26, y: 2, width: 5, height: 3, color: '#f6b04b', alpha: 0.86 },
      { x: 5, y: 4, width: 1, height: 8, color: '#4d5358', alpha: 0.54 },
      { x: -12, y: -11, width: 17, height: 1, color: '#ffffff', alpha: 0.58 },
    ],
  },
]

function pulseNear(phase: number, center: number, span: number) {
  return clamp(1 - Math.abs(phase - center) / span, 0, 1)
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
  const startX = Math.round(x1)
  const startY = Math.round(y1)
  const endX = Math.round(x2)
  const endY = Math.round(y2)
  const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY), 1)
  const pixelWidth = Math.max(1, Math.round(width))
  const offset = Math.floor(pixelWidth / 2)

  context.fillStyle = color

  for (let index = 0; index <= steps; index += 1) {
    const amount = index / steps
    const x = Math.round(lerp(startX, endX, amount))
    const y = Math.round(lerp(startY, endY, amount))

    context.fillRect(x - offset, y - offset, pixelWidth, pixelWidth)
  }
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
  const roundedPoints = points.map((point) => ({
    x: Math.round(point.x),
    y: Math.round(point.y),
  }))
  const minY = Math.min(...roundedPoints.map((point) => point.y))
  const maxY = Math.max(...roundedPoints.map((point) => point.y))

  context.fillStyle = color

  for (let y = minY; y <= maxY; y += 1) {
    const intersections: number[] = []

    roundedPoints.forEach((point, index) => {
      const nextPoint = roundedPoints[(index + 1) % roundedPoints.length]

      if (point.y === nextPoint.y) {
        return
      }

      const topY = Math.min(point.y, nextPoint.y)
      const bottomY = Math.max(point.y, nextPoint.y)

      if (y < topY || y >= bottomY) {
        return
      }

      const amount = (y + 0.5 - point.y) / (nextPoint.y - point.y)
      intersections.push(point.x + (nextPoint.x - point.x) * amount)
    })

    intersections.sort((first, second) => first - second)

    for (let index = 0; index < intersections.length - 1; index += 2) {
      const startX = Math.ceil(intersections[index])
      const endX = Math.floor(intersections[index + 1])

      if (endX >= startX) {
        context.fillRect(startX, y, endX - startX + 1, 1)
      }
    }
  }
}

function strokePolyline(
  context: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  width = 1,
  closed = false
) {
  points.forEach((point, index) => {
    const nextPoint = points[index + 1]

    if (nextPoint) {
      pixelLine(context, point.x, point.y, nextPoint.x, nextPoint.y, color, width)
    }
  })

  if (closed && points.length > 1) {
    const firstPoint = points[0]
    const lastPoint = points[points.length - 1]

    pixelLine(context, lastPoint.x, lastPoint.y, firstPoint.x, firstPoint.y, color, width)
  }
}

function getBackgroundDetailLayer() {
  if (backgroundDetailLayerCache) {
    return backgroundDetailLayerCache
  }

  const layer = createSceneLayer()

  if (!layer) {
    return null
  }

  const { canvas, context } = layer

  for (let index = 0; index < 34; index += 1) {
    const x = (index * 29 + 17) % sceneWidth
    const y = 53 + ((index * 11 + 5) % 43)
    const alpha = 0.04 + (index % 4) * 0.012

    pixelRect(context, x, y, index % 3 === 0 ? 9 : 5, 1, `rgba(137, 151, 183, ${alpha})`)
  }

  for (let index = 0; index < 38; index += 1) {
    const x = (index * 41 + 11) % sceneWidth
    const y = 83 + ((index * 13 + 3) % 26)
    const alpha = 0.028 + (index % 5) * 0.009

    pixelRect(context, x, y, index % 4 === 0 ? 12 : 6, 1, `rgba(80, 103, 109, ${alpha})`)
  }

  backgroundDetailLayerCache = canvas

  return canvas
}

function getRoadDetailLayer() {
  if (roadDetailLayerCache) {
    return roadDetailLayerCache
  }

  const layer = createSceneLayer()

  if (!layer) {
    return null
  }

  const { canvas, context } = layer

  context.save()
  traceRoadSurfaceClip(context)
  context.clip()

  for (let index = 0; index < 190; index += 1) {
    const x = (index * 37 + 19) % sceneWidth
    const y = 91 + ((index * 53 + 7) % 88)
    const width = index % 11 === 0 ? 3 : index % 4 === 0 ? 2 : 1
    const alpha = 0.035 + ((index * 7) % 9) * 0.006
    const color = index % 5 === 0 ? '164, 178, 190' : index % 3 === 0 ? '64, 75, 91' : '16, 23, 36'

    pixelRect(context, x, y, width, 1, `rgba(${color}, ${alpha})`)
  }

  roadScratches.forEach((scratch) => {
    const end = rotatePoint(scratch.length, 0, scratch.angle)

    pixelLine(
      context,
      scratch.x,
      scratch.y,
      scratch.x + end.x,
      scratch.y + end.y,
      `rgba(148, 163, 176, ${scratch.alpha})`,
      scratch.width
    )
    pixelLine(
      context,
      scratch.x + 1,
      scratch.y + 2,
      scratch.x + end.x * 0.72,
      scratch.y + end.y * 0.72 + 2,
      `rgba(6, 10, 18, ${scratch.alpha * 0.72})`,
      1
    )
  })
  ;[
    { progress: 0.18, offset: -0.18, length: 0.18, width: 0.09 },
    { progress: 0.26, offset: 0.2, length: 0.16, width: 0.08 },
    { progress: 0.39, offset: 0.08, length: 0.2, width: 0.06 },
    { progress: 0.52, offset: -0.16, length: 0.16, width: 0.055 },
    { progress: 0.67, offset: 0.12, length: 0.14, width: 0.045 },
  ].forEach((patch, index) => {
    const sample = sampleRoad(patch.progress)
    const center = sampleRoadOffset(patch.progress, patch.offset)
    const halfLength = sample.roadWidth * patch.length
    const halfWidth = sample.roadWidth * patch.width
    const along = { x: sample.tangent.x * halfLength, y: sample.tangent.y * halfLength }
    const across = { x: sample.normal.x * halfWidth, y: sample.normal.y * halfWidth }

    fillPolygon(
      context,
      [
        { x: center.x - along.x - across.x, y: center.y - along.y - across.y },
        { x: center.x + along.x - across.x, y: center.y + along.y - across.y },
        { x: center.x + along.x + across.x, y: center.y + along.y + across.y },
        { x: center.x - along.x + across.x, y: center.y - along.y + across.y },
      ],
      index % 2 === 0 ? 'rgba(9, 14, 23, 0.28)' : 'rgba(51, 61, 76, 0.16)'
    )
    pixelLine(
      context,
      center.x - along.x * 0.8,
      center.y - along.y * 0.8,
      center.x + along.x * 0.72,
      center.y + along.y * 0.72,
      'rgba(121, 137, 151, 0.16)',
      1
    )
  })

  for (let index = 0; index < 26; index += 1) {
    const progress = 0.12 + ((index * 0.037) % 0.72)
    const sample = sampleRoad(progress)
    const puddle = sampleRoadOffset(progress, -0.24 + (index % 7) * 0.08)
    const length = Math.max(2, Math.round(sample.roadWidth * (0.08 + (index % 3) * 0.025)))
    const alpha = 0.05 + (index % 4) * 0.018

    pixelLine(
      context,
      puddle.x,
      puddle.y,
      puddle.x + sample.tangent.x * length,
      puddle.y + sample.tangent.y * length,
      `rgba(143, 163, 178, ${alpha})`,
      1
    )
  }

  for (let index = 0; index < 34; index += 1) {
    const progress = 0.08 + (index / 33) * 0.78
    const sample = sampleRoad(progress)
    const chip = index % 2 === 0 ? sample.upperEdge : sample.lowerEdge
    const jitter = Math.sin(index * 1.9)
    const size = Math.max(1, Math.round(sample.depthScale * 3))

    pixelRect(
      context,
      chip.x + sample.tangent.x * jitter * 3,
      chip.y + sample.tangent.y * jitter * 3,
      index % 3 === 0 ? size + 1 : size,
      1,
      index % 4 === 0 ? 'rgba(180, 190, 192, 0.18)' : 'rgba(7, 11, 20, 0.24)'
    )
  }

  context.restore()

  roadDetailLayerCache = canvas

  return canvas
}

function drawBackgroundDetailLayer(context: CanvasRenderingContext2D) {
  const layer = getBackgroundDetailLayer()

  if (layer) {
    context.drawImage(layer, 0, 0)
  }
}

function drawRoadDetailLayer(context: CanvasRenderingContext2D) {
  const layer = getRoadDetailLayer()

  if (layer) {
    context.drawImage(layer, 0, 0)
  }
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

function drawRotatedPolygon(
  context: CanvasRenderingContext2D,
  state: Pick<DriftState, 'car' | 'carAngle' | 'scale'>,
  points: Point[],
  angleOffset: number,
  color: string
) {
  const polygon = points.map((point) => {
    const rotated = rotatePoint(
      point.x * state.scale,
      point.y * state.scale,
      state.carAngle + angleOffset
    )

    return {
      x: state.car.x + rotated.x,
      y: state.car.y + rotated.y,
    }
  })

  fillPolygon(context, polygon, color)
}

function getCarVoxelPoseFrames(phase: number): VoxelPoseFrame[] {
  const segmentIndex = carVoxelPoseTimeline.findIndex((frame, index) => {
    const next = carVoxelPoseTimeline[index + 1]

    return next ? phase >= frame.phase && phase <= next.phase : false
  })

  if (segmentIndex === -1) {
    return [
      {
        pose:
          phase < carVoxelPoseTimeline[1].phase
            ? carVoxelPoseTimeline[0].pose
            : carVoxelPoseTimeline[carVoxelPoseTimeline.length - 1].pose,
        alpha: 1,
      },
    ]
  }

  const start = carVoxelPoseTimeline[segmentIndex]
  const end = carVoxelPoseTimeline[segmentIndex + 1]
  const segmentDuration = end.phase - start.phase
  const fadeStart = start.phase + segmentDuration * 0.68
  const amount = smootherstep((phase - fadeStart) / Math.max(0.001, end.phase - fadeStart))

  if (amount <= 0) {
    return [{ pose: start.pose, alpha: 1 }]
  }

  return [
    { pose: start.pose, alpha: 1 - amount },
    { pose: end.pose, alpha: amount },
  ]
}

function projectVoxelPoint(point: VoxelPoint, pose: VoxelCarPose) {
  const yaw = pose.yaw + (pose.yawOffset ?? 0)
  const sin = Math.sin(yaw)
  const cos = Math.cos(yaw)
  const rearWeight = clamp((-point.x - 5) / 30, 0, 1)
  const frontWeight = clamp((point.x - 5) / 30, 0, 1)
  const wheelWeight = point.z < 11 ? 1 : 0
  const pitchedZ =
    point.z * (1 - (pose.bodySquash ?? 0) * 0.03) +
    (pose.bodyPitch ?? 0) * (frontWeight - rearWeight * 0.7)
  const posedY = point.y + (pose.rearKick ?? 0) * rearWeight + (pose.wheelTurn ?? 0) * wheelWeight
  const yawX = point.x * cos - posedY * sin
  const yawY = point.x * sin + posedY * cos
  const suspensionDrop =
    (pose.suspension ?? 0) * (point.z > 10 ? 1 : 0.3) + (pose.spriteYOffset ?? 0)

  return {
    x: voxelSpriteWidth / 2 + (yawX + yawY * 0.34) * voxelRenderScale,
    y: 68 + (yawY * 0.38 - pitchedZ * 0.74 + suspensionDrop) * voxelRenderScale,
  }
}

function getVoxelFace(
  pose: VoxelCarPose,
  color: string,
  corners: VoxelPoint[],
  alpha = 1
): ProjectedVoxelFace {
  const projected = corners.map((corner) => projectVoxelPoint(corner, pose))
  const depth =
    corners.reduce((sum, corner) => {
      const yawY = corner.x * Math.sin(pose.yaw) + corner.y * Math.cos(pose.yaw)

      return sum + yawY + corner.z * 0.06
    }, 0) / corners.length

  return {
    alpha,
    color,
    depth,
    points: projected,
  }
}

function getVoxelFaces(cuboid: VoxelCuboid, pose: VoxelCarPose) {
  const cuboidAlpha = getPoseCuboidAlpha(cuboid, pose)

  if (cuboidAlpha <= 0.01) {
    return []
  }

  const depthScale = pose.depthScale ?? 1
  const x0 = cuboid.x - cuboid.width / 2
  const x1 = cuboid.x + cuboid.width / 2
  const y = cuboid.y * depthScale
  const depth = cuboid.depth * depthScale
  const y0 = y - depth / 2
  const y1 = y + depth / 2
  const z0 = cuboid.z - cuboid.height / 2
  const z1 = cuboid.z + cuboid.height / 2
  const faces: ProjectedVoxelFace[] = [
    getVoxelFace(
      pose,
      cuboid.palette.top,
      [
        { x: x0, y: y0, z: z1 },
        { x: x1, y: y0, z: z1 },
        { x: x1, y: y1, z: z1 },
        { x: x0, y: y1, z: z1 },
      ],
      0.96 * cuboidAlpha
    ),
  ]

  if (Math.sin(pose.yaw) >= 0) {
    faces.push(
      getVoxelFace(
        pose,
        cuboid.palette.side,
        [
          { x: x0, y: y1, z: z0 },
          { x: x1, y: y1, z: z0 },
          { x: x1, y: y1, z: z1 },
          { x: x0, y: y1, z: z1 },
        ],
        cuboidAlpha
      )
    )
  } else {
    faces.push(
      getVoxelFace(
        pose,
        cuboid.palette.side,
        [
          { x: x0, y: y0, z: z0 },
          { x: x1, y: y0, z: z0 },
          { x: x1, y: y0, z: z1 },
          { x: x0, y: y0, z: z1 },
        ],
        cuboidAlpha
      )
    )
  }

  if (Math.cos(pose.yaw) >= 0) {
    faces.push(
      getVoxelFace(
        pose,
        cuboid.palette.front,
        [
          { x: x1, y: y0, z: z0 },
          { x: x1, y: y1, z: z0 },
          { x: x1, y: y1, z: z1 },
          { x: x1, y: y0, z: z1 },
        ],
        cuboidAlpha
      )
    )
  } else {
    faces.push(
      getVoxelFace(
        pose,
        cuboid.palette.back,
        [
          { x: x0, y: y0, z: z0 },
          { x: x0, y: y1, z: z0 },
          { x: x0, y: y1, z: z1 },
          { x: x0, y: y0, z: z1 },
        ],
        cuboidAlpha
      )
    )
  }

  return faces
}

function getPoseCuboidAlpha(cuboid: VoxelCuboid, pose: VoxelCarPose) {
  let alpha = pose.detailAlpha ?? 1

  const isFront = cuboid.x > 20
  const isRear = cuboid.x < -24
  const isFarWheel = cuboid.palette === voxelPalettes.rubber && cuboid.y > 0
  const isFarRim = cuboid.palette === voxelPalettes.rim && cuboid.y > 0
  const isHeadlight = cuboid.palette === voxelPalettes.warmWhite && cuboid.x > 18
  const isFrontMarker = cuboid.palette === voxelPalettes.amber && cuboid.x > 28
  const isRearLight =
    cuboid.palette === voxelPalettes.red || (cuboid.palette === voxelPalettes.amber && isRear)

  if (isFront) {
    alpha *= pose.frontDetailAlpha ?? 1
  }

  if (isHeadlight || isFrontMarker) {
    alpha *= (pose.headlightAlpha ?? 1) * (pose.headlightEmphasis ?? 1)
  }

  if (isFarWheel || isFarRim) {
    alpha *= pose.farWheelAlpha ?? 1
  }

  if (isRearLight || (isRear && cuboid.palette === voxelPalettes.black)) {
    alpha *= (pose.rearDetailAlpha ?? 1) * (pose.rearEmphasis ?? 1)
  }

  return clamp(alpha, 0, 1)
}

function drawVoxelFace(context: CanvasRenderingContext2D, face: ProjectedVoxelFace) {
  context.save()
  context.globalAlpha = context.globalAlpha * face.alpha
  fillPolygon(context, face.points, face.color)
  strokePolyline(context, face.points, 'rgba(2, 3, 8, 0.22)', voxelRenderScale, true)
  context.restore()
}

function drawVoxelProjectedLine(
  context: CanvasRenderingContext2D,
  pose: VoxelCarPose,
  start: VoxelPoint,
  end: VoxelPoint,
  color: string,
  width = 1
) {
  const projectedStart = projectVoxelPoint(start, pose)
  const projectedEnd = projectVoxelPoint(end, pose)

  pixelLine(
    context,
    projectedStart.x,
    projectedStart.y,
    projectedEnd.x,
    projectedEnd.y,
    color,
    width * voxelRenderScale
  )
}

function drawVoxelProjectedRect(
  context: CanvasRenderingContext2D,
  pose: VoxelCarPose,
  point: VoxelPoint,
  width: number,
  height: number,
  color: string
) {
  const projected = projectVoxelPoint(point, pose)

  pixelRect(
    context,
    projected.x - (width * voxelRenderScale) / 2,
    projected.y - (height * voxelRenderScale) / 2,
    width * voxelRenderScale,
    height * voxelRenderScale,
    color
  )
}

function drawVoxelCarDetails(context: CanvasRenderingContext2D, pose: VoxelCarPose) {
  const isLatePose = pose.name.startsWith('recovery') || pose.name.startsWith('exit')
  const isApexPose = pose.name.startsWith('apex') || pose.name.startsWith('drift-init')
  const frontDetailAlpha = pose.frontDetailAlpha ?? 1
  const headlightAlpha = pose.headlightAlpha ?? 1
  const rearDetailAlpha = pose.rearDetailAlpha ?? 1
  const rearEmphasis = pose.rearEmphasis ?? 1
  const headlightEmphasis = pose.headlightEmphasis ?? 1
  const detailAlpha = pose.detailAlpha ?? 1
  const lightJitter = pose.lightJitter ?? 0
  const wheelTurn = pose.wheelTurn ?? 0
  const seamAlpha = isLatePose ? 0.46 : 0.72
  const bodyShadeAlpha = pose.bodyShadeAlpha ?? 0.1

  drawVoxelProjectedLine(
    context,
    pose,
    { x: -22, y: -11.7, z: 13 },
    { x: 24, y: -11.7, z: 13 },
    'rgba(8, 10, 15, 0.72)'
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: -5, y: -11.8, z: 23 },
    { x: -5, y: 11.8, z: 23 },
    'rgba(3, 5, 10, 0.55)'
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: -25, y: -8.6, z: 25 },
    { x: -10, y: -8.6, z: 27 },
    `rgba(112, 131, 154, ${0.34 * detailAlpha * rearEmphasis})`
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: -23, y: 8.4, z: 24 },
    { x: -9, y: 8.4, z: 25 },
    `rgba(18, 26, 41, ${0.5 * detailAlpha * rearEmphasis})`
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: 9, y: -11.8, z: 20 },
    { x: 9, y: 11.8, z: 20 },
    'rgba(3, 5, 10, 0.45)'
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: -10, y: -8.5, z: 27 },
    { x: 11, y: -8.5, z: 27 },
    'rgba(255, 255, 248, 0.82)'
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: -22, y: 8.7, z: 13 },
    { x: 23, y: 8.7, z: 13 },
    `rgba(255, 255, 246, ${isLatePose ? 0.32 : 0.48})`
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: -20, y: -10.5, z: 18 },
    { x: 27, y: -8, z: 18 },
    `rgba(39, 49, 57, ${bodyShadeAlpha})`,
    2
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: 4, y: -6.5, z: 18 },
    { x: 28, y: -4.8, z: 18 },
    `rgba(132, 139, 139, ${0.34 * detailAlpha * frontDetailAlpha})`
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: 5, y: 5.8, z: 17 },
    { x: 28, y: 4.3, z: 17 },
    `rgba(241, 245, 239, ${0.3 * detailAlpha * frontDetailAlpha})`
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: 18, y: -8.8, z: 20 },
    { x: 29, y: -7.1, z: 20 },
    `rgba(255, 255, 245, ${0.34 * detailAlpha * headlightEmphasis})`
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: -18, y: 9.5, z: 15 },
    { x: 25, y: 7.4, z: 15 },
    `rgba(5, 8, 13, ${bodyShadeAlpha * 1.25})`,
    2
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: 4, y: -7.5, z: 24 },
    { x: 18, y: -6.7, z: 22 },
    `rgba(154, 163, 164, ${bodyShadeAlpha * 1.3})`
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: -2, y: -10.7, z: 13 },
    { x: -2, y: 9.4, z: 13 },
    `rgba(7, 9, 14, ${0.38 * detailAlpha})`
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: 10, y: -10.4, z: 12 },
    { x: 10, y: 8.8, z: 12 },
    `rgba(7, 9, 14, ${0.32 * detailAlpha})`
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: -3, y: -7, z: 14 },
    { x: 28, y: -5, z: 16 },
    `rgba(219, 225, 221, ${seamAlpha})`
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: 1, y: 6, z: 14 },
    { x: 28, y: 5, z: 16 },
    `rgba(158, 168, 168, ${seamAlpha * 0.65})`
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: -15, y: -11, z: 17 },
    { x: -15, y: 10, z: 17 },
    'rgba(3, 5, 10, 0.42)'
  )
  drawVoxelProjectedLine(
    context,
    pose,
    { x: 17, y: -11, z: 13 },
    { x: 17, y: 10, z: 13 },
    `rgba(4, 6, 11, ${frontDetailAlpha * 0.36})`
  )
  drawVoxelProjectedRect(context, pose, { x: -11, y: -12.5, z: 16 }, 3, 1, '#dfe4df')
  drawVoxelProjectedRect(context, pose, { x: 8, y: -12.5, z: 16 }, 2, 1, '#9aa5a8')
  drawVoxelProjectedRect(
    context,
    pose,
    { x: 13, y: -13.2, z: 17 },
    3,
    1,
    `rgba(5, 7, 10, ${0.62 * detailAlpha})`
  )
  drawVoxelProjectedRect(
    context,
    pose,
    { x: 13, y: 13.2, z: 16 },
    3,
    1,
    `rgba(5, 7, 10, ${0.48 * detailAlpha})`
  )

  if (!isLatePose) {
    drawVoxelProjectedLine(
      context,
      pose,
      { x: 8, y: -7, z: 14 },
      { x: 28, y: -5, z: 16 },
      'rgba(180, 186, 183, 0.7)'
    )
    drawVoxelProjectedLine(
      context,
      pose,
      { x: 10, y: 7, z: 14 },
      { x: 29, y: 5, z: 16 },
      'rgba(255, 255, 246, 0.36)'
    )
    drawVoxelProjectedLine(
      context,
      pose,
      { x: 18, y: -11.9, z: 10 },
      { x: 28, y: -11.9, z: 11 },
      `rgba(8, 10, 15, ${0.62 * frontDetailAlpha})`,
      2
    )
    drawVoxelProjectedLine(
      context,
      pose,
      { x: 18, y: 11.9, z: 10 },
      { x: 28, y: 11.9, z: 11 },
      `rgba(8, 10, 15, ${0.46 * frontDetailAlpha})`,
      2
    )
  } else {
    drawVoxelProjectedLine(
      context,
      pose,
      { x: -31, y: -8, z: 15 },
      { x: -26, y: 8, z: 15 },
      `rgba(255, 70, 86, ${clamp(0.5 * rearDetailAlpha * rearEmphasis, 0, 1)})`
    )
    drawVoxelProjectedLine(
      context,
      pose,
      { x: -25, y: -9, z: 20 },
      { x: -16, y: 8, z: 20 },
      'rgba(18, 23, 32, 0.8)'
    )
    drawVoxelProjectedLine(
      context,
      pose,
      { x: -29, y: -8, z: 22 },
      { x: -20, y: 7, z: 22 },
      `rgba(80, 95, 116, ${clamp(0.62 * rearDetailAlpha * rearEmphasis, 0, 1)})`
    )
    drawVoxelProjectedLine(
      context,
      pose,
      { x: -35, y: -8, z: 10 },
      { x: -35, y: 8, z: 10 },
      `rgba(5, 7, 11, ${0.72 * rearEmphasis})`,
      2
    )
    drawVoxelProjectedRect(
      context,
      pose,
      { x: -35, y: 0, z: 15 },
      5,
      1,
      `rgba(152, 166, 170, ${0.35 * rearEmphasis})`
    )
  }

  drawVoxelProjectedRect(context, pose, { x: 2, y: -12.4, z: 15 }, 4, 2, '#0b0d12')
  drawVoxelProjectedRect(context, pose, { x: -8, y: 12.4, z: 14 }, 4, 2, '#080a0f')

  if (frontDetailAlpha > 0.45) {
    drawVoxelProjectedRect(
      context,
      pose,
      { x: 25, y: -12.7, z: 17 },
      4,
      2,
      `rgba(5, 7, 11, ${frontDetailAlpha})`
    )
  }

  if (headlightAlpha > 0.2) {
    drawVoxelProjectedRect(
      context,
      pose,
      { x: 29, y: -8 + lightJitter, z: 15 },
      isLatePose ? 3 : 4,
      isLatePose ? 1 : 2,
      `rgba(255, 242, 176, ${0.42 * headlightAlpha * headlightEmphasis})`
    )
    drawVoxelProjectedRect(
      context,
      pose,
      { x: 30, y: 8 + lightJitter * 0.5, z: 15 },
      isLatePose ? 2 : 3,
      1,
      `rgba(255, 251, 213, ${0.34 * headlightAlpha * headlightEmphasis})`
    )
  }

  drawVoxelProjectedRect(
    context,
    pose,
    { x: -30, y: -12.8, z: 12 },
    isLatePose ? 7 : 6,
    3,
    `rgba(196, 30, 52, ${clamp(0.86 * rearDetailAlpha * rearEmphasis, 0, 1)})`
  )
  drawVoxelProjectedRect(
    context,
    pose,
    { x: -30, y: 12.8, z: 12 },
    isLatePose ? 7 : 6,
    3,
    `rgba(239, 53, 77, ${clamp(0.92 * rearDetailAlpha * rearEmphasis, 0, 1)})`
  )
  drawVoxelProjectedRect(
    context,
    pose,
    { x: -31, y: 0, z: 14 },
    isLatePose ? 5 : 3,
    1,
    `rgba(255, 139, 101, ${clamp(0.46 * rearDetailAlpha * rearEmphasis, 0, 1)})`
  )
  ;[
    { x: -19, y: -14.4, z: 9, size: isLatePose ? 2 : 3, steer: -wheelTurn * 1.6 },
    { x: 15, y: -14.4, z: 9, size: isLatePose ? 2 : 3, steer: wheelTurn * 2 },
    { x: -19, y: 14.4, z: 9, size: isLatePose ? 1 : 2, steer: -wheelTurn },
    { x: 15, y: 14.4, z: 9, size: isLatePose ? 1 : 2, steer: wheelTurn * 1.4 },
  ].forEach((wheel, index) => {
    const alpha = (index > 1 && isLatePose ? 0.28 : 0.7) * detailAlpha
    const spokeLength = Math.max(2, wheel.size + (isApexPose ? 2 : 0))
    const wheelPhase = (pose.wheelPhase ?? 0) + index * 0.25

    drawVoxelProjectedRect(context, pose, wheel, wheel.size, 1, `rgba(202, 211, 211, ${alpha})`)
    drawVoxelProjectedLine(
      context,
      pose,
      {
        x: wheel.x - spokeLength / 2,
        y: wheel.y,
        z: wheel.z + wheel.steer + Math.sin(wheelPhase * Math.PI * 2),
      },
      {
        x: wheel.x + spokeLength / 2,
        y: wheel.y,
        z: wheel.z - wheel.steer + Math.cos(wheelPhase * Math.PI * 2),
      },
      `rgba(91, 101, 110, ${0.44 * alpha})`
    )
    drawVoxelProjectedRect(
      context,
      pose,
      { ...wheel, z: wheel.z - 2 },
      Math.max(1, wheel.size - 1),
      1,
      `rgba(7, 9, 13, ${0.7})`
    )
  })
}

function getCarVoxelSprite(pose: VoxelCarPose) {
  const cached = carVoxelSpriteCache.get(pose.name)

  if (cached) {
    return cached
  }

  if (typeof document === 'undefined') {
    return null
  }

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  canvas.width = voxelSpriteWidth
  canvas.height = voxelSpriteHeight

  if (!context) {
    return null
  }

  context.imageSmoothingEnabled = false

  const shadowPoints = [
    { x: 46, y: 75 },
    { x: 124, y: 70 },
    { x: 139, y: 79 },
    { x: 60, y: 88 },
  ]

  fillPolygon(context, shadowPoints, 'rgba(2, 4, 10, 0.42)')

  const faces = carVoxelModel.flatMap((cuboid) => getVoxelFaces(cuboid, pose))
  faces.sort((first, second) => first.depth - second.depth)
  faces.forEach((face) => drawVoxelFace(context, face))
  drawVoxelCarDetails(context, pose)

  carVoxelSpriteCache.set(pose.name, canvas)

  return canvas
}

function sampleSmokePoint(state: Pick<DriftState, 'car' | 'carAngle' | 'scale'>) {
  const rearWheel = rotatePoint(-16 * state.scale, 8 * state.scale, state.carAngle)

  return {
    x: state.car.x + rearWheel.x,
    y: state.car.y + rearWheel.y,
  }
}

function sampleCarPoint(
  state: Pick<DriftState, 'car' | 'carAngle' | 'scale'>,
  x: number,
  y: number
) {
  const point = rotatePoint(x * state.scale, y * state.scale, state.carAngle)

  return {
    x: state.car.x + point.x,
    y: state.car.y + point.y,
  }
}

function getBodyRoll(phase: number, driftLean: number) {
  return Math.sin(phase * Math.PI * 8 + 0.55) * driftLean * 1.2
}

function getSuspensionLoad(phase: number, driftLean: number) {
  const entryCompression = smoothstep(pulseNear(phase, 0.22, 0.12)) * 1.15
  const apexSettle = smoothstep(pulseNear(phase, 0.48, 0.16)) * 0.45
  const recoveryLift = smoothstep(pulseNear(phase, 0.62, 0.11)) * -0.35

  return (entryCompression + apexSettle + recoveryLift) * (0.45 + driftLean * 0.55)
}

function getWheelFrame(phase: number, driftLean: number, opacity: number) {
  if (opacity < 0.12 || driftLean < 0.08) {
    return 0
  }

  return Math.floor(phase * 72) % 2
}

function getDriftState(phase: number): DriftState {
  const routePhase = clamp(phase, 0, 1)
  const progress = clamp(
    sampleMotionValue(routePhase, (keyframe) => keyframe.progress),
    0,
    1
  )
  const road = sampleRoad(progress)
  const driftLean = clamp(
    sampleMotionValue(routePhase, (keyframe) => keyframe.driftLean),
    0,
    1
  )
  const driftSway = Math.sin(routePhase * Math.PI * 2) * 0.035 * driftLean
  const lateralOffset =
    sampleMotionValue(routePhase, (keyframe) => keyframe.lateralOffset) + driftSway
  const opacity = clamp(
    sampleMotionValue(routePhase, (keyframe) => keyframe.opacity),
    0,
    1
  )
  const carAngle =
    Math.atan2(road.tangent.y, road.tangent.x) -
    driftLean * 0.1 +
    sampleMotionValue(routePhase, (keyframe) => keyframe.slideLag) * 0.1
  const slideProgress = clamp(
    progress - sampleMotionValue(routePhase, (keyframe) => keyframe.slideLag),
    0,
    1
  )
  const slideRoad = sampleRoad(slideProgress)
  const brakePulse = smoothstep(pulseNear(routePhase, 0.47, 0.18))
  const suspensionLoad = getSuspensionLoad(routePhase, driftLean)
  const animationEnergy = clamp(
    opacity * (0.25 + driftLean * 0.7 + brakePulse * 0.32 + suspensionLoad * 0.18),
    0,
    1.25
  )
  const state: DriftState = {
    animationEnergy,
    bodyRoll: getBodyRoll(routePhase, driftLean),
    brakePulse,
    car: {
      x: road.center.x + road.normal.x * road.roadWidth * lateralOffset,
      y: road.center.y + road.normal.y * road.roadWidth * lateralOffset + suspensionLoad * 0.7,
    },
    carAngle,
    driftLean,
    glow:
      clamp(
        sampleMotionValue(routePhase, (keyframe) => keyframe.glow),
        0,
        1.1
      ) +
      Math.sin(routePhase * Math.PI * 10) * 0.05,
    opacity,
    phase: routePhase,
    scale: clamp(road.depthScale * (1 + driftLean * 0.04), 0.16, 1.5),
    slideAngle: Math.atan2(slideRoad.tangent.y, slideRoad.tangent.x) - driftLean * 0.34,
    smoke: { x: 0, y: 0 },
    smokeIntensity: clamp(
      sampleMotionValue(routePhase, (keyframe) => keyframe.smokeIntensity),
      0,
      1
    ),
    suspensionLoad,
    wheelFrame: getWheelFrame(routePhase, driftLean, opacity),
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

  pixelLine(context, 56, 74, 98, 78, 'rgba(89, 105, 132, 0.16)')
  pixelLine(context, 119, 76, 163, 92, 'rgba(111, 127, 151, 0.12)')
  pixelLine(context, 201, 79, 253, 96, 'rgba(94, 110, 139, 0.14)')
  pixelLine(context, 265, 83, 314, 96, 'rgba(103, 119, 144, 0.1)')

  fillPolygon(
    context,
    [
      { x: 151, y: 91 },
      { x: 158, y: 86 },
      { x: 164, y: 89 },
      { x: 171, y: 84 },
      { x: 179, y: 90 },
      { x: 188, y: 86 },
      { x: 199, y: 91 },
      { x: 209, y: 85 },
      { x: 219, y: 90 },
      { x: 231, y: 86 },
      { x: 242, y: 91 },
      { x: 258, y: 87 },
      { x: 276, y: 92 },
      { x: 302, y: 88 },
      { x: 320, y: 94 },
      { x: 320, y: 107 },
      { x: 151, y: 107 },
    ],
    'rgba(8, 16, 25, 0.42)'
  )
  ;[
    { x: 164, y: 87, w: 5, h: 8 },
    { x: 185, y: 86, w: 4, h: 10 },
    { x: 212, y: 84, w: 6, h: 12 },
    { x: 238, y: 88, w: 5, h: 8 },
    { x: 266, y: 86, w: 4, h: 10 },
    { x: 292, y: 87, w: 6, h: 9 },
  ].forEach((building, index) => {
    pixelRect(
      context,
      building.x,
      building.y,
      building.w,
      building.h,
      index % 2 === 0 ? 'rgba(6, 13, 22, 0.52)' : 'rgba(9, 18, 28, 0.44)'
    )
  })
  strokePolyline(
    context,
    [
      { x: 148, y: 96 },
      { x: 169, y: 93 },
      { x: 191, y: 97 },
      { x: 215, y: 94 },
      { x: 238, y: 98 },
      { x: 263, y: 95 },
      { x: 295, y: 99 },
    ],
    'rgba(71, 91, 109, 0.2)',
    1
  )
  ;[
    { x: 151, y: 95, color: '#e5b05e' },
    { x: 176, y: 94, color: '#95e0ee' },
    { x: 203, y: 96, color: '#f4cf88' },
    { x: 229, y: 95, color: '#ed9d62' },
    { x: 257, y: 97, color: '#d6e4a5' },
    { x: 286, y: 98, color: '#f0c56d' },
  ].forEach((marker, index) => {
    const twinkle = 0.5 + 0.5 * Math.sin((phase + index * 0.157) * Math.PI * 2)
    pixelRect(context, marker.x, marker.y, twinkle > 0.35 ? 2 : 1, 1, marker.color)
  })
  ;[
    [
      { x: 136, y: 91 },
      { x: 149, y: 88 },
      { x: 162, y: 90 },
      { x: 178, y: 87 },
    ],
    [
      { x: 191, y: 91 },
      { x: 211, y: 88 },
      { x: 232, y: 91 },
      { x: 254, y: 89 },
      { x: 279, y: 92 },
    ],
  ].forEach((road, roadIndex) => {
    strokePolyline(
      context,
      road,
      roadIndex === 0 ? 'rgba(86, 107, 126, 0.18)' : 'rgba(69, 88, 108, 0.16)',
      1
    )
    road.forEach((point, index) => {
      const twinkle = 0.5 + 0.5 * Math.sin((phase + roadIndex * 0.21 + index * 0.091) * Math.PI * 2)

      if (twinkle > 0.42) {
        pixelRect(
          context,
          point.x,
          point.y - 1,
          index % 2 === 0 ? 2 : 1,
          1,
          roadIndex === 0 ? '#f0c56d' : '#95e0ee'
        )
      }
    })
  })

  for (let cluster = 0; cluster < 5; cluster += 1) {
    const baseX = 151 + cluster * 31
    const baseY = 91 + (cluster % 2) * 3

    for (let lightIndex = 0; lightIndex < 8; lightIndex += 1) {
      const x = baseX + ((lightIndex * 7 + cluster * 3) % 24)
      const y = baseY + ((lightIndex * 5 + cluster) % 8)
      const twinkle =
        0.42 + 0.58 * Math.sin((phase + cluster * 0.13 + lightIndex * 0.071) * Math.PI * 2)

      if (twinkle > 0.16) {
        pixelRect(
          context,
          x,
          y,
          twinkle > 0.72 ? 2 : 1,
          1,
          lightIndex % 3 === 0 ? '#f3c778' : lightIndex % 3 === 1 ? '#8dd5df' : '#d6e4a5'
        )
      }
    }
  }

  valleyLights.forEach((light) => {
    const twinkle = 0.45 + 0.55 * Math.sin((phase + light.phase) * Math.PI * 2)
    const glowAlpha = 0.08 + twinkle * 0.08

    pixelRect(context, light.x - 2, light.y, 5, 1, `rgba(247, 208, 132, ${glowAlpha})`)
    pixelRect(context, light.x, light.y - 1, 1, 3, `rgba(133, 213, 223, ${glowAlpha * 0.7})`)
    pixelRect(context, light.x, light.y, twinkle > 0.45 ? 2 : 1, 1, light.color)
    if (light.phase > 0.45) {
      pixelRect(context, light.x + 4, light.y + 2, 1, 1, `rgba(231, 173, 95, ${glowAlpha})`)
    }
    if (twinkle > 0.82) {
      pixelRect(context, light.x - 1, light.y, 1, 1, '#fff4bc')
    }
  })
}

function drawTrees(context: CanvasRenderingContext2D, phase: number) {
  for (let index = 0; index < 17; index += 1) {
    const x = 3 + index * 19
    const y = 101 + Math.sin(index * 1.8) * 7
    const height = 10 + ((index * 7) % 14)

    fillPolygon(
      context,
      [
        { x, y: y - height },
        { x: x - 8, y: y + 2 },
        { x: x + 8, y: y + 2 },
      ],
      index % 2 === 0 ? '#0a1c1d' : '#0b2020'
    )
  }

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
    pixelLine(
      context,
      tree.x + 2 + sway,
      tree.y - tree.h + 8,
      tree.x + 6 + sway,
      tree.y - 8,
      'rgba(34, 70, 61, 0.22)'
    )
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
    pixelLine(
      context,
      tree.x + 4 + sway,
      tree.y - tree.h + 12,
      tree.x + 11 + sway,
      tree.y + 7,
      'rgba(34, 78, 63, 0.18)'
    )
    pixelRect(context, tree.x - 10 + sway, tree.y - 22, 5, 1, 'rgba(41, 91, 74, 0.12)')
    pixelRect(context, tree.x + 8 + sway, tree.y - 35, 4, 1, 'rgba(48, 101, 82, 0.1)')
  })
}

function drawRoad(context: CanvasRenderingContext2D, phase: number) {
  const samples = getRoadSamples(34)
  const upperEdge = samples.map((sample) => sample.upperEdge)
  const lowerEdge = samples.map((sample) => sample.lowerEdge)
  const roadPolygon = [...upperEdge, ...lowerEdge.slice().reverse()]
  const innerUpper = samples.map((sample) => ({
    x: sample.center.x - sample.normal.x * sample.roadWidth * 0.34,
    y: sample.center.y - sample.normal.y * sample.roadWidth * 0.34,
  }))
  const innerLower = samples.map((sample) => ({
    x: sample.center.x + sample.normal.x * sample.roadWidth * 0.34,
    y: sample.center.y + sample.normal.y * sample.roadWidth * 0.34,
  }))

  fillPolygon(context, roadPolygon, '#202738')
  fillPolygon(context, [...innerUpper, ...innerLower.slice().reverse()], '#171d2c')

  samples.slice(1).forEach((sample, index) => {
    const previous = samples[index]
    const depth = 1 - sample.progress
    const bandAlpha = 0.014 + depth * 0.024

    if (index % 3 === 0) {
      fillPolygon(
        context,
        [previous.upperEdge, sample.upperEdge, sample.lowerEdge, previous.lowerEdge],
        `rgba(255, 255, 255, ${bandAlpha})`
      )
    }
  })

  strokePolyline(context, upperEdge, '#49566a', 2)
  strokePolyline(context, lowerEdge, '#4a5264', 1)
  strokePolyline(
    context,
    samples.map((sample) => ({
      x: sample.center.x - sample.normal.x * sample.roadWidth * 0.08,
      y: sample.center.y - sample.normal.y * sample.roadWidth * 0.08,
    })),
    'rgba(92, 105, 125, 0.34)',
    1
  )

  for (let dash = 0; dash < 9; dash += 1) {
    const progress = 0.1 + dash * 0.092
    const sample = sampleRoad(progress)
    const shimmer = Math.sin((phase + dash / 9) * Math.PI * 2)
    const dashCenter = sampleRoadOffset(progress, 0.02 + shimmer * 0.01)
    const dashLength = Math.max(2, sample.roadWidth * 0.14)
    const dashEnd = {
      x: dashCenter.x + sample.tangent.x * dashLength,
      y: dashCenter.y + sample.tangent.y * dashLength,
    }
    const color = progress > 0.62 ? '#5f6674' : '#848b93'

    pixelLine(
      context,
      dashCenter.x,
      dashCenter.y,
      dashEnd.x,
      dashEnd.y,
      color,
      progress > 0.35 ? 1 : 2
    )
  }

  ;[0.17, 0.29, 0.41, 0.56, 0.71].forEach((progress, index) => {
    const sample = sampleRoad(progress)
    const scratchStart = sampleRoadOffset(progress, 0.2 - index * 0.05)
    const scratchEnd = {
      x: scratchStart.x + sample.tangent.x * sample.roadWidth * (0.28 - index * 0.025),
      y: scratchStart.y + sample.tangent.y * sample.roadWidth * (0.28 - index * 0.025),
    }

    pixelLine(
      context,
      scratchStart.x,
      scratchStart.y,
      scratchEnd.x,
      scratchEnd.y,
      index % 2 === 0 ? 'rgba(7, 10, 18, 0.48)' : 'rgba(99, 113, 128, 0.2)',
      1
    )
  })

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
  ;[0.38, 0.56, 0.74].forEach((progress, index) => {
    const sample = sampleRoad(progress)
    const start = sampleRoadOffset(progress, -0.2 + index * 0.11)
    const end = {
      x: start.x + sample.tangent.x * sample.roadWidth * 0.32,
      y: start.y + sample.tangent.y * sample.roadWidth * 0.32,
    }

    pixelLine(
      context,
      start.x,
      start.y,
      end.x,
      end.y,
      `rgba(166, 184, 197, ${0.12 + roadHighlight * 0.18})`,
      1
    )
  })
}

function drawGuardrails(context: CanvasRenderingContext2D, phase: number) {
  const shine = 0.5 + 0.45 * Math.sin(phase * Math.PI * 2)
  const samples = getRoadSamples(30)
  const upperRail = samples.map((sample) => ({
    x: sample.upperEdge.x - sample.normal.x * (4 + sample.depthScale * 2),
    y: sample.upperEdge.y - sample.normal.y * (4 + sample.depthScale * 2),
  }))
  const lowerRail = samples.slice(0, 22).map((sample) => ({
    x: sample.lowerEdge.x + sample.normal.x * (3 + sample.depthScale * 2),
    y: sample.lowerEdge.y + sample.normal.y * (3 + sample.depthScale * 2),
  }))

  strokePolyline(context, upperRail, '#96a0a9', 2)
  strokePolyline(context, upperRail, `rgba(208, 220, 222, ${shine})`, 1)
  strokePolyline(context, lowerRail, 'rgba(57, 68, 82, 0.78)', 2)
  strokePolyline(context, lowerRail, `rgba(180, 194, 199, ${0.25 + shine * 0.22})`, 1)

  for (let index = 2; index < samples.length; index += 3) {
    const sample = samples[index]
    const postTop = {
      x: sample.upperEdge.x - sample.normal.x * (4 + sample.depthScale * 2),
      y: sample.upperEdge.y - sample.normal.y * (4 + sample.depthScale * 2),
    }
    const postHeight = 5 + sample.depthScale * 9

    pixelLine(context, postTop.x, postTop.y, postTop.x - 1, postTop.y + postHeight, '#52606a', 1)
    pixelRect(context, postTop.x - 1, postTop.y - 1, 3, 1, 'rgba(210, 220, 218, 0.42)')
    if (index % 2 === 0) {
      pixelRect(context, postTop.x + 1, postTop.y + 2, 1, 1, 'rgba(255, 224, 132, 0.5)')
    }
  }

  for (let index = 1; index < lowerRail.length; index += 3) {
    const point = lowerRail[index]
    const sample = samples[index]
    const postHeight = 4 + sample.depthScale * 7

    pixelLine(context, point.x, point.y, point.x - 1, point.y + postHeight, '#303b49', 1)
    pixelRect(context, point.x - 1, point.y - 1, 3, 1, 'rgba(210, 220, 218, 0.28)')
  }
}

function drawForegroundGuardrail(context: CanvasRenderingContext2D, phase: number) {
  const shine = 0.38 + 0.36 * Math.sin((phase + 0.21) * Math.PI * 2)
  const railSamples = getForegroundRailSamples(30)

  if (railSamples.length < 2) {
    return
  }

  const railPoints = railSamples.map((sample) => sample.point)
  const lowerRailPoints = railSamples.map((sample) => ({
    x: sample.point.x + sample.normal.x * (7 + sample.depthScale * 6),
    y: sample.point.y + sample.normal.y * (7 + sample.depthScale * 6) + sample.depthScale * 2,
  }))
  const shadowPoints = [
    ...railSamples.map((sample) => sample.point),
    ...railSamples
      .slice()
      .reverse()
      .map((sample) => ({
        x: sample.point.x + sample.normal.x * (8 + sample.depthScale * 10),
        y: sample.point.y + sample.normal.y * (8 + sample.depthScale * 10) + sample.depthScale * 3,
      })),
  ]

  fillPolygon(context, shadowPoints, 'rgba(1, 4, 10, 0.38)')

  railSamples.slice(1).forEach((sample, index) => {
    const previous = railSamples[index]
    const previousLower = lowerRailPoints[index]
    const lower = lowerRailPoints[index + 1]
    const width = Math.max(1, Math.round(1 + sample.depthScale * 2.1))
    const highlightWidth = Math.max(1, Math.round(sample.depthScale * 1.1))

    pixelLine(
      context,
      previousLower.x,
      previousLower.y,
      lower.x,
      lower.y,
      'rgba(18, 25, 34, 0.92)',
      Math.max(1, width)
    )
    pixelLine(
      context,
      previousLower.x,
      previousLower.y - 1,
      lower.x,
      lower.y - 1,
      `rgba(111, 126, 138, ${0.16 + shine * 0.16})`,
      1
    )
    pixelLine(
      context,
      previous.point.x,
      previous.point.y + 3,
      sample.point.x,
      sample.point.y + 3,
      'rgba(2, 5, 12, 0.88)',
      width + 2
    )
    pixelLine(
      context,
      previous.point.x,
      previous.point.y,
      sample.point.x,
      sample.point.y,
      '#64707c',
      width
    )
    pixelLine(
      context,
      previous.point.x,
      previous.point.y - 2,
      sample.point.x,
      sample.point.y - 2,
      `rgba(219, 229, 226, ${0.28 + shine * 0.35})`,
      highlightWidth
    )

    if (index % 2 === 0) {
      const seam = {
        x: lerp(previous.point.x, sample.point.x, 0.54),
        y: lerp(previous.point.y, sample.point.y, 0.54),
      }
      const boltAlpha = 0.24 + shine * 0.22

      pixelLine(
        context,
        seam.x,
        seam.y - 3,
        seam.x + sample.normal.x * (2 + sample.depthScale * 2),
        seam.y + sample.normal.y * (2 + sample.depthScale * 2),
        `rgba(8, 13, 20, ${0.5 + sample.depthScale * 0.2})`,
        1
      )
      pixelRect(context, seam.x - 1, seam.y - 2, 1, 1, `rgba(230, 239, 232, ${boltAlpha})`)
      pixelRect(context, seam.x + 2, seam.y - 1, 1, 1, `rgba(136, 153, 163, ${boltAlpha})`)
    }
  })

  railSamples.forEach((sample, index) => {
    if (index % 3 !== 1) {
      return
    }

    const depth = sample.depthScale
    const postEnd = lowerRailPoints[index]
    const postFoot = {
      x: postEnd.x + sample.normal.x * (5 + depth * 8),
      y: postEnd.y + sample.normal.y * (5 + depth * 8) + depth * 2,
    }
    const postWidth = Math.max(1, Math.round(depth * 1.6))
    const reflectorAlpha = 0.28 + shine * 0.34

    pixelLine(context, sample.point.x, sample.point.y, postEnd.x, postEnd.y, '#273342', postWidth)
    pixelLine(
      context,
      sample.point.x + 1,
      sample.point.y,
      postEnd.x + 1,
      postEnd.y - 2,
      `rgba(132, 148, 157, ${0.44 + depth * 0.22})`,
      1
    )
    pixelLine(
      context,
      postEnd.x,
      postEnd.y,
      postFoot.x,
      postFoot.y,
      `rgba(12, 18, 27, ${0.36 + depth * 0.16})`,
      postWidth
    )
    pixelRect(
      context,
      sample.point.x - 2,
      sample.point.y - 3,
      Math.max(2, Math.round(depth * 4)),
      1,
      index % 4 === 1
        ? `rgba(255, 199, 91, ${reflectorAlpha})`
        : `rgba(230, 238, 232, ${reflectorAlpha})`
    )
  })

  railPoints
    .filter((_, index) => index % 4 === 0)
    .forEach((point, index) => {
      pixelRect(
        context,
        point.x + index,
        point.y - 1,
        index % 2 === 0 ? 4 : 2,
        1,
        index % 3 === 0 ? '#e6ece8' : '#76828e'
      )
    })
}

function drawFog(context: CanvasRenderingContext2D, phase: number, reducedMotion: boolean) {
  const drift = reducedMotion ? 0.25 : 1

  for (let band = 0; band < 5; band += 1) {
    const loop = phase * Math.PI * 2
    const depth = band / 4
    const x = 18 + band * 72 + Math.sin(loop + band * 1.7) * (12 + depth * 13) * drift
    const y = 68 + band * 13 + Math.sin(loop + band * 0.9) * (1.5 + depth) * drift
    const alpha = 0.045 + band * 0.015

    context.fillStyle = `rgba(169, 190, 202, ${alpha})`
    context.fillRect(Math.round(x), Math.round(y), 58 + band * 12, 1)
    context.fillRect(Math.round(x + 19), Math.round(y + 3), 71 + band * 10, 1)
    context.fillRect(Math.round(x - 28), Math.round(y + 6), 36 + band * 7, 1)

    if (band % 2 === 0) {
      context.fillStyle = `rgba(223, 229, 224, ${alpha * 0.7})`
      context.fillRect(Math.round(x + 37), Math.round(y + 1), 11 + band * 2, 1)
    }
  }
}

function traceRoadSurfaceClip(context: CanvasRenderingContext2D) {
  const samples = getRoadSamples(34)

  tracePolygon(context, [
    ...samples.map((sample) => sample.upperEdge),
    ...samples
      .slice()
      .reverse()
      .map((sample) => sample.lowerEdge),
  ])
}

function drawHeadlights(context: CanvasRenderingContext2D, state: DriftState) {
  if (state.opacity <= 0.03) {
    return
  }

  const distantExit = smoothstep((state.phase - 0.62) / 0.2)
  const scale = state.phase > 0.62 ? Math.max(0.22, state.scale) : Math.max(0.45, state.scale)
  const beamReach = 1 - distantExit * 0.5
  const beamWidth = 1 - distantExit * 0.34
  const startLeft = rotatePoint(25 * state.scale, -5 * state.scale, state.carAngle)
  const startRight = rotatePoint(27 * state.scale, 3.5 * state.scale, state.carAngle)
  const beamTip = rotatePoint(
    (86 + state.driftLean * 20) * scale * beamReach,
    -2 * scale * beamWidth,
    state.carAngle + 0.18
  )
  const sideTip = rotatePoint(
    63 * scale * beamReach,
    (18 + state.driftLean * 8) * scale * beamWidth,
    state.carAngle + 0.04
  )
  const alpha = (0.13 + state.glow * 0.12) * state.opacity * (1 - distantExit * 0.45)
  const laneSweep =
    clamp(state.driftLean * 0.55 + state.glow * 0.25, 0, 1) * (1 - distantExit * 0.5)

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

  for (let index = 0; index < 12; index += 1) {
    const travel = index / 11
    const shimmer = 0.55 + 0.45 * Math.sin((state.phase + index * 0.083) * Math.PI * 2)
    const beamCenter = rotatePoint(
      lerp(26, 92 + state.driftLean * 18, travel) * scale * beamReach,
      lerp(1, 20 + state.driftLean * 7, travel) * scale * beamWidth,
      state.carAngle + 0.11
    )
    const lineLength = lerp(5, 19, travel) * scale * beamReach
    const lineAngle = state.carAngle + 0.07 + travel * 0.1
    const endpoint = rotatePoint(lineLength, 0, lineAngle)
    const glintAlpha = alpha * (0.18 + state.driftLean * 0.26) * shimmer * (1 - travel * 0.28)

    pixelLine(
      context,
      state.car.x + beamCenter.x,
      state.car.y + beamCenter.y,
      state.car.x + beamCenter.x + endpoint.x,
      state.car.y + beamCenter.y + endpoint.y,
      `rgba(255, 239, 184, ${glintAlpha})`,
      1
    )
  }

  for (let band = 0; band < 4; band += 1) {
    const shimmer = 0.7 + 0.3 * Math.sin((state.phase * 4 + band * 0.17) * Math.PI * 2)
    const lateral = (band - 1.5) * (5.5 + state.driftLean * 3) * scale
    const origin = rotatePoint(17 * scale, lateral * 0.24, state.carAngle)
    const knee = rotatePoint(
      (38 + band * 8) * scale * beamReach,
      (7 + band * 4 + state.bodyRoll) * scale * beamWidth,
      state.carAngle + 0.04
    )
    const tip = rotatePoint(
      (70 + band * 13 + state.driftLean * 16) * scale * beamReach,
      (13 + band * 5 + state.driftLean * 8) * scale * beamWidth,
      state.carAngle + 0.12
    )
    const bandAlpha = alpha * laneSweep * shimmer * (0.48 - band * 0.07)

    pixelLine(
      context,
      state.car.x + origin.x,
      state.car.y + origin.y,
      state.car.x + knee.x,
      state.car.y + knee.y,
      `rgba(255, 242, 183, ${bandAlpha})`,
      1
    )
    pixelLine(
      context,
      state.car.x + knee.x,
      state.car.y + knee.y,
      state.car.x + tip.x,
      state.car.y + tip.y,
      `rgba(178, 188, 183, ${bandAlpha * 0.7})`,
      1
    )

    if (shimmer > 0.88) {
      pixelRect(
        context,
        state.car.x + tip.x - 4 * scale,
        state.car.y + tip.y - 1,
        7 * scale,
        1,
        `rgba(255, 249, 209, ${bandAlpha * 0.86})`
      )
    }
  }

  const roadSweep = rotatePoint(
    46 * scale * beamReach,
    (17 + state.bodyRoll) * scale * beamWidth,
    state.carAngle + 0.16
  )
  const reflection = rotatePoint(
    72 * scale * beamReach,
    (24 + state.driftLean * 7) * scale * beamWidth,
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

function drawGuardrailHeadlightCatches(context: CanvasRenderingContext2D, state: DriftState) {
  if (state.opacity <= 0.03) {
    return
  }

  guardrailLightCatches.forEach((lightCatch, index) => {
    const pulse = smoothstep(pulseNear(state.phase, lightCatch.center, lightCatch.span))
    const shimmer = 0.72 + 0.28 * Math.sin((state.phase + index * 0.19) * Math.PI * 8)
    const alpha = pulse * shimmer * state.opacity * (0.25 + state.glow * 0.36)

    if (alpha <= 0.04) {
      return
    }

    strokePolyline(context, lightCatch.points, `rgba(255, 242, 190, ${alpha})`, lightCatch.width)

    const glintPoint = lightCatch.points[Math.min(1, lightCatch.points.length - 1)]
    pixelRect(context, glintPoint.x - 2, glintPoint.y - 1, 7, 1, `rgba(255, 253, 220, ${alpha})`)
  })
}

function drawHeadlightRoadTexture(context: CanvasRenderingContext2D, state: DriftState) {
  if (state.opacity <= 0.03) {
    return
  }

  const distantExit = smoothstep((state.phase - 0.62) / 0.2)
  const scale = state.phase > 0.62 ? Math.max(0.22, state.scale) : Math.max(0.45, state.scale)
  const beamReach = 1 - distantExit * 0.5
  const beamWidth = 1 - distantExit * 0.34
  const textureAlpha =
    state.opacity *
    (1 - distantExit * 0.55) *
    clamp(0.08 + state.glow * 0.14 + state.driftLean * 0.08, 0, 0.34)

  context.save()
  traceRoadSurfaceClip(context)
  context.clip()

  for (let index = 0; index < 16; index += 1) {
    const travel = index / 15
    const jitter = Math.sin((state.phase + index * 0.097) * Math.PI * 2)
    const base = rotatePoint(
      lerp(18, 94, travel) * scale * beamReach,
      lerp(6, 27, travel) * scale * beamWidth + jitter * 1.3 * (1 - distantExit * 0.4),
      state.carAngle + 0.11
    )
    const length = lerp(3, 16, travel) * scale * beamReach
    const end = rotatePoint(length, 0, state.carAngle + 0.12 + travel * 0.08)
    const alpha = textureAlpha * (0.92 - travel * 0.38) * (0.72 + jitter * 0.28)

    pixelLine(
      context,
      state.car.x + base.x,
      state.car.y + base.y,
      state.car.x + base.x + end.x,
      state.car.y + base.y + end.y,
      `rgba(230, 223, 188, ${alpha})`,
      1
    )
  }

  context.restore()
}

function drawCurvedWetReflections(context: CanvasRenderingContext2D, state: DriftState) {
  const lateExitDamp = 1 - smoothstep((state.phase - 0.72) / 0.12) * 0.55
  const alpha =
    state.opacity * lateExitDamp * clamp(0.08 + state.glow * 0.16 + state.driftLean * 0.12, 0, 0.32)

  if (alpha <= 0.03) {
    return
  }

  context.save()
  traceRoadSurfaceClip(context)
  context.clip()

  const reflections = [
    {
      color: 'rgba(231, 236, 221,',
      offset: 0,
      points: [
        { x: 87, y: 151 },
        { x: 126, y: 139 },
        { x: 173, y: 134 },
        { x: 220, y: 143 },
        { x: 281, y: 162 },
      ],
    },
    {
      color: 'rgba(255, 206, 117,',
      offset: 0.18,
      points: [
        { x: 184, y: 119 },
        { x: 218, y: 111 },
        { x: 256, y: 106 },
        { x: 307, y: 111 },
      ],
    },
    {
      color: 'rgba(217, 50, 70,',
      offset: 0.41,
      points: [
        { x: 122, y: 153 },
        { x: 158, y: 143 },
        { x: 197, y: 128 },
        { x: 238, y: 116 },
      ],
    },
  ]

  reflections.forEach((reflection, index) => {
    const shimmer = 0.62 + 0.38 * Math.sin((state.phase + reflection.offset) * Math.PI * 2)
    const reflectionAlpha = alpha * shimmer * (index === 2 ? state.driftLean : 1)

    if (reflectionAlpha <= 0.025) {
      return
    }

    strokePolyline(context, reflection.points, `${reflection.color} ${reflectionAlpha})`, 1)
    const glint = reflection.points[Math.min(1, reflection.points.length - 1)]
    pixelRect(
      context,
      glint.x + index * 19,
      glint.y - 1 + index * 2,
      7 - index * 2,
      1,
      `${reflection.color} ${reflectionAlpha * 1.6})`
    )
  })

  context.restore()
}

function getMarkerTone(marker: RoadsideMarker) {
  if (marker.color === 'red') {
    return {
      glow: '255, 48, 68',
      lens: '#d72b42',
    }
  }

  if (marker.color === 'amber') {
    return {
      glow: '255, 199, 99',
      lens: '#d7a54b',
    }
  }

  return {
    glow: '228, 241, 229',
    lens: '#d8e4dd',
  }
}

function drawRoadsideMarkers(
  context: CanvasRenderingContext2D,
  phase: number,
  state: DriftState,
  layer: RoadsideMarker['layer']
) {
  roadsideMarkers.forEach((marker, index) => {
    if (marker.layer !== layer) {
      return
    }

    const tone = getMarkerTone(marker)
    const pulse = state.opacity * smoothstep(pulseNear(state.phase, marker.center, marker.span))
    const twinkle = 0.74 + 0.26 * Math.sin((phase + index * 0.137) * Math.PI * 6)
    const glint = pulse * twinkle * (0.3 + state.glow * 0.7)
    const baseAlpha = marker.layer === 'front' ? 0.72 : 0.5

    pixelLine(context, marker.x, marker.y, marker.x - 1, marker.y + marker.height, '#283442', 1)
    pixelLine(
      context,
      marker.x + marker.size,
      marker.y + 1,
      marker.x + marker.size - 1,
      marker.y + marker.height,
      `rgba(126, 142, 152, ${baseAlpha})`,
      1
    )
    pixelRect(
      context,
      marker.x - marker.size,
      marker.y - 1,
      marker.size * 2,
      marker.size,
      `rgba(${tone.glow}, ${0.18 + glint * 0.72})`
    )

    if (glint > 0.2) {
      pixelRect(context, marker.x - 2, marker.y - 1, 5, 1, `rgba(${tone.glow}, ${glint})`)
      pixelRect(context, marker.x, marker.y - 3, 1, 5, `rgba(${tone.glow}, ${glint * 0.6})`)
    } else {
      pixelRect(context, marker.x - 1, marker.y - 1, marker.size, marker.size, tone.lens)
    }
  })
}

function drawChevronMarkers(context: CanvasRenderingContext2D, phase: number, state: DriftState) {
  chevronMarkers.forEach((marker, index) => {
    const pulse = state.opacity * smoothstep(pulseNear(state.phase, marker.center, marker.span))
    const shimmer = 0.76 + 0.24 * Math.sin((phase + index * 0.12) * Math.PI * 8)
    const alpha = 0.54 + pulse * shimmer * (0.28 + state.glow * 0.36)
    const width = 11 * marker.scale
    const height = 6 * marker.scale
    const lean = 3 * marker.scale

    context.save()
    context.globalAlpha = context.globalAlpha * alpha
    fillPolygon(
      context,
      [
        { x: marker.x, y: marker.y },
        { x: marker.x + width, y: marker.y + lean },
        { x: marker.x + width, y: marker.y + height + lean },
        { x: marker.x, y: marker.y + height },
      ],
      '#161b1e'
    )
    fillPolygon(
      context,
      [
        { x: marker.x + 2 * marker.scale, y: marker.y + 1 * marker.scale },
        { x: marker.x + 5 * marker.scale, y: marker.y + 2 * marker.scale },
        { x: marker.x + 8 * marker.scale, y: marker.y + 5 * marker.scale },
        { x: marker.x + 5 * marker.scale, y: marker.y + 5 * marker.scale },
      ],
      '#d7b85e'
    )
    fillPolygon(
      context,
      [
        { x: marker.x + 6 * marker.scale, y: marker.y + 2 * marker.scale },
        { x: marker.x + 8 * marker.scale, y: marker.y + 3 * marker.scale },
        { x: marker.x + 11 * marker.scale, y: marker.y + 6 * marker.scale },
        { x: marker.x + 8 * marker.scale, y: marker.y + 6 * marker.scale },
      ],
      '#f1d883'
    )
    context.restore()

    if (pulse > 0.22) {
      pixelRect(
        context,
        marker.x + width * 0.42,
        marker.y + 1,
        5 * marker.scale,
        1,
        `rgba(255, 241, 174, ${pulse * shimmer})`
      )
    }
  })
}

function drawRoadSpeedStreaks(
  context: CanvasRenderingContext2D,
  phase: number,
  state: DriftState,
  reducedMotion: boolean
) {
  const resetFade = phase < 0.86 ? 1 : clamp(1 - (phase - 0.86) / 0.08, 0, 1)
  const speedEnergy = state.opacity * resetFade * clamp(0.18 + state.driftLean * 0.95, 0, 1)

  if (phase < 0.1 || speedEnergy <= 0.03) {
    return
  }

  const motionAmount = reducedMotion ? 0.24 : 1

  context.save()
  traceRoadSurfaceClip(context)
  context.clip()

  roadSpeedStreaks.forEach((streak, index) => {
    const travel = ((phase * (0.9 + streak.lane * 0.22) + streak.phase) % 1) * motionAmount
    const depth = clamp(1 - (streak.y - 104) / 74, 0, 1)
    const bend = Math.sin((travel + streak.phase) * Math.PI) * (9 + streak.lane * 4)
    const x = streak.x + bend + travel * (24 + streak.lane * 8)
    const y = streak.y - travel * (14 + streak.lane * 3)
    const flicker = 0.55 + 0.45 * Math.sin((phase + streak.phase + index * 0.07) * Math.PI * 10)
    const alpha = speedEnergy * streak.strength * flicker * (0.45 + depth * 0.65)
    const length = streak.length * (0.54 + depth * 0.5) * (reducedMotion ? 0.58 : 1)

    if (alpha <= 0.025) {
      return
    }

    pixelLine(
      context,
      x,
      y,
      x + length,
      y - Math.max(1, Math.round(length / 17)),
      `rgba(165, 184, 195, ${alpha})`,
      depth > 0.6 ? 1 : 2
    )

    if (flicker > 0.86) {
      pixelRect(
        context,
        x + length * 0.38,
        y - 1,
        5 + depth * 4,
        1,
        `rgba(224, 233, 231, ${alpha})`
      )
    }
  })

  context.restore()
}

function drawSmoke(
  context: CanvasRenderingContext2D,
  phase: number,
  state: DriftState,
  depth: SmokePuff['depth']
) {
  const resetFade = phase < 0.74 ? 1 : clamp(1 - (phase - 0.74) / 0.08, 0, 1)

  if (phase < 0.08 || resetFade <= 0 || state.smokeIntensity <= 0.02) {
    return
  }

  smokePuffs.forEach((puff, index) => {
    if (puff.depth !== depth) {
      return
    }

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
    const drift = rotatePoint(
      (puff.x - puff.offset * 82 + wind * (2.4 + puff.layer)) * trailScale,
      (puff.y + puff.offset * 52 + lift * (1.2 + puff.layer * 0.5) - puff.layer * 1.5) * trailScale,
      trailState.slideAngle - trailState.carAngle
    )
    const entryReveal =
      depth === 'front' ? 0.58 + smoothstep((trailState.phase - 0.34) / 0.2) * 0.24 : 1
    const depthAlpha = depth === 'front' ? entryReveal : 1
    const lateFade = smoothstep((0.76 - trailState.phase) / 0.14)
    const alpha =
      (0.035 + ageFade * 0.15) *
      trailState.smokeIntensity *
      resetFade *
      lateFade *
      (1 - puff.layer * 0.06) *
      depthAlpha
    const radius = (puff.radius + puff.offset * 28 + puff.layer * 0.7) * trailScale
    const tone =
      puff.tone === 'warm'
        ? '185, 178, 168'
        : puff.tone === 'white'
          ? '214, 219, 218'
          : '158, 171, 185'

    drawPixelCircle(
      context,
      trailState.smoke.x + drift.x,
      trailState.smoke.y + drift.y,
      radius,
      `rgba(${tone}, ${alpha})`
    )
    drawPixelCircle(
      context,
      trailState.smoke.x + drift.x + radius * 0.38,
      trailState.smoke.y + drift.y - radius * 0.2,
      radius * 0.56,
      `rgba(224, 229, 226, ${alpha * 0.36})`
    )
    pixelRect(
      context,
      trailState.smoke.x + drift.x - radius,
      trailState.smoke.y + drift.y + radius * 0.45,
      radius * 2.2,
      1,
      `rgba(221, 225, 223, ${alpha * 0.64})`
    )

    for (let fleck = 0; fleck < 4; fleck += 1) {
      const fleckPhase = phase + index * 0.047 + fleck * 0.083
      const fleckDrift = rotatePoint(
        (-radius * 0.8 - fleck * 3 + Math.sin(fleckPhase * Math.PI * 2) * 2.4) * trailScale,
        (fleck - 1.5) * trailScale + Math.cos(fleckPhase * Math.PI * 2) * 1.5,
        trailState.slideAngle - trailState.carAngle + 0.18
      )
      const fleckAlpha = alpha * (0.32 + fleck * 0.08)

      if (fleckAlpha > 0.014) {
        pixelRect(
          context,
          trailState.smoke.x + drift.x + fleckDrift.x,
          trailState.smoke.y + drift.y + fleckDrift.y,
          fleck % 2 === 0 ? 2 : 1,
          1,
          `rgba(${tone}, ${fleckAlpha})`
        )
      }
    }
  })
}

function drawRouteSkidTrail(context: CanvasRenderingContext2D, phase: number, state: DriftState) {
  const resetFade = phase < 0.72 ? 1 : clamp(1 - (phase - 0.72) / 0.08, 0, 1)

  if (phase < 0.12 || resetFade <= 0 || state.smokeIntensity <= 0.02) {
    return
  }

  context.save()
  traceRoadSurfaceClip(context)
  context.clip()
  ;[
    { x: -17, y: 8.6, dark: '8, 11, 18', wet: '104, 118, 132' },
    { x: 8, y: 9.2, dark: '13, 17, 25', wet: '128, 138, 145' },
  ].forEach((track, trackIndex) => {
    let previousPoint: Point | null = null
    let previousState: DriftState | null = null

    skidTrailOffsets.forEach((offset, index) => {
      const samplePhase = phase - offset

      if (samplePhase < 0.12 || samplePhase > 0.78) {
        previousPoint = null
        previousState = null
        return
      }

      const trailState = offset === 0 ? state : getDriftState(samplePhase)
      const contact = sampleCarPoint(trailState, track.x, track.y + trackIndex * 0.35)
      const slip = rotatePoint(
        (-3 - trailState.driftLean * 6 - index * 0.45) * trailState.scale,
        (trackIndex === 0 ? 0.9 : -0.7) * trailState.scale,
        trailState.slideAngle
      )
      const point = {
        x: contact.x + slip.x,
        y: contact.y + slip.y,
      }

      if (previousPoint && previousState) {
        const ageFade = clamp(1 - offset / 0.24, 0, 1)
        const lateFade = smoothstep((0.74 - trailState.phase) / 0.12)
        const intensity = trailState.driftLean * trailState.opacity * resetFade * ageFade * lateFade

        if (intensity > 0.04) {
          pixelLine(
            context,
            previousPoint.x,
            previousPoint.y,
            point.x,
            point.y,
            `rgba(${track.dark}, ${0.12 + intensity * 0.32})`,
            Math.max(1, Math.round(trailState.scale * (trackIndex === 0 ? 1.6 : 1.2)))
          )

          if (index % 2 === 0) {
            pixelLine(
              context,
              previousPoint.x + 2 * trailState.scale,
              previousPoint.y - 1,
              point.x + 2 * trailState.scale,
              point.y - 1,
              `rgba(${track.wet}, ${intensity * 0.16})`,
              1
            )
          }
        }
      }

      previousPoint = point
      previousState = trailState
    })
  })

  context.restore()
}

function drawTaillightReflections(
  context: CanvasRenderingContext2D,
  phase: number,
  state: DriftState
) {
  const resetFade = phase < 0.72 ? 1 : clamp(1 - (phase - 0.72) / 0.08, 0, 1)

  if (phase < 0.1 || resetFade <= 0 || state.opacity <= 0.03) {
    return
  }

  const samples = [0, 0.028, 0.061, 0.098, 0.14]

  context.save()
  traceRoadSurfaceClip(context)
  context.clip()

  samples.forEach((offset, index) => {
    const samplePhase = phase - offset

    if (samplePhase < 0.1 || samplePhase > 0.88) {
      return
    }

    const trailState = index === 0 ? state : getDriftState(samplePhase)
    const ageFade = clamp(1 - offset / 0.16, 0, 1)
    const brakePulse = smoothstep(pulseNear(trailState.phase, 0.45, 0.18))
    const lateFade = smoothstep((0.74 - trailState.phase) / 0.12)
    const alpha =
      trailState.opacity *
      resetFade *
      ageFade *
      lateFade *
      (0.12 + trailState.driftLean * 0.24 + brakePulse * 0.18)

    if (alpha <= 0.025) {
      return
    }

    const scale = trailState.scale
    const leftTail = sampleCarPoint(trailState, -27, -3.8)
    const rightTail = sampleCarPoint(trailState, -27, 5)
    const smear = rotatePoint(
      (-17 - trailState.driftLean * 28 - index * 7) * scale,
      (9 + index * 3.8 + trailState.driftLean * 5) * scale,
      trailState.slideAngle + 0.08
    )
    const spread = rotatePoint(0, (7 + index * 1.4) * scale, trailState.carAngle)
    const width = Math.max(1, Math.round((2.4 - index * 0.25) * scale))

    pixelLine(
      context,
      leftTail.x - 1,
      leftTail.y + 5 * scale,
      leftTail.x + smear.x,
      leftTail.y + smear.y,
      `rgba(226, 34, 58, ${alpha * 0.72})`,
      width
    )
    pixelLine(
      context,
      rightTail.x - 1,
      rightTail.y + 7 * scale,
      rightTail.x + smear.x + spread.x,
      rightTail.y + smear.y + spread.y,
      `rgba(255, 56, 79, ${alpha})`,
      width
    )

    if (index < 3) {
      pixelRect(
        context,
        rightTail.x + smear.x * 0.42,
        rightTail.y + smear.y * 0.42,
        (8 - index * 2) * scale,
        1,
        `rgba(255, 95, 104, ${alpha * 0.78})`
      )
      fillPolygon(
        context,
        [
          { x: rightTail.x + smear.x * 0.12, y: rightTail.y + 5 * scale + index },
          { x: rightTail.x + smear.x * 0.54, y: rightTail.y + smear.y * 0.46 + 2 * scale },
          {
            x: rightTail.x + smear.x * 0.42 + 11 * scale,
            y: rightTail.y + smear.y * 0.42 + 6 * scale,
          },
          { x: rightTail.x + 3 * scale, y: rightTail.y + 10 * scale + index },
        ],
        `rgba(220, 38, 61, ${alpha * 0.12})`
      )
      drawPixelCircle(
        context,
        rightTail.x + smear.x * 0.2,
        rightTail.y + 8 * scale + index,
        (2.2 + brakePulse * 1.4) * scale,
        `rgba(255, 44, 69, ${alpha * 0.28})`
      )
    }
  })

  context.restore()
}

function drawTireSpray(context: CanvasRenderingContext2D, phase: number, state: DriftState) {
  const resetFade = phase < 0.72 ? 1 : clamp(1 - (phase - 0.72) / 0.06, 0, 1)

  if (phase < 0.12 || resetFade <= 0 || state.smokeIntensity <= 0.04) {
    return
  }

  context.save()
  traceRoadSurfaceClip(context)
  context.clip()

  tireSprayOffsets.forEach((offset, index) => {
    const samplePhase = phase - offset

    if (samplePhase < 0.1 || samplePhase > 0.86) {
      return
    }

    const trailState = getDriftState(samplePhase)
    const ageFade = clamp(1 - offset / 0.13, 0, 1)
    const lateFade = smoothstep((0.74 - trailState.phase) / 0.12)
    const alpha = trailState.opacity * trailState.smokeIntensity * resetFade * ageFade * lateFade

    if (alpha <= 0.03) {
      return
    }

    const rearContact = sampleCarPoint(trailState, -17.5, 9)
    const frontContact = sampleCarPoint(trailState, 7.5, 9.4)
    const sprayLift = Math.sin((phase + index * 0.19) * Math.PI * 2)
    const rearSpray = rotatePoint(
      (-10 - index * 4.4 - trailState.driftLean * 12) * trailState.scale,
      (5 + index * 1.7 - sprayLift * 1.4) * trailState.scale,
      trailState.slideAngle - 0.06
    )
    const frontSpray = rotatePoint(
      (-5 - index * 2.2) * trailState.scale,
      (3 + index * 1.1 + sprayLift * 0.8) * trailState.scale,
      trailState.slideAngle + 0.1
    )
    const size = index < 2 ? 2 : 1

    pixelRect(
      context,
      rearContact.x + rearSpray.x,
      rearContact.y + rearSpray.y,
      size,
      1,
      `rgba(178, 196, 204, ${alpha * 0.38})`
    )
    pixelRect(
      context,
      rearContact.x + rearSpray.x + 4 * trailState.scale,
      rearContact.y + rearSpray.y - 2,
      1,
      1,
      `rgba(226, 233, 231, ${alpha * 0.32})`
    )

    if (index < 4) {
      pixelRect(
        context,
        frontContact.x + frontSpray.x,
        frontContact.y + frontSpray.y,
        1,
        1,
        `rgba(160, 177, 188, ${alpha * 0.26})`
      )
    }
  })

  context.restore()
}

function drawTaillightStreaks(context: CanvasRenderingContext2D, phase: number, state: DriftState) {
  const resetFade = phase < 0.72 ? 1 : clamp(1 - (phase - 0.72) / 0.065, 0, 1)

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
    const lateFade = smoothstep((0.74 - trailState.phase) / 0.12)
    const fade = trailState.opacity * resetFade * lateFade * (1 - index * 0.2)

    if (fade <= 0.03) {
      return
    }

    const alpha = (0.2 + trailState.driftLean * 0.42) * fade
    const scale = trailState.scale
    const rear = rotatePoint(-27 * scale, 0, trailState.carAngle)
    const tail = rotatePoint(
      (-36 - trailState.driftLean * 18 - index * 8) * scale,
      -1 * scale,
      trailState.slideAngle + 0.04
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

function drawTireContact(context: CanvasRenderingContext2D, state: DriftState) {
  if (state.opacity <= 0.03) {
    return
  }

  const alpha = clamp(state.driftLean * state.opacity, 0, 0.82)
  const scale = state.scale
  const shadowCenter = sampleCarPoint(state, -1, 10)
  const shadowSkew = rotatePoint(31 * scale, 0, state.carAngle)
  const shadowDrop = rotatePoint(0, 6 * scale, state.slideAngle + 0.15)

  fillPolygon(
    context,
    [
      { x: shadowCenter.x - shadowSkew.x * 0.72, y: shadowCenter.y - shadowSkew.y * 0.72 },
      { x: shadowCenter.x + shadowSkew.x, y: shadowCenter.y + shadowSkew.y },
      {
        x: shadowCenter.x + shadowSkew.x * 0.88 + shadowDrop.x,
        y: shadowCenter.y + shadowSkew.y * 0.88 + shadowDrop.y,
      },
      {
        x: shadowCenter.x - shadowSkew.x * 0.82 + shadowDrop.x * 0.55,
        y: shadowCenter.y - shadowSkew.y * 0.82 + shadowDrop.y * 0.55,
      },
    ],
    `rgba(3, 6, 12, ${0.22 + alpha * 0.24})`
  )

  drawCarPart(context, state, -2, 10.5, 35, 5, '#050813', 0.24 + alpha * 0.34, -0.03)

  if (alpha <= 0.08) {
    return
  }

  const rearContact = rotatePoint(-17 * scale, 8.5 * scale, state.carAngle)
  const frontContact = rotatePoint(8 * scale, 9 * scale, state.carAngle)
  const rearScrub = rotatePoint(-24 * scale, 1.5 * scale, state.slideAngle)
  const frontScrub = rotatePoint(-17 * scale, -1.5 * scale, state.slideAngle)

  pixelLine(
    context,
    state.car.x + rearContact.x,
    state.car.y + rearContact.y,
    state.car.x + rearContact.x + rearScrub.x,
    state.car.y + rearContact.y + rearScrub.y,
    `rgba(6, 9, 17, ${0.28 + alpha * 0.34})`,
    Math.max(1, Math.round(scale))
  )
  pixelLine(
    context,
    state.car.x + frontContact.x,
    state.car.y + frontContact.y,
    state.car.x + frontContact.x + frontScrub.x,
    state.car.y + frontContact.y + frontScrub.y,
    `rgba(45, 52, 63, ${0.18 + alpha * 0.2})`,
    1
  )
}

function drawMidgroundCarOcclusion(context: CanvasRenderingContext2D, state: DriftState) {
  const phaseWindow =
    smoothstep((state.phase - 0.28) / 0.13) * smoothstep((0.68 - state.phase) / 0.13)
  const farRoadWindow =
    smoothstep((state.phase - 0.6) / 0.1) * smoothstep((0.88 - state.phase) / 0.08)
  const alpha = state.opacity * phaseWindow

  if (alpha <= 0.025 && farRoadWindow <= 0.025) {
    return
  }

  const railCatch = clamp(state.glow * 0.42 + state.driftLean * 0.18, 0, 0.58) * alpha

  context.save()
  if (alpha > 0.025) {
    const railSamples = getRoadSamples(26).slice(6, 18)
    const railPoints = railSamples.map((sample) => ({
      x: sample.lowerEdge.x + sample.normal.x * (4 + sample.depthScale * 4),
      y: sample.lowerEdge.y + sample.normal.y * (4 + sample.depthScale * 4),
    }))

    context.save()
    context.globalAlpha = context.globalAlpha * alpha
    fillPolygon(
      context,
      [
        ...railPoints,
        ...railPoints
          .slice()
          .reverse()
          .map((point) => ({ x: point.x, y: point.y + 8 })),
      ],
      'rgba(3, 7, 14, 0.2)'
    )
    strokePolyline(context, railPoints, 'rgba(41, 51, 64, 0.72)', 3)
    strokePolyline(context, railPoints, `rgba(210, 219, 216, ${0.28 + railCatch})`, 1)
    railPoints
      .filter((_, index) => index % 3 === 1)
      .forEach((post, index) => {
        const postAlpha = 0.44 + railCatch * (index % 2 === 0 ? 0.7 : 0.4)
        const height = 10 + index * 2

        pixelLine(
          context,
          post.x,
          post.y,
          post.x - 1,
          post.y + height,
          `rgba(35, 45, 58, ${postAlpha})`,
          2
        )
        pixelLine(
          context,
          post.x + 1,
          post.y,
          post.x,
          post.y + height - 2,
          `rgba(135, 149, 157, ${postAlpha * 0.72})`,
          1
        )
      })
    context.restore()
  }

  if (farRoadWindow > 0.025) {
    const farAlpha = state.opacity * farRoadWindow
    const farRail = getRoadSamples(28)
      .slice(16)
      .map((sample) => ({
        x: sample.upperEdge.x - sample.normal.x * (3 + sample.depthScale * 3),
        y: sample.upperEdge.y - sample.normal.y * (3 + sample.depthScale * 3),
      }))

    strokePolyline(context, farRail, `rgba(11, 17, 28, ${0.54 * farAlpha})`, 2)
    strokePolyline(
      context,
      farRail,
      `rgba(202, 213, 213, ${0.28 * farAlpha + state.glow * 0.06})`,
      1
    )
    farRail
      .filter((_, index) => index % 3 === 1)
      .forEach((post, index) => {
        pixelLine(
          context,
          post.x,
          post.y,
          post.x - 1,
          post.y + 5 + index,
          `rgba(74, 89, 99, ${0.48 * farAlpha})`,
          1
        )
      })
  }
  context.restore()
}

function drawDistantExitHaze(context: CanvasRenderingContext2D, state: DriftState) {
  const hazeWindow =
    smoothstep((state.phase - 0.72) / 0.1) * smoothstep((0.91 - state.phase) / 0.08)
  const alpha = hazeWindow * state.opacity

  if (alpha <= 0.025) {
    return
  }

  context.save()
  traceRoadSurfaceClip(context)
  context.clip()
  fillPolygon(
    context,
    [
      { x: 211, y: 93 },
      { x: 320, y: 100 },
      { x: 320, y: 125 },
      { x: 226, y: 116 },
    ],
    `rgba(132, 153, 164, ${0.12 * alpha})`
  )
  pixelRect(context, 226, 101, 54, 1, `rgba(190, 203, 205, ${0.14 * alpha})`)
  pixelRect(context, 268, 106, 42, 1, `rgba(104, 126, 139, ${0.16 * alpha})`)
  context.restore()
}

function drawCarUpperReadabilityHighlights(context: CanvasRenderingContext2D, state: DriftState) {
  const entryFocus =
    smoothstep((state.phase - 0.1) / 0.12) * smoothstep((0.62 - state.phase) / 0.18)
  const alpha = state.opacity * entryFocus

  if (alpha <= 0.03) {
    return
  }

  const roofStart = sampleCarPoint(state, -12, -12.6)
  const roofEnd = sampleCarPoint(state, 15, -10.7)
  const hoodStart = sampleCarPoint(state, 2, -5.8)
  const hoodEnd = sampleCarPoint(state, 25, -4.1)
  const glassStart = sampleCarPoint(state, -14, -7.4)
  const glassEnd = sampleCarPoint(state, 8, -6.4)
  const pillar = sampleCarPoint(state, -3, -7)

  context.save()
  pixelLine(
    context,
    roofStart.x,
    roofStart.y,
    roofEnd.x,
    roofEnd.y,
    `rgba(255, 255, 245, ${0.28 * alpha})`,
    1
  )
  pixelLine(
    context,
    hoodStart.x,
    hoodStart.y,
    hoodEnd.x,
    hoodEnd.y,
    `rgba(238, 244, 236, ${0.24 * alpha})`,
    1
  )
  pixelLine(
    context,
    glassStart.x,
    glassStart.y,
    glassEnd.x,
    glassEnd.y,
    `rgba(52, 75, 100, ${0.34 * alpha})`,
    1
  )
  pixelRect(
    context,
    pillar.x,
    pillar.y,
    1,
    Math.max(1, state.scale * 5),
    `rgba(4, 7, 12, ${0.42 * alpha})`
  )
  context.restore()
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

  if (part.points) {
    context.save()
    context.globalAlpha = context.globalAlpha * (part.alpha ?? 1)
    drawRotatedPolygon(
      context,
      state,
      part.points.map((point) => ({
        x: part.x + point.x,
        y: part.y + rollOffset + point.y,
      })),
      part.angle ?? 0,
      part.color
    )
    context.restore()
    return
  }

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
  pose: {
    sparkOffset: Point
    wheelHighlights?: Array<Point & { angle?: number; width: number }>
    wheelPhase?: number
  }
) {
  const poseWheelFrame = Math.floor(((pose.wheelPhase ?? 0) + state.phase * 8) * 2) % 2
  const flickerColor = (state.wheelFrame + poseWheelFrame) % 2 === 0 ? '#eef2ed' : '#596170'
  const wheelEnergy = clamp(
    state.animationEnergy * 0.9 + state.driftLean * 0.55 + (state.scale - 0.72) * 0.8,
    0.18,
    1.15
  )
  const sparkAlpha = clamp((state.driftLean - 0.35) * 1.25, 0, 0.55) * state.opacity
  const wheelHighlights = pose.wheelHighlights ?? [
    { x: -17, y: 8, width: 5, angle: 0 },
    { x: 10, y: 9, width: 5, angle: 0 },
  ]

  wheelHighlights.forEach((wheel, index) => {
    const roll =
      (index === 0 ? state.bodyRoll * 0.18 : -state.bodyRoll * 0.12) + state.suspensionLoad * 0.18
    const spinOffset = (state.wheelFrame + poseWheelFrame + index) % 2 === 0 ? 0.8 : -0.8

    drawCarPart(
      context,
      state,
      wheel.x,
      wheel.y + roll,
      wheel.width,
      1,
      flickerColor,
      (index === 0 ? 0.64 : 0.56) * state.opacity * wheelEnergy,
      wheel.angle ?? 0
    )
    drawCarPart(
      context,
      state,
      wheel.x + spinOffset,
      wheel.y + 1.5 + roll,
      Math.max(2, wheel.width - 2),
      1,
      '#171b23',
      0.5 * state.opacity * wheelEnergy,
      (wheel.angle ?? 0) + 0.22
    )
    drawCarPart(
      context,
      state,
      wheel.x - spinOffset * 0.6,
      wheel.y - 1.2 + roll,
      Math.max(1, wheel.width - 3),
      1,
      '#f8f5dd',
      0.22 * state.opacity * wheelEnergy,
      (wheel.angle ?? 0) - 0.2
    )
  })

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

function drawCarRuntimeDetails(context: CanvasRenderingContext2D, state: DriftState) {
  if (state.opacity <= 0.03) {
    return
  }

  const scale = state.scale
  const lightPulse = state.opacity * (0.22 + state.brakePulse * 0.72)
  const bodyGlint = state.opacity * clamp(0.12 + state.animationEnergy * 0.26, 0, 0.48)
  const noseGlint = sampleCarPoint(state, 26, -4.5)
  const rearLampA = sampleCarPoint(state, -28, -4.8)
  const rearLampB = sampleCarPoint(state, -28, 4.6)
  const hatchGlint = sampleCarPoint(state, -19, -6.2)
  const rockerStart = sampleCarPoint(state, -19, 10.5)
  const rockerEnd = sampleCarPoint(state, 20, 8.4)

  context.save()
  pixelLine(
    context,
    rockerStart.x,
    rockerStart.y,
    rockerEnd.x,
    rockerEnd.y,
    `rgba(3, 5, 9, ${0.44 * state.opacity})`,
    Math.max(1, Math.round(scale))
  )
  pixelRect(
    context,
    hatchGlint.x,
    hatchGlint.y,
    Math.max(1, Math.round(7 * scale)),
    1,
    `rgba(125, 155, 181, ${bodyGlint})`
  )
  pixelRect(
    context,
    noseGlint.x,
    noseGlint.y,
    Math.max(1, Math.round(5 * scale)),
    1,
    `rgba(255, 251, 215, ${0.2 * state.opacity + state.glow * 0.18})`
  )
  drawPixelCircle(
    context,
    rearLampA.x,
    rearLampA.y,
    Math.max(1, 1.4 * scale),
    `rgba(255, 39, 62, ${lightPulse})`
  )
  drawPixelCircle(
    context,
    rearLampB.x,
    rearLampB.y,
    Math.max(1, 1.6 * scale),
    `rgba(255, 57, 74, ${lightPulse})`
  )
  context.restore()
}

function drawCar(context: CanvasRenderingContext2D, state: DriftState) {
  if (state.opacity <= 0.03) {
    return
  }

  const voxelPoseFrames = getCarVoxelPoseFrames(state.phase)
  const hasVoxelSprites = voxelPoseFrames.every(({ pose }) => getCarVoxelSprite(pose))

  if (hasVoxelSprites) {
    voxelPoseFrames.forEach(({ pose, alpha }) => {
      const sprite = getCarVoxelSprite(pose)

      if (!sprite || alpha <= 0.01) {
        return
      }

      const spriteScale = (state.scale * pose.spriteScale) / voxelRenderScale

      context.save()
      context.globalAlpha = context.globalAlpha * state.opacity * alpha
      context.translate(state.car.x, state.car.y + state.bodyRoll * 0.18)
      context.rotate(state.carAngle)
      context.scale(spriteScale, spriteScale)
      context.drawImage(sprite, -voxelSpriteWidth / 2, -voxelSpriteHeight / 2)
      context.restore()
    })

    drawWheelFlicker(context, state, voxelPoseFrames[voxelPoseFrames.length - 1].pose)
    drawCarRuntimeDetails(context, state)
    return
  }

  context.save()
  context.globalAlpha = context.globalAlpha * state.opacity
  const fallbackPose = getCarSpritePose(state.phase)

  fallbackPose.parts.forEach((part) => {
    drawCarSpritePart(context, state, part)
  })
  drawWheelFlicker(context, state, fallbackPose)
  drawCarRuntimeDetails(context, state)
  context.restore()
}

function drawScanlines(context: CanvasRenderingContext2D, phase: number) {
  context.fillStyle = 'rgba(255, 255, 255, 0.026)'
  for (let y = Math.round(phase * 12) % 4; y < sceneHeight; y += 4) {
    context.fillRect(0, y, sceneWidth, 1)
  }

  context.fillStyle = 'rgba(3, 5, 12, 0.18)'
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

function drawForegroundVignette(context: CanvasRenderingContext2D) {
  fillPolygon(
    context,
    [
      { x: 0, y: 142 },
      { x: 0, y: 180 },
      { x: 78, y: 180 },
      { x: 32, y: 164 },
    ],
    'rgba(1, 3, 8, 0.34)'
  )
  fillPolygon(
    context,
    [
      { x: 320, y: 144 },
      { x: 320, y: 180 },
      { x: 266, y: 180 },
      { x: 298, y: 166 },
    ],
    'rgba(1, 3, 8, 0.18)'
  )
  pixelRect(context, 0, 177, sceneWidth, 3, 'rgba(1, 3, 8, 0.18)')
}

function resetDrawingContext(context: CanvasRenderingContext2D) {
  const reset = (context as CanvasRenderingContext2D & { reset?: () => void }).reset

  if (reset) {
    reset.call(context)
  }

  context.setTransform(1, 0, 0, 1, 0, 0)
  context.globalAlpha = 1
  context.globalCompositeOperation = 'source-over'
  context.filter = 'none'
  context.lineWidth = 1
  context.shadowBlur = 0
  context.shadowColor = 'rgba(0, 0, 0, 0)'
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  context.imageSmoothingEnabled = false
  context.beginPath()
}

function drawScene(context: CanvasRenderingContext2D, phase: number, reducedMotion: boolean) {
  const normalizedPhase = normalizeLoopPhase(phase)
  const motionPhase = reducedMotion
    ? normalizeLoopPhase(Math.floor(normalizedPhase * 24) / 24)
    : normalizedPhase
  const state = getDriftState(motionPhase)

  resetDrawingContext(context)
  context.save()
  try {
    context.clearRect(0, 0, sceneWidth, sceneHeight)
    drawSky(context, motionPhase)
    drawBackgroundDetailLayer(context)
    drawTrees(context, motionPhase)
    drawRoad(context, motionPhase)
    drawRoadDetailLayer(context)
    drawGuardrails(context, motionPhase)
    drawRoadsideMarkers(context, motionPhase, state, 'back')
    drawChevronMarkers(context, motionPhase, state)
    drawFog(context, motionPhase, reducedMotion)
    drawHeadlights(context, state)
    drawHeadlightRoadTexture(context, state)
    drawGuardrailHeadlightCatches(context, state)
    drawCurvedWetReflections(context, state)
    drawRoadSpeedStreaks(context, motionPhase, state, reducedMotion)
    drawRouteSkidTrail(context, motionPhase, state)
    drawTaillightReflections(context, motionPhase, state)
    drawSmoke(context, motionPhase, state, 'back')
    drawTireContact(context, state)
    drawTireSpray(context, motionPhase, state)
    drawTaillightStreaks(context, motionPhase, state)
    drawCar(context, state)
    drawMidgroundCarOcclusion(context, state)
    drawDistantExitHaze(context, state)
    drawSmoke(context, motionPhase, state, 'front')
    drawForegroundGuardrail(context, motionPhase)
    drawCarUpperReadabilityHighlights(context, state)
    drawRoadsideMarkers(context, motionPhase, state, 'front')
    drawAtmosphericDither(context, motionPhase)
    drawForegroundVignette(context)
    drawScanlines(context, motionPhase)
    context.beginPath()
  } finally {
    context.restore()
  }
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
    getBackgroundDetailLayer()
    getRoadDetailLayer()
    carVoxelPoses.forEach((pose) => getCarVoxelSprite(pose))

    const updateReducedMotion = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches
    }

    function render(now: number) {
      animationStartedAt ??= now
      const duration = reducedMotion ? reducedMotionLoopDurationMs : loopDurationMs
      const elapsed = now - animationStartedAt

      drawScene(drawingContext, normalizeLoopPhase((elapsed % duration) / duration), reducedMotion)
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
