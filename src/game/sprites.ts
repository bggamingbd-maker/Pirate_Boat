import type { Entity } from './types'
import { rnd } from './world'

type Ctx = CanvasRenderingContext2D

export interface ShipPalette {
  hull: string
  hullDark: string
  trim: string
  deck: string
  sail: string
  sailStripe: string
  jib: string
  flag: string
  skull: string
}

export const PLAYER_SHIP: ShipPalette = {
  hull: '#d9822b',
  hullDark: '#7a3e12',
  trim: '#e63946',
  deck: '#f2c985',
  sail: '#fff7e6',
  sailStripe: '#e63946',
  jib: '#ffd166',
  flag: '#111827',
  skull: '#1f2937',
}

export const ENEMY_SHIP: ShipPalette = {
  hull: '#454a6b',
  hullDark: '#1c1e2e',
  trim: '#9d0208',
  deck: '#6b6f8a',
  sail: '#2b2b38',
  sailStripe: '#9d0208',
  jib: '#4a4a5c',
  flag: '#d00000',
  skull: '#f1ead8',
}

function hullPath(ctx: Ctx, s: number): void {
  ctx.beginPath()
  ctx.moveTo(0, -36 * s)
  ctx.bezierCurveTo(16 * s, -18 * s, 17 * s, 10 * s, 11 * s, 32 * s)
  ctx.quadraticCurveTo(0, 38 * s, -11 * s, 32 * s)
  ctx.bezierCurveTo(-17 * s, 10 * s, -16 * s, -18 * s, 0, -36 * s)
  ctx.closePath()
}

