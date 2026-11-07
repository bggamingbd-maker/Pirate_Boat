import type { SoundName } from './types'

type Wave = OscillatorType

/** Tiny WebAudio synth. No audio files, no dependencies. */
export class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  muted: boolean

  constructor(muted: boolean) {
    this.muted = muted
  }

  /** Must be called from a user gesture (Start, tap, key press). */
  unlock(): void {
    if (!this.ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.5
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.01)
    }
  }

  play(name: SoundName): void {
    if (this.muted || !this.ctx) return
    switch (name) {
      case 'coin':
        this.tone(988, 0.07, 'square', 0.12)
        this.tone(1319, 0.14, 'square', 0.12, 0.06)
        break
      case 'chest':
        ;[523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.22, i * 0.07))
        break
      case 'crash':
        this.noise(0.6, 0.5, 700)
        this.tone(140, 0.5, 'sawtooth', 0.25, 0, 40)
        break
      case 'port':
        ;[392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.22, i * 0.1))
        break
      case 'start':
        this.tone(330, 0.25, 'triangle', 0.22, 0, 660)
        break
      case 'click':
        this.tone(620, 0.05, 'square', 0.08)
        break
      case 'pause':
        this.tone(480, 0.12, 'triangle', 0.18, 0, 320)
        break
    }
  }

  private tone(freq: number, dur: number, type: Wave, vol: number, delay = 0, slideTo?: number): void {
    if (!this.ctx || !this.master) return
    const t0 = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(gain).connect(this.master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  private noise(dur: number, vol: number, cutoff: number): void {
    if (!this.ctx || !this.master) return
    const len = Math.floor(this.ctx.sampleRate * dur)
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    const gain = this.ctx.createGain()
    gain.gain.value = vol
    src.connect(filter).connect(gain).connect(this.master)
    src.start()
  }
}
