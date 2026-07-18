// FormantSynth: the klattsch synthesis engine, free of any audio-API dependency.
//
// Usage:
//
//   import { FormantSynth } from './synth-core.js';
//   const synth = new FormantSynth({ sampleRate: 48000, schedule });
//   const buf = new Float32Array(48000 * 2);  // 2 seconds
//   synth.process(buf);
//
// `schedule` is an array of { atMs, target, transitionMs } events; the synth
// applies them in time order. Or drive it live with setTarget()

import { BandpassBiquad, glottalPulse, xorshift, softClip } from './dsp.js';

export const glottalTable = [
0.000,0.018,0.036,0.054,0.073,0.092,0.112,0.132,
0.153,0.175,0.198,0.221,0.245,0.269,0.293,0.317,
0.340,0.363,0.385,0.406,0.426,0.445,0.463,0.480,
0.495,0.509,0.521,0.531,0.539,0.545,0.549,0.551,
0.550,0.547,0.541,0.533,0.523,0.511,0.496,0.479,
0.459,0.437,0.413,0.386,0.358,0.327,0.295,0.260,
0.224,0.186,0.147,0.106,0.064,0.021,-0.023,-0.067,
-0.112,-0.158,-0.204,-0.250,-0.296,-0.342,-0.388,-0.433,
-0.478,-0.522,-0.565,-0.607,-0.647,-0.686,-0.723,-0.758,
-0.790,-0.820,-0.848,-0.873,-0.895,-0.915,-0.932,-0.946,
-0.958,-0.968,-0.976,-0.983,-0.989,-0.994,-0.998,-1.000,
-0.980,-0.930,-0.860,-0.780,-0.700,-0.620,-0.550,-0.490,
-0.430,-0.380,-0.335,-0.295,-0.260,-0.228,-0.200,-0.175,
-0.152,-0.132,-0.114,-0.098,-0.084,-0.071,-0.060,-0.050,
-0.041,-0.033,-0.026,-0.020,-0.015,-0.011,-0.008,-0.005,
-0.003,-0.002,-0.001,0.000
];

// Up to 9 oral/nasal formant resonators are supported. Only F1-F3 are
// obligatory for intelligible speech; F4-F9 default to A<n>=0 (silent),
// so callers that never touch them see identical behavior to before.
export const MAX_FORMANTS = 9;

// Up to 3 anti-formants (spectral notches / zero pairs). All default to
// AA<n>=0 (inactive). See NotchBiquad below for why these are a separate
// mechanism from "negative amplitude" on a regular formant.
export const MAX_ANTIFORMANTS = 3;

const formantParams = [];
for (let i = 1; i <= MAX_FORMANTS; i++) formantParams.push(`F${i}`, `BW${i}`, `A${i}`);

const antiformantParams = [];
for (let i = 1; i <= MAX_ANTIFORMANTS; i++) antiformantParams.push(`AF${i}`, `ABW${i}`, `AA${i}`);

export const PARAMS = [
  'F0', 'voicing',
  ...formantParams,
  'gain',
  'vibratoDepth',   // Hz peak deviation
  'vibratoRate',    // Hz LFO rate
  'tremoloDepth',   // 0..1 amplitude modulation depth
  'tremoloRate',    // Hz tremolo LFO rate
  'aspiration',     // 0..1 noise mixed into voiced source (breathiness)
  'tilt',           // -0.95..0.95 spectral tilt (positive = brighter)
  'effort',         // 0..1 glottal pulse shape (0=lax, 1=tense)
  ...antiformantParams,
];

export const DEFAULT = {
  F0: 120, voicing: 0,
  F1: 500,  BW1: 80,  A1: 0,
  F2: 1500, BW2: 120, A2: 0,
  F3: 2500, BW3: 160, A3: 0,
  // F4-F9: optional. Resting frequencies are just plausible higher-formant
  // spacing; they're inaudible until a caller sets A4..A9 above 0.
  F4: 3300, BW4: 200, A4: 0,
  F5: 3750, BW5: 200, A5: 0,
  F6: 4900, BW6: 250, A6: 0,
  F7: 6000, BW7: 300, A7: 0,
  F8: 7200, BW8: 350, A8: 0,
  F9: 8500, BW9: 400, A9: 0,
  gain: 3.5,
  vibratoDepth: 0,
  vibratoRate: 5,
  tremoloDepth: 0,
  tremoloRate: 5,
  aspiration: 0,
  tilt: 0,
  effort: 0.5,
  // Anti-formants. AA<n> is a 0..1 *depth* control (not a signed
  // amplitude): 0 = no effect, 1 = the notch frequency is fully carved out.
  AF1: 1000, ABW1: 100, AA1: 0,
  AF2: 2000, ABW2: 150, AA2: 0,
  AF3: 3000, ABW3: 200, AA3: 0,
};

