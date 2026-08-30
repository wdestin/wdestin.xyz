export type Point = {
  x: number
  y: number
}

export type CityLight = Point & {
  color: string
  phase: number
}

export type SmokePuff = {
  depth: 'back' | 'front'
  layer: number
  offset: number
  radius: number
  tone: 'cool' | 'warm' | 'white'
  x: number
  y: number
}

export type DriftState = {
  animationEnergy: number
  bodyRoll: number
  brakePulse: number
  car: Point
  carAngle: number
  driftLean: number
  glow: number
  opacity: number
  phase: number
  scale: number
  slideAngle: number
  smoke: Point
  smokeIntensity: number
  suspensionLoad: number
  wheelFrame: number
}

export type RoadControlPoint = {
  center: Point
  depthScale: number
  phase: number
  roadWidth: number
}

export type RoadSample = {
  center: Point
  depthScale: number
  lowerEdge: Point
  normal: Point
  progress: number
  roadWidth: number
  tangent: Point
  upperEdge: Point
}

export type ForegroundRailSample = {
  depthScale: number
  normal: Point
  point: Point
  progress: number
  tangent: Point
}

export type MotionKeyframe = {
  driftLean: number
  glow: number
  lateralOffset: number
  opacity: number
  phase: number
  progress: number
  slideLag: number
  smokeIntensity: number
}

export type RoadGlint = Point & {
  length: number
  phase: number
  strength: number
}

export type RoadScratch = Point & {
  alpha: number
  angle: number
  length: number
  width: number
}

export type RoadSpeedStreak = Point & {
  lane: number
  length: number
  phase: number
  strength: number
}

export type LightCatch = {
  center: number
  points: Point[]
  span: number
  width: number
}

export type RoadsideMarker = Point & {
  center: number
  color: 'amber' | 'red' | 'white'
  height: number
  layer: 'back' | 'front'
  size: number
  span: number
}

export type ChevronMarker = Point & {
  center: number
  scale: number
  span: number
}

export type CarSpritePart = {
  alpha?: number
  angle?: number
  color: string
  height: number
  points?: Point[]
  roll?: number
  width: number
  x: number
  y: number
}

export type CarSpritePose = {
  parts: CarSpritePart[]
  sparkOffset: Point
  wheelHighlights?: Array<Point & { angle?: number; width: number }>
}

export type VoxelPoint = {
  x: number
  y: number
  z: number
}

export type VoxelPalette = {
  back: string
  front: string
  side: string
  top: string
}

export type VoxelCuboid = VoxelPoint & {
  depth: number
  height: number
  palette: VoxelPalette
  width: number
}

export type VoxelCarPose = {
  bodyPitch?: number
  bodyShadeAlpha?: number
  bodySquash?: number
  depthScale?: number
  detailAlpha?: number
  farWheelAlpha?: number
  frontDetailAlpha?: number
  headlightAlpha?: number
  headlightEmphasis?: number
  lightJitter?: number
  name: string
  rearDetailAlpha?: number
  rearEmphasis?: number
  rearKick?: number
  sparkOffset: Point
  spriteScale: number
  spriteYOffset?: number
  suspension?: number
  wheelPhase?: number
  wheelTurn?: number
  wheelHighlights: Array<Point & { angle?: number; width: number }>
  yaw: number
  yawOffset?: number
}

export type VoxelPoseFrame = {
  alpha: number
  pose: VoxelCarPose
}

export type VoxelPoseTimelineFrame = {
  phase: number
  pose: VoxelCarPose
}

export type ProjectedVoxelFace = {
  alpha: number
  color: string
  depth: number
  points: Point[]
}
