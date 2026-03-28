import { useEffect } from 'react'
import { initShaderChunks } from '../shaders/settings'

export function ShaderInit() {
  useEffect(() => {
    initShaderChunks()
  }, [])
  return null
}