// A true anti-formant is a pair of complex-conjugate ZEROS placed near the
// unit circle, which drives the spectrum toward zero at that frequency (a
// notch). That's a different filter topology from a formant resonator
// (which is all-POLE). Flipping the sign of a regular formant's amplitude
// does NOT produce this: it just multiplies the resonator's output by -1,
// i.e. inverts its phase. That inverted output is still a peak in |H(f)|
// centered at F<n> -- summed with everything else, phase inversion can
// cause cancellation at OTHER frequencies/moments depending on what's
// mixed with it, but it never creates a dip in the spectrum at F<n> itself,
// which is what a real anti-formant (e.g. the nasal zero in Klatt-style
// synthesis) needs to do. Hence NotchBiquad below, applied as a proper
// band-reject stage rather than folded into the resonator sum.
class NotchBiquad {
  constructor() {
    this.x1 = 0; this.x2 = 0;
    this.y1 = 0; this.y2 = 0;
    this.b0 = 1; this.b1 = 0; this.b2 = 1;
    this.a1 = 0; this.a2 = 0;
    this.lastF = -1; this.lastBW = -1;
  }
  setFreq(f, bw, sr) {
    if (f === this.lastF && bw === this.lastBW) return;
    this.lastF = f; this.lastBW = bw;
    f = Math.max(40, Math.min(sr * 0.45, f));
    bw = Math.max(20, bw);
    const w0 = 2 * Math.PI * f / sr;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const Q = f / bw;
    const alpha = sinw0 / (2 * Q);
    const a0 = 1 + alpha;
    this.b0 =  1 / a0;
    this.b1 = -2 * cosw0 / a0;
    this.b2 =  1 / a0;
    this.a1 = -2 * cosw0 / a0;
    this.a2 = (1 - alpha) / a0;
  }
  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2
            - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x;
    this.y2 = this.y1; this.y1 = y;
    return y;
  }
  reset() {
    this.x1 = 0; this.x2 = 0;
    this.y1 = 0; this.y2 = 0;
  }
}

export class FormantSynth {
  constructor({ sampleRate, initialTarget, schedule } = {}) {
    if (!sampleRate || sampleRate <= 0) {
      throw new Error('FormantSynth requires a positive sampleRate');
    }
    this.sr = sampleRate;
    const init = initialTarget ?? {};
    this.current = { ...DEFAULT, ...init };
    this.target = { ...this.current };
    this.increment = {};
    for (const k of PARAMS) this.increment[k] = 0;
    this.transitionSamples = 0;
    this.glottalPhase = 0;
    this.lfsr = 0xACE1ACE1 | 0;
    this.vibratoPhase = 0;
    this.tremoloPhase = 0;
    this.tiltPrev = 0;
    this.bp = Array.from({ length: MAX_FORMANTS }, () => new BandpassBiquad());
    this.notch = Array.from({ length: MAX_ANTIFORMANTS }, () => new NotchBiquad());

    this.schedule = (schedule ?? []).map(e => ({
      atSample: Math.floor((e.atMs ?? 0) * this.sr / 1000),
      target: e.target,
      transitionSamples: Math.max(1, Math.floor((e.transitionMs ?? 30) * this.sr / 1000)),
    }));
    this.scheduleIdx = 0;
    this.sampleCounter = 0;
  }

  // Schedule a new target. transitionMs samples are linearly interpolated
  // from current state to the new target
  setTarget(target, transitionMs = 30) {
    const N = Math.max(1, Math.floor(transitionMs * this.sr / 1000));
    this.transitionSamples = N;
    for (const k of PARAMS) {
      if (k in target) this.target[k] = target[k];
      this.increment[k] = (this.target[k] - this.current[k]) / N;
    }
  }

  queueSchedule(events) {
    this.schedule = events.map(e => ({
      atSample: Math.floor((e.atMs ?? 0) * this.sr / 1000),
      target: e.target,
      transitionSamples: Math.max(1, Math.floor((e.transitionMs ?? 30) * this.sr / 1000)),
    }));
    this.scheduleIdx = 0;
    this.sampleCounter = 0;
  }

