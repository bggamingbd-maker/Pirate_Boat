import {
  BOAT_Y,
  H,
  W,
  type EngineEvents,
  type Entity,
  type EntityKind,
  type GameStatus,
  type HudState,
} from './types'
import { drawIsland, drawOcean, makeWaves, type Island, type WaveMark } from './world'
import {
  PLAYER_SHIP,
  drawBarrel,
  drawChest,
  drawChestBody,
  drawCoin,
  drawEnemy,
  drawMonster,
  drawRock,
  drawShip,
  drawSpark,
} from './sprites'

const PX_PER_M = 10
const LEG_M = 600
const MAX_VX = 330
const MIN_X = 40
const MAX_X = W - 40
/** Where flying coins land (the coin chip in the HUD). */
const COIN_TARGET = { x: 52, y: 104 }

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  grav: number
  life: number
  max: number
  size: number
  color: string
  under: boolean
  star: boolean
}
interface FloatText {
  x: number
  y: number
  text: string
  life: number
  color: string
  size: number
}
interface Effect {
  kind: 'chest' | 'coinFly'
  x: number
  y: number
  t: number
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const rand = (a: number, b: number) => a + Math.random() * (b - a)

export class PirateEngine {
  status: GameStatus = 'menu'

  private ctx: CanvasRenderingContext2D
  private raf = 0
  private last = 0
  private running = false

  private entities: Entity[] = []
  private particles: Particle[] = []
  private texts: FloatText[] = []
  private effects: Effect[] = []
  private islands: Island[] = []
  private waves: WaveMark[] = makeWaves()
  private nextId = 1

  private animT = 0
  private boatX = W / 2
  private boatVx = 0
  private keyAxis = 0
  private touchAxis = 0

  private distPx = 0
  private coins = 0
  private chests = 0
  private ports = 0
  private scoreF = 0
  private best: number
  private spawnLeft = 0
  private islandLeft = 0
  private dying = false
  private dyingT = 0
  private shake = 0
  private banner: { text: string; t: number } | null = null
  private wakeT = 0
  private playMs = 0
  private hudAcc = 0
  private lastHud = ''
  private scale = { x: 1, y: 1 }

  constructor(
    private canvas: HTMLCanvasElement,
    private events: EngineEvents,
    best: number,
  ) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is not available')
    this.ctx = ctx
    this.best = best
    this.seedIslands()
    this.emitHud(true)
  }

  // ---------- public API ----------

