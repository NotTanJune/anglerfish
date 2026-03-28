import { MathUtils } from 'three'

export class Random {
  seed: number
  state: number

  constructor(seed?: number) {
    this.seed = seed ?? Math.random()
    this.state = this.generate(this.seed)
  }

  next(): number {
    this.state = this.generate(this.state)
    return this.state
  }

  generate(x: number): number {
    const n = Math.sin(x * 12.9898) * 43758.5453
    return n - Math.floor(n)
  }

  generate2D(x: number, y: number): number {
    x += this.seed
    y += this.seed
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    return n - Math.floor(n)
  }

  perlin(x: number, y: number): number {
    function cubicInterpolation(a: number, b: number, t: number): number {
      t = t * t * t * (t * (t * 6 - 15) + 10)
      return (1 - t) * a + t * b
    }

    const leftX = Math.floor(x)
    const topY = Math.floor(y)
    const rightX = leftX + 1
    const bottomY = topY + 1
    const leftOffset = x - leftX
    const topOffset = y - topY
    const rightOffset = x - rightX
    const bottomOffset = y - bottomY

    const topLeftGridValue = this.generate2D(leftX, topY) * Math.PI * 2
    const topRightGridValue = this.generate2D(rightX, topY) * Math.PI * 2
    const bottomLeftGridValue = this.generate2D(leftX, bottomY) * Math.PI * 2
    const bottomRightGridValue = this.generate2D(rightX, bottomY) * Math.PI * 2

    const topLeftNoiseValue = leftOffset * Math.cos(topLeftGridValue) + topOffset * Math.sin(topLeftGridValue)
    const topRightNoiseValue = rightOffset * Math.cos(topRightGridValue) + topOffset * Math.sin(topRightGridValue)
    const bottomLeftNoiseValue = leftOffset * Math.cos(bottomLeftGridValue) + bottomOffset * Math.sin(bottomLeftGridValue)
    const bottomRightNoiseValue = rightOffset * Math.cos(bottomRightGridValue) + bottomOffset * Math.sin(bottomRightGridValue)

    const topNoiseValue = cubicInterpolation(topLeftNoiseValue, topRightNoiseValue, leftOffset)
    const bottomNoiseValue = cubicInterpolation(bottomLeftNoiseValue, bottomRightNoiseValue, leftOffset)
    return MathUtils.clamp(cubicInterpolation(topNoiseValue, bottomNoiseValue, topOffset), -0.7, 0.7) / 0.7
  }
}
