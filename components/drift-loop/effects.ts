import { sceneHeight, sceneWidth } from './constants'

export function createSceneLayer() {
  if (typeof document === 'undefined') {
    return null
  }

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  canvas.width = sceneWidth
  canvas.height = sceneHeight

  if (!context) {
    return null
  }

  context.imageSmoothingEnabled = false

  return { canvas, context }
}
