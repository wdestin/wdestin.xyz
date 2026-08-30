import type { VoxelCarPose, VoxelPoseTimelineFrame } from './types'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Drift loop validation failed: ${message}`)
  }
}

export function validateCarVoxelAnimationData(
  poses: VoxelCarPose[],
  timeline: VoxelPoseTimelineFrame[]
) {
  if (process.env.NODE_ENV === 'production') {
    return
  }

  assert(poses.length === timeline.length, 'pose count must match timeline frame count')
  assert(timeline.length > 1, 'timeline needs at least two frames')
  assert(timeline[0]?.phase === 0, 'timeline must start at phase 0')
  assert(
    timeline[timeline.length - 1]?.phase === 0.86,
    'last visible car timeline phase must remain 0.86'
  )

  const poseNames = new Set<string>()

  poses.forEach((pose) => {
    assert(!poseNames.has(pose.name), `duplicate pose name "${pose.name}"`)
    poseNames.add(pose.name)
  })

  timeline.forEach((frame, index) => {
    assert(poseNames.has(frame.pose.name), `timeline references unknown pose "${frame.pose.name}"`)

    if (index === 0) {
      return
    }

    assert(
      frame.phase > timeline[index - 1].phase,
      `timeline phase ${frame.phase} must be greater than ${timeline[index - 1].phase}`
    )
  })
}