/** Draws a ship seen from above, bow pointing up (negative y). Origin is the ship centre. */
export function drawShip(ctx: Ctx, p: ShipPalette, t: number, lean: number): void {
  ctx.save()
  ctx.rotate(lean * 0.2)

  // Water shadow.
  ctx.fillStyle = 'rgba(0,35,80,0.3)'
  ctx.beginPath()
  ctx.ellipse(4, 7, 18, 38, 0, 0, Math.PI * 2)
  ctx.fill()

  // Hull with a coloured rail.
  hullPath(ctx, 1)
  const hg = ctx.createLinearGradient(-17, 0, 17, 0)
  hg.addColorStop(0, p.hullDark)
  hg.addColorStop(0.5, p.hull)
  hg.addColorStop(1, p.hullDark)
  ctx.fillStyle = hg
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = p.trim
  ctx.stroke()

  // Deck planks.
  hullPath(ctx, 0.74)
  ctx.fillStyle = p.deck
  ctx.fill()
  ctx.lineWidth = 1.2
  ctx.strokeStyle = p.hullDark
  ctx.stroke()
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'
  ctx.lineWidth = 1
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo(i * 4.5, -20)
    ctx.lineTo(i * 4.5, 26)
    ctx.stroke()
  }

  // Helmsman: red bandana with a face peeking out.
  ctx.fillStyle = p.trim
  ctx.beginPath()
  ctx.arc(0, 23, 4.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f1c27d'
  ctx.beginPath()
  ctx.arc(0, 24.6, 2.6, 0, Math.PI * 2)
  ctx.fill()

  // Jib (front sail).
  const jibSway = Math.sin(t * 3.2 + 1) * 2.5
  ctx.beginPath()
  ctx.moveTo(0, -33)
  ctx.quadraticCurveTo(10 + jibSway, -20, 1, -9)
  ctx.lineTo(0, -9)
  ctx.closePath()
  ctx.fillStyle = p.jib
  ctx.fill()
  ctx.strokeStyle = p.hullDark
  ctx.lineWidth = 1
  ctx.stroke()

  // Main sail billowing with the wind.
  const b = 9 + Math.sin(t * 3.2) * 3.5
  ctx.beginPath()
  ctx.moveTo(-24, -6)
  ctx.quadraticCurveTo(0, -6 + b * 2, 24, -6)
  ctx.lineTo(24, -1)
  ctx.quadraticCurveTo(0, -1 + b * 2 + 2, -24, -1)
  ctx.closePath()
  ctx.fillStyle = p.sail
  ctx.fill()
  ctx.strokeStyle = p.hullDark
  ctx.lineWidth = 1.2
  ctx.stroke()
  ctx.strokeStyle = p.sailStripe
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(-24, -3.5)
  ctx.quadraticCurveTo(0, -3.5 + b * 2 + 1, 24, -3.5)
  ctx.stroke()

  // Skull emblem on the sail.
  const sy = -3.5 + b + 0.5
  ctx.fillStyle = p.skull
  ctx.beginPath()
  ctx.arc(0, sy, 3.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = p.sail
  ctx.beginPath()
  ctx.arc(-1.4, sy - 0.4, 0.9, 0, Math.PI * 2)
  ctx.arc(1.4, sy - 0.4, 0.9, 0, Math.PI * 2)
  ctx.fill()

  // Mast and fluttering pennant.
  ctx.fillStyle = p.hullDark
  ctx.beginPath()
  ctx.arc(0, -3.5, 3.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = p.flag
  ctx.beginPath()
  ctx.moveTo(0, -4)
  ctx.lineTo(15 + Math.sin(t * 8) * 2.5, -6 + Math.cos(t * 8) * 1.8)
  ctx.lineTo(0, -9)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function drawRock(ctx: Ctx, e: Entity, t: number): void {
  ctx.save()
  ctx.translate(e.x, e.y)
  const sh = ctx.createRadialGradient(0, 0, e.r * 0.6, 0, 0, e.r * 1.7)
  sh.addColorStop(0, 'rgba(140,250,235,0.5)')
  sh.addColorStop(1, 'rgba(140,250,235,0)')
  ctx.fillStyle = sh
  ctx.beginPath()
  ctx.arc(0, 0, e.r * 1.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = `rgba(255,255,255,${0.55 + Math.sin(t * 2.4 + e.phase) * 0.2})`
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, e.r * 1.22 + Math.sin(t * 2 + e.phase) * 2, 0, Math.PI * 2)
  ctx.stroke()

  const poly = (scale: number, ox: number, oy: number) => {
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      const r = e.r * scale * (0.82 + 0.26 * rnd(e.seed + i))
      const px = ox + Math.cos(a) * r
      const py = oy + Math.sin(a) * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
  }
  poly(1, 0, 0)
  const g = ctx.createRadialGradient(-e.r * 0.3, -e.r * 0.3, 2, 0, 0, e.r * 1.1)
  g.addColorStop(0, '#c4ccd8')
  g.addColorStop(1, '#556070')
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = '#3b4452'
  ctx.lineWidth = 2
  ctx.stroke()
  poly(0.55, -e.r * 0.15, -e.r * 0.18)
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.fill()
  ctx.restore()
}

export function drawBarrel(ctx: Ctx, e: Entity, t: number): void {
  ctx.save()
  ctx.translate(e.x, e.y)
  ctx.strokeStyle = `rgba(255,255,255,${0.4 + Math.sin(t * 3 + e.phase) * 0.15})`
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(0, 0, e.r * 1.35 + Math.sin(t * 2.6 + e.phase) * 1.5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.rotate(t * 0.6 + e.phase)
  ctx.fillStyle = 'rgba(0,35,80,0.25)'
  ctx.beginPath()
  ctx.arc(3, 4, e.r, 0, Math.PI * 2)
  ctx.fill()
  const g = ctx.createRadialGradient(-3, -3, 2, 0, 0, e.r)
  g.addColorStop(0, '#d08a4e')
  g.addColorStop(1, '#8a4b1f')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, e.r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#4a230a'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.lineWidth = 1.2
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * e.r, Math.sin(a) * e.r)
    ctx.lineTo(-Math.cos(a) * e.r, -Math.sin(a) * e.r)
    ctx.stroke()
  }
  ctx.strokeStyle = '#d4af37'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.arc(0, 0, e.r * 0.62, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

export function drawMonster(ctx: Ctx, e: Entity, t: number): void {
  const f = e.emerge
  ctx.save()
  ctx.translate(e.x, e.y)
  // Warning ripples that grow stronger as the monster rises.
  for (let i = 0; i < 3; i++) {
    const k = ((t * 0.9 + i / 3) % 1)
    ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * (0.35 + f * 0.3)})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(0, 0, 14 + k * 38, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = `rgba(0,30,60,${0.15 + f * 0.25})`
  ctx.beginPath()
  ctx.arc(0, 0, 14 + f * 18, 0, Math.PI * 2)
  ctx.fill()

  if (f > 0.05) {
    const sc = 0.4 + f * 0.6
    ctx.scale(sc, sc)
    ctx.lineCap = 'round'
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + Math.sin(t * 2 + i) * 0.25
      const len = 40
      const cx = Math.cos(a + 0.6) * len * 0.75
      const cy = Math.sin(a + 0.6) * len * 0.75
      const ex = Math.cos(a) * len
      const ey = Math.sin(a) * len
      ctx.strokeStyle = '#1f7a6e'
      ctx.lineWidth = 11
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(cx, cy, ex, ey)
      ctx.stroke()
      ctx.strokeStyle = '#36b5a3'
      ctx.lineWidth = 6
      ctx.stroke()
      ctx.fillStyle = '#ffd6e0'
      ctx.beginPath()
      ctx.arc(ex * 0.8, ey * 0.8, 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
    const g = ctx.createRadialGradient(-6, -6, 3, 0, 0, 26)
    g.addColorStop(0, '#5ad1bd')
    g.addColorStop(1, '#1f7a6e')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, 25, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#124d45'
    ctx.lineWidth = 2.5
    ctx.stroke()
    // Eyes face the boat (downwards).
    for (const sx of [-9, 9]) {
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(sx, 5, 6.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#c1121f'
      ctx.beginPath()
      ctx.arc(sx, 7, 3.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#111'
      ctx.beginPath()
      ctx.arc(sx, 7.5, 1.4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = '#124d45'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(0, 14, 7, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
  }
  ctx.restore()
}

export function drawEnemy(ctx: Ctx, e: Entity, t: number): void {
  ctx.save()
  ctx.translate(e.x, e.y)
  // Bow wave, because it sails towards you.
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 36, 18 + Math.sin(t * 6) * 1.5, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()
  ctx.rotate(Math.PI)
  drawShip(ctx, ENEMY_SHIP, t + e.phase, -e.vx / 90)
  ctx.restore()
}

export function drawCoin(ctx: Ctx, e: Entity, t: number): void {
  const s = Math.abs(Math.cos(t * 4 + e.phase))
  const w = Math.max(2.5, e.r * s)
  ctx.save()
  ctx.translate(e.x, e.y + Math.sin(t * 3 + e.phase) * 1.5)
  ctx.fillStyle = 'rgba(255,215,0,0.28)'
  ctx.beginPath()
  ctx.arc(0, 0, e.r + 5, 0, Math.PI * 2)
  ctx.fill()
  const g = ctx.createLinearGradient(0, -e.r, 0, e.r)
  g.addColorStop(0, '#fff09a')
  g.addColorStop(1, '#f2a100')
  ctx.fillStyle = g
  ctx.strokeStyle = '#a86100'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.ellipse(0, 0, w, e.r, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  if (s > 0.4) {
    ctx.strokeStyle = '#d98a00'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.ellipse(0, 0, w * 0.62, e.r * 0.62, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#c47800'
    ctx.fillRect(-w * 0.1, -e.r * 0.34, w * 0.2, e.r * 0.68)
  }
  ctx.restore()
}

/** Chest body. `open` is 0 (closed) to 1 (fully open). */
export function drawChestBody(ctx: Ctx, open: number): void {
  const bw = 32
  const bh = 14
  // Base
  ctx.fillStyle = '#8a4b1f'
  ctx.strokeStyle = '#3d1d08'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(-bw / 2, -2, bw, bh, 3)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#d4af37'
  ctx.fillRect(-bw / 2 + 5, -2, 4, bh)
  ctx.fillRect(bw / 2 - 9, -2, 4, bh)
  if (open > 0.05) {
    ctx.fillStyle = '#ffd24d'
    ctx.fillRect(-bw / 2 + 3, -4, bw - 6, 4)
  }
  // Lid hinged at the back edge.
  ctx.save()
  ctx.translate(0, -2)
  ctx.rotate(-open * 1.3)
  ctx.fillStyle = '#a65a24'
  ctx.beginPath()
  ctx.moveTo(-bw / 2, 0)
  ctx.lineTo(-bw / 2, -6)
  ctx.quadraticCurveTo(0, -20, bw / 2, -6)
  ctx.lineTo(bw / 2, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#d4af37'
  ctx.fillRect(-bw / 2 + 5, -12, 4, 12)
  ctx.fillRect(bw / 2 - 9, -12, 4, 12)
  ctx.beginPath()
  ctx.arc(0, -1, 3.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawChest(ctx: Ctx, e: Entity, t: number): void {
  ctx.save()
  ctx.translate(e.x, e.y + Math.sin(t * 2.4 + e.phase) * 2)
  const pulse = 0.35 + Math.sin(t * 4 + e.phase) * 0.15
  const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 38)
  halo.addColorStop(0, `rgba(255,214,70,${pulse + 0.15})`)
  halo.addColorStop(1, 'rgba(255,214,70,0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(0, 0, 38, 0, Math.PI * 2)
  ctx.fill()
  ctx.scale(1.1, 1.1)
  ctx.translate(0, -4)
  drawChestBody(ctx, 0)
  ctx.restore()
  // Orbiting sparkles.
  for (let i = 0; i < 3; i++) {
    const a = t * 2 + (i / 3) * Math.PI * 2
    drawSpark(ctx, e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 18, 3.2 + Math.sin(t * 8 + i), '#fff6bf')
  }
}

export function drawSpark(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y - r * 1.6)
  ctx.lineTo(x + r * 0.4, y - r * 0.4)
  ctx.lineTo(x + r * 1.6, y)
  ctx.lineTo(x + r * 0.4, y + r * 0.4)
  ctx.lineTo(x, y + r * 1.6)
  ctx.lineTo(x - r * 0.4, y + r * 0.4)
  ctx.lineTo(x - r * 1.6, y)
  ctx.lineTo(x - r * 0.4, y - r * 0.4)
  ctx.closePath()
  ctx.fill()
}
