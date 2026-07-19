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
const scale = 10;
export const glottalTable = [
  scale*0.016667422258863668,
  scale*0.012054081726210744,
  scale*0.004925469733762762,
  scale*0.005131471928362794,
  scale*0.006812277355977063,
  scale*scale*0.007823672142189347,
  scale*0.002877152362118049,
  scale*0.004450434681380023,
  scale*0.0017551652114373864,
  scale*0.003311146385563624,
  scale*0.004924771000754892,
  scale*0.003721832443154455,
  scale*0.0031682062073417577,
  scale*0.008174779446977063,
  scale*0.005280643013185337,
  scale*0.003700389793977461,
  scale*0.005644980163775516,
  scale*0.0015482858568479703,
  scale*-0.00038672518474953396,
  scale*0.0021982785093439517,
  scale*scale*0.0010070975839612652,
  scale*0.0013882321027450812,
  scale*0.0011709121496602426,
  scale*0.0004983781740163415,
  scale*-0.0008687711347541268,
  scale*0.0009837817312501951,
  scale*0.001410624428290033,
  scale*0.0021429857793070083,
  scale*-0.00048300236884559524,
  scale*-0.0018419076680818924,
  scale*-0.002507494850502641,
  scale*-0.0030735841335453973,
  scale*-0.0006755031447197518,
  scale*-0.0015937327355275096,
  scale*-0.0032794207535667428,
  scale*-0.0031844761149404668,
  scale*-0.004440719110051768,
  scale*-0.007034408480331275,
  scale*-0.006037909375522904,
  scale*-0.005906815562663795,
  scale*-0.006661231581546536,
  scale*-0.005370086704547383,
  scale*-0.0046354076511162376,
  scale*-0.0038810495634270894,
  scale*-0.0036646615158311183,
  scale*-0.004920097892489788,
  scale*-0.00463858720446438,
  scale*-0.005353331923074954,
  scale*-0.004801512655441483,
  scale*-0.0037679460620651264,
  scale*-0.0032885362355186605,
  scale*-0.0018008828202291276,
  scale*0.0002293440822612452,
  scale*-0.0021376463039426015,
  scale*-0.0018403438948286024,
  scale*0.0004238124962762813,
  scale*-0.0005152896970838372,
  scale*-0.0015753110402218686,
  scale*-0.00048436710875086387,
  scale*-0.0008100426792588699,
  scale*-0.0031647744044121383,
  scale*-0.004054766348094675,
  scale*-0.0054132310275525125,
  scale*-0.004753216883084951,
  scale*-0.0039981673784413,
  scale*-0.001956723221420993,
  scale*-0.0053552015785023055,
  scale*-0.003527766331432506,
  scale*-0.003065312762433475,
  scale*-0.002916501875444541,
  scale*-0.002679506990801615,
  scale*-0.00046316438312653984,
  scale*-0.003134991332487734,
  scale*-0.003821613387509779,
  scale*-0.0047684815652542165,
  scale*-0.008080551468887044,
  scale*-0.00737186134809963,
  scale*-0.004726440450686504,
  scale*-0.0040062538431203665,
  scale*-0.0028395881363803546,
  scale*-0.003449466053141712,
  scale*-0.0012830848021258474, 
  scale*-0.0009403970530625117,
  scale*-0.000275912331976025,
  scale*0.00028159312768859463,
  scale*0.0022644709740921266,
  scale*0.006066699161396688,
  scale*0.008524721040368416,
  scale*0.007890578559555059,
  scale*0.005391272979214577,
  scale*0.011736812865627735,
  scale*0.01174074796187473,
  scale*0.015255566065480602,
  scale*0.014311034947835439
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