  reset(initialTarget) {
    this.glottalPhase = 0;
    this.vibratoPhase = 0;
    this.tremoloPhase = 0;
    this.lfsr = 0xACE1ACE1 | 0;
    this.tiltPrev = 0;
    for (const bp of this.bp) bp.reset();
    for (const nf of this.notch) nf.reset();
    const init = initialTarget ?? {};
    this.current = { ...DEFAULT, ...init };
    this.target = { ...this.current };
    for (const k of PARAMS) this.increment[k] = 0;
    this.transitionSamples = 0;
    this.schedule = [];
    this.scheduleIdx = 0;
    this.sampleCounter = 0;
  }

  // Render `out.length` samples into the given Float32Array
  process(out) {
    const cur = this.current;
    for (let i = 0; i < out.length; i++) {
      // Drain any baked-in schedule events whose time has arrived
      while (this.scheduleIdx < this.schedule.length
          && this.schedule[this.scheduleIdx].atSample <= this.sampleCounter) {
        const evt = this.schedule[this.scheduleIdx++];
        const N = evt.transitionSamples;
        this.transitionSamples = N;
        for (const k of PARAMS) {
          if (k in evt.target) this.target[k] = evt.target[k];
          this.increment[k] = (this.target[k] - this.current[k]) / N;
        }
      }
      this.sampleCounter++;

      if (this.transitionSamples > 0) {
        for (const k of PARAMS) cur[k] += this.increment[k];
        this.transitionSamples--;
        if (this.transitionSamples === 0) {
          for (const k of PARAMS) cur[k] = this.target[k];
        }
      }

      // Vibrato LFO modulates F0 around its target value
      this.vibratoPhase += 2 * Math.PI * cur.vibratoRate / this.sr;
      this.vibratoPhase -= 2 * Math.PI * Math.floor(this.vibratoPhase / (2 * Math.PI));
      const effF0 = cur.F0 + cur.vibratoDepth * Math.sin(this.vibratoPhase);

      // Tremolo LFO modulates output amplitude
      this.tremoloPhase += 2 * Math.PI * cur.tremoloRate / this.sr;
      this.tremoloPhase -= 2 * Math.PI * Math.floor(this.tremoloPhase / (2 * Math.PI));
      const tremoloMod = 1 - cur.tremoloDepth * (0.5 + 0.5 * Math.sin(this.tremoloPhase));

      const v = cur.voicing < 0 ? 0 : cur.voicing > 1 ? 1 : cur.voicing;
      this.lfsr = xorshift(this.lfsr);
      const noiseSample = this.lfsr / 2147483648;

      const pulseVal = glottalTable[(this.glottalPhase * glottalTable.length) | 0];

      const voicedGain = 1 - cur.aspiration * 0.85;
      const exc = v * pulseVal * voicedGain
                + (1 - v) * noiseSample * 0.35
                + cur.aspiration * noiseSample * 0.5;
      this.glottalPhase += effF0 / this.sr;
      this.glottalPhase -= Math.floor(this.glottalPhase);

      // Sum whichever formants are actually in use. F1-F3 are the only
      // ones DEFAULT gives nonzero amplitude to; F4-F9 (amplitude 0 by
      // default) are skipped entirely unless a caller opts in, so the
      // common 3-formant case costs the same as before.
      let y = 0;
      for (let n = 1; n <= MAX_FORMANTS; n++) {
        const amp = cur[`A${n}`];
        if (amp !== 0) {
          const bp = this.bp[n - 1];
          bp.setFreq(cur[`F${n}`], cur[`BW${n}`], this.sr);
          y += bp.process(exc) * amp;
        }
      }
      y *= cur.gain * tremoloMod;

      // Anti-formants: real spectral notches, applied in series after the
      // formant sum. AA<n> blends between the dry signal (0) and the fully
      // notched signal (1).
      for (let n = 1; n <= MAX_ANTIFORMANTS; n++) {
        const depth = cur[`AA${n}`];
        if (depth !== 0) {
          const nf = this.notch[n - 1];
          nf.setFreq(cur[`AF${n}`], cur[`ABW${n}`], this.sr);
          const notched = nf.process(y);
          y += depth * (notched - y);
        }
      }

      const tilted = y - cur.tilt * this.tiltPrev;
      this.tiltPrev = y;

      out[i] = softClip(tilted);
    }
  }
}

// Convenience: render a complete utterance offline
export function renderToBuffer({ sampleRate = 48000, schedule, totalMs, initialTarget } = {}) {
  if (totalMs == null) {
    if (!schedule || !schedule.length) throw new Error('renderToBuffer needs totalMs or a non-empty schedule');
    totalMs = schedule[schedule.length - 1].atMs + 200;
  }
  const samples = Math.ceil(totalMs * sampleRate / 1000);
  const buf = new Float32Array(samples);
  const synth = new FormantSynth({ sampleRate, initialTarget, schedule });
  synth.process(buf);
  return buf;
}