  run(): void {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    const loop = (ts: number) => {
      if (!this.running) return
      const dt = Math.min(0.05, (ts - this.last) / 1000)
      this.last = ts
      this.step(dt)
      this.render()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  destroy(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  resize(cssW: number, cssH: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.max(1, Math.round(cssW * dpr))
    this.canvas.height = Math.max(1, Math.round(cssH * dpr))
    this.scale = { x: this.canvas.width / W, y: this.canvas.height / H }
  }

  setKeyAxis(axis: number): void {
    this.keyAxis = axis
  }

  setTouchAxis(axis: number): void {
    this.touchAxis = axis
  }

  start(): void {
    this.entities = []
    this.particles = []
    this.texts = []
    this.effects = []
    this.boatX = W / 2
    this.boatVx = 0
    this.distPx = 0
    this.coins = 0
    this.chests = 0
    this.ports = 0
    this.scoreF = 0
    this.dying = false
    this.dyingT = 0
    this.shake = 0
    this.banner = null
    this.playMs = 0
    this.spawnLeft = 60
    this.status = 'playing'
    // A friendly opening line of coins to teach the pickup.
    for (let i = 0; i < 4; i++) this.addEntity('coin', W / 2, 250 - i * 28)
    this.events.onSound('start')
    this.emitHud(true)
  }

  pause(): void {
    if (this.status !== 'playing' || this.dying) return
    this.status = 'paused'
    this.events.onSound('pause')
    this.emitHud(true)
  }

  resume(): void {
    if (this.status !== 'paused') return
    this.status = 'playing'
    this.last = performance.now()
    this.events.onSound('click')
    this.emitHud(true)
  }

  togglePause(): void {
    if (this.status === 'playing') this.pause()
    else if (this.status === 'paused') this.resume()
  }

  // ---------- simulation ----------

  private step(dt: number): void {
    if (this.status === 'paused') return
    this.animT += dt
    if (this.status === 'playing') this.updatePlaying(dt)
    else if (this.status === 'menu') this.updateMenu(dt)
    this.updateFx(dt)
    this.hudAcc += dt
    if (this.hudAcc > 0.1) {
      this.hudAcc = 0
      this.emitHud(false)
    }
  }

  private updateMenu(dt: number): void {
    const speed = 90
    this.moveBackdrop(speed * dt)
    this.emitWake(dt, speed)
  }

  private speed(): number {
    return 170 + Math.min(190, this.scoreF * 0.12)
  }
  private diff(): number {
    return Math.min(1, this.scoreF / 1500)
  }
  private spacing(): number {
    return 250 - 65 * this.diff()
  }

  private updatePlaying(dt: number): void {
    if (this.dying) {
      this.dyingT += dt
      const slow = 1 - Math.min(1, this.dyingT / 0.9)
      const scroll = this.speed() * slow * dt
      this.moveBackdrop(scroll)
      this.moveEntities(dt, scroll)
      if (this.dyingT > 1.15) this.finish()
      return
    }
    this.playMs += dt * 1000
    const axis = clamp(this.keyAxis + this.touchAxis, -1, 1)
    this.boatVx += (axis * MAX_VX - this.boatVx) * (1 - Math.exp(-12 * dt))
    this.boatX += this.boatVx * dt
    if (this.boatX < MIN_X || this.boatX > MAX_X) {
      this.boatX = clamp(this.boatX, MIN_X, MAX_X)
      this.boatVx = 0
    }

    const speed = this.speed()
    const scroll = speed * dt
    this.distPx += scroll
    this.moveBackdrop(scroll)
    this.moveEntities(dt, scroll)

    this.spawnLeft -= scroll
    while (this.spawnLeft <= 0) {
      this.spawnRow(-this.spawnLeft)
      this.spawnLeft += this.spacing()
    }

    this.collide()
    this.checkPort()
    this.scoreF = this.distPx / PX_PER_M / 2 + this.coins * 10 + this.chests * 50 + this.ports * 100
    this.emitWake(dt, speed)
  }

  private moveBackdrop(px: number): void {
    for (const w of this.waves) {
      w.y += px * 0.95
      if (w.y > H + 10) {
        w.y -= H + 20
        w.x = Math.random() * W
      }
    }
    for (const il of this.islands) il.y += px * 0.9
    this.islands = this.islands.filter((il) => il.y < H + 160)
    this.islandLeft -= px
    if (this.islandLeft <= 0) {
      this.addIsland(false)
      this.islandLeft = rand(260, 520)
    }
  }

  private seedIslands(): void {
    this.islands = []
    for (let i = 0; i < 4; i++) {
      this.addIsland(false)
      this.islands[this.islands.length - 1].y = 80 + i * 170
    }
    this.islandLeft = 200
  }

  private addIsland(port: boolean): void {
    const left = port ? this.ports % 2 === 0 : Math.random() < 0.5
    const size = port ? 62 : rand(34, 56)
    this.islands.push({
      x: left ? rand(-12, 2) : W + rand(-2, 12),
      y: -size * 2,
      size,
      seed: Math.floor(rand(1, 999)),
      port,
    })
  }

  private moveEntities(dt: number, scroll: number): void {
    for (const e of this.entities) {
      e.t += dt
      e.y += scroll + e.vy * dt
      switch (e.kind) {
        case 'enemy':
          e.x += e.vx * dt
          if (e.x < 44) {
            e.x = 44
            e.vx = Math.abs(e.vx)
          } else if (e.x > W - 44) {
            e.x = W - 44
            e.vx = -Math.abs(e.vx)
          }
          break
        case 'monster':
          e.x = clamp(e.x + Math.cos(e.t * 1.4 + e.phase) * 38 * dt, 40, W - 40)
          if (e.y > 40) e.emerge = Math.min(1, e.emerge + dt / 0.9)
          break
        case 'barrel':
          e.x = clamp(e.x + e.vx * dt, 30, W - 30)
          break
        case 'coin': {
          if (this.dying) break
          const dx = this.boatX - e.x
          const dy = BOAT_Y - 8 - e.y
          const d = Math.hypot(dx, dy)
          if (d < 62 && d > 0.1) {
            const pull = 260 * dt
            e.x += (dx / d) * pull
            e.y += (dy / d) * pull
          }
          break
        }
        default:
          break
      }
    }
    this.entities = this.entities.filter((e) => !e.collected && e.y < H + 90)
  }

  // ---------- spawning ----------

  private addEntity(kind: EntityKind, x: number, y: number): Entity {
    const radius: Record<EntityKind, number> = {
      coin: 11,
      chest: 16,
      rock: rand(20, 28),
      barrel: 14,
      monster: 24,
      enemy: 22,
    }
    const e: Entity = {
      id: this.nextId++,
      kind,
      x,
      y,
      r: radius[kind],
      vx: 0,
      vy: 0,
      phase: Math.random() * Math.PI * 2,
      seed: Math.floor(rand(1, 9999)),
      t: 0,
      emerge: 0,
      collected: false,
    }
    this.entities.push(e)
    return e
  }

  private pickKind(d: number, enemyUsed: boolean): EntityKind {
    const table: [EntityKind, number][] = [
      ['rock', 5],
      ['barrel', 3],
      ['monster', d > 0.1 ? 2 + 2 * d : 0],
      ['enemy', !enemyUsed && d > 0.22 ? 1.5 + 2 * d : 0],
    ]
    const total = table.reduce((s, [, w]) => s + w, 0)
    let roll = Math.random() * total
    for (const [kind, w] of table) {
      roll -= w
      if (roll <= 0) return kind
    }
    return 'rock'
  }

  /** There must always be a gap wide enough to sail through. */
  private gapOk(list: { x: number; r: number; enemy: boolean }[], need: number): boolean {
    const s = [...list].sort((a, b) => a.x - b.x)
    let cursor = 24
    let widest = 0
    for (const o of s) {
      const pad = o.r * 0.9 + (o.enemy ? 14 : 0)
      widest = Math.max(widest, o.x - pad - cursor)
      cursor = Math.max(cursor, o.x + pad)
    }
    return Math.max(widest, W - 24 - cursor) >= need
  }

  private spawnRow(overshoot: number): void {
    const d = this.diff()
    const y = -60 + overshoot
    let count = 1
    if (Math.random() < 0.35 + 0.5 * d) count++
    if (Math.random() < 0.6 * d) count++
    const placed: { x: number; r: number; enemy: boolean; kind: EntityKind }[] = []
    let enemyUsed = false
    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const kind = this.pickKind(d, enemyUsed)
        const r = kind === 'rock' ? rand(20, 28) : kind === 'barrel' ? 14 : kind === 'monster' ? 24 : 22
        const x = rand(MIN_X - 6, MAX_X + 6)
        const next = [...placed, { x, r, enemy: kind === 'enemy', kind }]
        const clear = placed.every((p) => Math.abs(p.x - x) > p.r + r + 8)
        if (clear && this.gapOk(next, 112 - 14 * d)) {
          placed.push({ x, r, enemy: kind === 'enemy', kind })
          if (kind === 'enemy') enemyUsed = true
          break
        }
      }
    }
    for (const p of placed) {
      const e = this.addEntity(p.kind, p.x, y)
      e.r = p.r
      if (p.kind === 'enemy') {
        e.vx = (Math.random() < 0.5 ? -1 : 1) * (45 + 50 * d + rand(0, 20))
        e.vy = 50 + 60 * d
      } else if (p.kind === 'barrel') {
        e.vx = rand(-18, 18)
      }
    }
    this.spawnReward(y - this.spacing() / 2)
  }

  private spawnReward(y: number): void {
    const cx = rand(70, W - 70)
    if (Math.random() < 0.14) {
      this.addEntity('chest', cx, y)
      if (Math.random() < 0.4) {
        // Risky chest: a rock guards one side.
        const side = cx > W / 2 ? -1 : 1
        this.addEntity('rock', clamp(cx + side * 52, 30, W - 30), y)
      }
      return
    }
    const pattern = Math.floor(Math.random() * 3)
    for (let i = 0; i < 5; i++) {
      if (pattern === 0 && i < 4) this.addEntity('coin', cx, y + (i - 1.5) * 26)
      else if (pattern === 1) this.addEntity('coin', clamp(cx + (i - 2) * 28, 36, W - 36), y)
      else if (pattern === 2) this.addEntity('coin', clamp(cx + (i - 2) * 22, 36, W - 36), y + (i - 2) * 20)
    }
  }

  // ---------- collisions & events ----------

  private hazardCircles(e: Entity): { x: number; y: number; r: number }[] {
    switch (e.kind) {
      case 'rock':
        return [{ x: e.x, y: e.y, r: e.r * 0.82 }]
      case 'barrel':
        return [{ x: e.x, y: e.y, r: e.r * 0.9 }]
      case 'monster':
        return e.emerge > 0.55 ? [{ x: e.x, y: e.y, r: 23 * e.emerge }] : []
      case 'enemy':
        return [
          { x: e.x, y: e.y - 13, r: 15 },
          { x: e.x, y: e.y + 13, r: 15 },
        ]
      default:
        return []
    }
  }

  private collide(): void {
    const bc = [
      { x: this.boatX, y: BOAT_Y - 16, r: 11 },
      { x: this.boatX, y: BOAT_Y + 10, r: 12 },
    ]
    for (const e of this.entities) {
      if (e.collected) continue
      if (e.kind === 'coin' || e.kind === 'chest') {
        const hit = bc.some((b) => Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r + 8)
        if (hit) {
          if (e.kind === 'coin') this.collectCoin(e)
          else this.collectChest(e)
        }
      } else if (
        this.hazardCircles(e).some((h) => bc.some((b) => Math.hypot(b.x - h.x, b.y - h.y) < h.r + b.r))
      ) {
        this.crash()
        return
      }
    }
  }

  private burst(x: number, y: number, n: number, colors: string[], speed: number, star = false): void {
    for (let i = 0; i < n && this.particles.length < 320; i++) {
      const a = Math.random() * Math.PI * 2
      const v = rand(speed * 0.4, speed)
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        grav: 220,
        life: rand(0.4, 0.9),
        max: 0.9,
        size: rand(2, 4.5),
        color: colors[i % colors.length],
        under: false,
        star,
      })
    }
  }

  private collectCoin(e: Entity): void {
    e.collected = true
    this.coins++
    this.burst(e.x, e.y, 7, ['#ffe066', '#fff3b0', '#ffb703'], 150, true)
    this.effects.push({ kind: 'coinFly', x: e.x, y: e.y, t: 0 })
    this.texts.push({ x: e.x, y: e.y - 14, text: '+10', life: 0.8, color: '#ffe066', size: 16 })
    this.events.onSound('coin')
    this.emitHud(true)
  }

  private collectChest(e: Entity): void {
    e.collected = true
    this.chests++
    this.effects.push({ kind: 'chest', x: e.x, y: e.y, t: 0 })
    this.burst(e.x, e.y - 6, 26, ['#ffe066', '#ffd166', '#fff', '#ff9f1c'], 260, true)
    this.texts.push({ x: e.x, y: e.y - 30, text: '+50 Treasure!', life: 1.3, color: '#fff3b0', size: 22 })
    this.shake = Math.max(this.shake, 0.15)
    this.events.onSound('chest')
    this.emitHud(true)
  }

  private checkPort(): void {
    if (this.distPx / PX_PER_M < (this.ports + 1) * LEG_M) return
    this.ports++
    this.addIsland(true)
    this.banner = { text: `Port ${this.ports} reached! +100`, t: 2.2 }
    this.burst(W / 2, 260, 36, ['#ffe066', '#e63946', '#4cc9f0', '#fff'], 300, true)
    this.events.onSound('port')
    this.emitHud(true)
  }

  private crash(): void {
    this.dying = true
    this.dyingT = 0
    this.shake = 0.7
    this.keyAxis = 0
    this.touchAxis = 0
    const y = BOAT_Y
    this.burst(this.boatX, y, 30, ['#c9772b', '#7a3e12', '#fff', '#ff9f1c'], 280)
    for (let i = 0; i < 18; i++) {
      this.particles.push({
        x: this.boatX + rand(-14, 14),
        y: y + rand(-20, 20),
        vx: rand(-60, 60),
        vy: rand(-80, 20),
        grav: -20,
        life: rand(0.6, 1.2),
        max: 1.2,
        size: rand(8, 16),
        color: 'rgba(235,240,250,0.75)',
        under: false,
        star: false,
      })
    }
    this.events.onSound('crash')
    this.emitHud(true)
  }

  private finish(): void {
    const score = Math.floor(this.scoreF)
    const newBest = score > this.best
    if (newBest) this.best = score
    this.status = 'over'
    this.events.onGameOver({
      score,
      coins: this.coins,
      chests: this.chests,
      distanceM: Math.floor(this.distPx / PX_PER_M),
      stage: this.ports + 1,
      durationMs: Math.round(this.playMs),
      newBest,
    })
    this.emitHud(true)
  }

  // ---------- effects ----------

  private emitWake(dt: number, speed: number): void {
    this.wakeT -= dt
    if (this.wakeT > 0) return
    this.wakeT = 0.03
    const push = (x: number, y: number, vx: number, size: number) =>
      this.particles.push({
        x,
        y,
        vx,
        vy: speed * 0.92 + rand(0, 20),
        grav: 0,
        life: 0.65,
        max: 0.65,
        size,
        color: 'rgba(255,255,255,0.75)',
        under: true,
        star: false,
      })
    push(this.boatX + rand(-5, 5), BOAT_Y + 32, rand(-12, 12) - this.boatVx * 0.15, rand(5, 8))
    push(this.boatX - 13, BOAT_Y - 14, -rand(30, 50), rand(2.5, 4))
    push(this.boatX + 13, BOAT_Y - 14, rand(30, 50), rand(2.5, 4))
  }

  private updateFx(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += p.grav * dt
      p.life -= dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    for (const t of this.texts) {
      t.y -= 38 * dt
      t.life -= dt
    }
    this.texts = this.texts.filter((t) => t.life > 0)
    for (const f of this.effects) f.t += dt
    this.effects = this.effects.filter((f) => f.t < (f.kind === 'chest' ? 0.9 : 0.5))
    this.shake = Math.max(0, this.shake - dt * 1.6)
    if (this.banner) {
      this.banner.t -= dt
      if (this.banner.t <= 0) this.banner = null
    }
  }

  // ---------- HUD ----------

  private hud(): HudState {
    const score = Math.floor(this.scoreF)
    const legStart = this.ports * LEG_M
    const distM = this.distPx / PX_PER_M
    return {
      status: this.status,
      score,
      best: Math.max(this.best, score),
      coins: this.coins,
      chests: this.chests,
      distanceM: Math.floor(distM),
      toPortM: Math.max(0, Math.ceil(legStart + LEG_M - distM)),
      legProgress: clamp((distM - legStart) / LEG_M, 0, 1),
      stage: this.ports + 1,
      newBest: score > this.best && score > 0,
    }
  }

  private emitHud(force: boolean): void {
    const h = this.hud()
    const key = JSON.stringify(h)
    if (!force && key === this.lastHud) return
    this.lastHud = key
    this.events.onHud(h)
  }

  // ---------- rendering ----------

  private render(): void {
    const ctx = this.ctx
    ctx.setTransform(this.scale.x, 0, 0, this.scale.y, 0, 0)
    ctx.save()
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake * 14, (Math.random() - 0.5) * this.shake * 14)
    }
    const t = this.animT
    drawOcean(ctx, t, this.waves)
    for (const il of this.islands) drawIsland(ctx, il, t)

    for (const p of this.particles) if (p.under) this.drawParticle(p)

    const order: EntityKind[] = ['rock', 'barrel', 'monster', 'enemy', 'coin', 'chest']
    for (const kind of order) {
      for (const e of this.entities) {
        if (e.kind !== kind) continue
        if (kind === 'rock') drawRock(ctx, e, t)
        else if (kind === 'barrel') drawBarrel(ctx, e, t)
        else if (kind === 'monster') drawMonster(ctx, e, t)
        else if (kind === 'enemy') drawEnemy(ctx, e, t)
        else if (kind === 'coin') drawCoin(ctx, e, t)
        else drawChest(ctx, e, t)
      }
    }

    if (this.status !== 'over' && !(this.dying && this.dyingT > 0.9)) this.drawBoat()

    for (const f of this.effects) this.drawEffect(f)
    for (const p of this.particles) if (!p.under) this.drawParticle(p)
    for (const tx of this.texts) {
      ctx.globalAlpha = clamp(tx.life / 0.4, 0, 1)
      ctx.font = `700 ${tx.size}px "Space Grotesk", sans-serif`
      ctx.textAlign = 'center'
      ctx.lineWidth = 4
      ctx.strokeStyle = 'rgba(60,30,0,0.75)'
      ctx.strokeText(tx.text, tx.x, tx.y)
      ctx.fillStyle = tx.color
      ctx.fillText(tx.text, tx.x, tx.y)
      ctx.globalAlpha = 1
    }
    if (this.banner) this.drawBanner(this.banner)
    ctx.restore()

    // Soft vignette for depth.
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75)
    v.addColorStop(0, 'rgba(0,10,40,0)')
    v.addColorStop(1, 'rgba(0,10,40,0.35)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, W, H)
  }

  private drawBoat(): void {
    const ctx = this.ctx
    ctx.save()
    ctx.translate(this.boatX, BOAT_Y + Math.sin(this.animT * 3) * 1.6)
    if (this.dying) {
      const k = clamp(this.dyingT / 1.1, 0, 1)
      ctx.rotate(k * 1.4)
      ctx.scale(1 - k * 0.45, 1 - k * 0.45)
      ctx.globalAlpha = 1 - k * 0.9
    }
    drawShip(ctx, PLAYER_SHIP, this.animT, this.boatVx / MAX_VX)
    ctx.restore()
  }

  private drawParticle(p: Particle): void {
    const ctx = this.ctx
    const k = clamp(p.life / p.max, 0, 1)
    ctx.globalAlpha = p.under ? k * 0.8 : k
    if (p.star) {
      drawSpark(ctx, p.x, p.y, p.size * 0.8, p.color)
    } else {
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (p.under ? 0.5 + k * 0.5 : 0.6 + k * 0.4), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  private drawEffect(f: Effect): void {
    const ctx = this.ctx
    if (f.kind === 'coinFly') {
      const k = clamp(f.t / 0.5, 0, 1)
      const e = k * k * (3 - 2 * k)
      const x = f.x + (COIN_TARGET.x - f.x) * e
      const y = f.y + (COIN_TARGET.y - f.y) * e
      drawCoin(
        ctx,
        { x, y, r: 11 * (1 - k * 0.4), phase: 0 } as Entity,
        this.animT * 2,
      )
      return
    }
    const k = clamp(f.t / 0.9, 0, 1)
    ctx.save()
    ctx.translate(f.x, f.y)
    // Light rays fanning out of the opened chest.
    ctx.globalAlpha = (1 - k) * 0.85
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.28
      const len = 24 + k * 70
      const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len)
      g.addColorStop(0, 'rgba(255,240,150,0.95)')
      g.addColorStop(1, 'rgba(255,240,150,0)')
      ctx.strokeStyle = g
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(0, -8)
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len - 8)
      ctx.stroke()
    }
    ctx.scale(1.1 + k * 0.2, 1.1 + k * 0.2)
    ctx.translate(0, -4)
    drawChestBody(ctx, clamp(k * 5, 0, 1))
    ctx.restore()
    ctx.globalAlpha = 1
  }

  private drawBanner(b: { text: string; t: number }): void {
    const ctx = this.ctx
    const k = clamp(Math.min(b.t / 0.4, (2.2 - b.t) / 0.25), 0, 1)
    ctx.save()
    ctx.globalAlpha = k
    ctx.translate(W / 2, 230 - (1 - k) * 20)
    ctx.font = '700 28px "Space Grotesk", sans-serif'
    ctx.textAlign = 'center'
    ctx.lineWidth = 7
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0b1f3a'
    ctx.strokeText(b.text, 0, 0)
    ctx.fillStyle = '#ffd166'
    ctx.fillText(b.text, 0, 0)
    ctx.restore()
  }
}
