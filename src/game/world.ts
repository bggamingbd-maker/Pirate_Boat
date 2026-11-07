import { H, W } from './types'

export interface WaveMark {
  x: number
  y: number
  len: number
  phase: number
  a: number
}

export interface Island {
  x: number
  y: number
  size: number
  seed: number
  port: boolean
}

/** Deterministic pseudo-random in [0,1) from a seed. */
export const rnd = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function makeWaves(count = 46): WaveMark[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    len: 26 + Math.random() * 38,
    phase: Math.random() * Math.PI * 2,
    a: 0.1 + Math.random() * 0.18,
  }))
}

export function drawOcean(ctx: CanvasRenderingContext2D, t: number, waves: WaveMark[]): void {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0a2a6b')
  g.addColorStop(0.45, '#0e63ad')
  g.addColorStop(1, '#1bb8c9')
  ctx.fillStyle = g
  ctx.fillRect(-30, -30, W + 60, H + 60)

  // Soft turquoise light patches drifting across the water.
  for (let i = 0; i < 5; i++) {
    const bx = W * (0.15 + 0.7 * ((i * 0.37) % 1)) + Math.sin(t * 0.4 + i) * 40
    const by = H * ((i * 0.23 + 0.1) % 1) + Math.cos(t * 0.3 + i * 2) * 30
    const rg = ctx.createRadialGradient(bx, by, 0, bx, by, 150)
    rg.addColorStop(0, 'rgba(90,235,230,0.16)')
    rg.addColorStop(1, 'rgba(90,235,230,0)')
    ctx.fillStyle = rg
    ctx.fillRect(bx - 150, by - 150, 300, 300)
  }

  ctx.lineWidth = 2.2
  ctx.lineCap = 'round'
  for (const w of waves) {
    ctx.strokeStyle = `rgba(255,255,255,${w.a})`
    ctx.beginPath()
    for (let i = 0; i <= 8; i++) {
      const px = w.x + (i / 8) * w.len
      const py = w.y + Math.sin(i * 0.9 + t * 2.2 + w.phase) * 3
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
  }
}

function drawPalm(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(0,60,40,0.25)'
  ctx.beginPath()
  ctx.ellipse(4, 5, s * 0.9, s * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + Math.sin(t * 1.4 + i) * 0.06
    ctx.save()
    ctx.rotate(a)
    ctx.fillStyle = i % 2 ? '#2f9e44' : '#37b24d'
    ctx.beginPath()
    ctx.ellipse(s * 0.55, 0, s * 0.62, s * 0.17, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#1b7a34'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(s * 1.1, 0)
    ctx.stroke()
    ctx.restore()
  }
  ctx.fillStyle = '#8d5524'
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawIsland(ctx: CanvasRenderingContext2D, il: Island, t: number): void {
  const { x, y, size: s, seed } = il
  ctx.save()
  ctx.translate(x, y)

  // Shallow turquoise water around the island.
  const sh = ctx.createRadialGradient(0, 0, s * 0.5, 0, 0, s * 1.5)
  sh.addColorStop(0, 'rgba(130,255,235,0.6)')
  sh.addColorStop(1, 'rgba(130,255,235,0)')
  ctx.fillStyle = sh
  ctx.beginPath()
  ctx.arc(0, 0, s * 1.5, 0, Math.PI * 2)
  ctx.fill()

  // Pulsing foam ring.
  ctx.strokeStyle = `rgba(255,255,255,${0.35 + Math.sin(t * 2 + seed) * 0.15})`
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, s * (1.08 + Math.sin(t * 1.6 + seed) * 0.03), 0, Math.PI * 2)
  ctx.stroke()

  const blob = (scale: number) => {
    ctx.beginPath()
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const r = s * scale * (0.9 + 0.2 * rnd(seed + (i % 12)))
      const px = Math.cos(a) * r
      const py = Math.sin(a) * r * 0.9
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
  }
  blob(1)
  ctx.fillStyle = '#f6dda0'
  ctx.fill()
  ctx.strokeStyle = '#e2b866'
  ctx.lineWidth = 2
  ctx.stroke()
  blob(0.68)
  ctx.fillStyle = '#5cbf5a'
  ctx.fill()

  drawPalm(ctx, -s * 0.2, -s * 0.15, s * 0.55, t + seed)
  drawPalm(ctx, s * 0.25, s * 0.18, s * 0.42, t + seed + 2)

  if (il.port) {
    // Wooden pier and a red flag so the port reads clearly.
    const dir = x < W / 2 ? 1 : -1
    ctx.fillStyle = '#9c6b3a'
    ctx.fillRect(dir > 0 ? s * 0.6 : -s * 0.6 - 46, -7, 46, 14)
    ctx.strokeStyle = '#5c3a1a'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 5; i++) {
      const px = (dir > 0 ? s * 0.6 : -s * 0.6 - 46) + i * 10
      ctx.beginPath()
      ctx.moveTo(px, -7)
      ctx.lineTo(px, 7)
      ctx.stroke()
    }
    ctx.fillStyle = '#5c3a1a'
    ctx.fillRect(-1.5, -s * 0.55, 3, s * 0.5)
    ctx.fillStyle = '#e63946'
    ctx.beginPath()
    ctx.moveTo(1.5, -s * 0.55)
    ctx.lineTo(22 + Math.sin(t * 6) * 3, -s * 0.47)
    ctx.lineTo(1.5, -s * 0.38)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}
