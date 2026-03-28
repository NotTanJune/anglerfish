declare module 'troika-three-text' {
  import { Mesh } from 'three'

  export class Text extends Mesh {
    text: string
    fontSize: number
    color: string | number
    anchorX: string | number
    anchorY: string | number
    outlineWidth: number
    outlineColor: string | number
    sync(): void
  }
}
