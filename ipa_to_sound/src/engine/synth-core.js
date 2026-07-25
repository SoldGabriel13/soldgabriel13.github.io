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

const scale = 20;

const voice1 =  [
  scale*0.016667422258863668,
  scale*0.012054081726210744,
  scale*0.004925469733762762,
  scale*0.005131471928362794,
  scale*0.006812277355977063,
  scale*0.007823672142189347,
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
  scale*0.0010070975839612652,
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
const voice2 = [-0.9372, -0.9702, -1.0, -0.9967, -0.9754, -0.9713, -0.9841, -0.9934, -0.9684, -0.9426, -0.9437, -0.9468, -0.9307, -0.8848, -0.8502, -0.8266, -0.8033, -0.7757, -0.7582, -0.7412, -0.7022, -0.6698, -0.6632, -0.6657, -0.6705, -0.6437, -0.6238, -0.6131, -0.5941, -0.5711, -0.525, -0.4599, -0.4047, -0.3564, -0.302, -0.2163, -0.1311, -0.0384, 0.0678, 0.169, 0.2286, 0.276, 0.3426, 0.4421, 0.5367, 0.5524, 0.5615, 0.5627, 0.554, 0.5453, 0.5277, 0.4852, 0.4484, 0.4329, 0.3977, 0.375, 0.3476, 0.3293, 0.321, 0.3142, 0.2991, 0.3086, 0.2992, 0.276, 0.2501, 0.2429, 0.22, 0.1893, 0.1593, 0.1423, 0.1267, 0.1153, 0.0938, 0.063, 0.0309, 0.0069, -0.0338, -0.06, -0.0828, -0.1018, -0.1176, -0.1282, -0.131, -0.1211, -0.1167, -0.1225, -0.1177, -0.1069, -0.0876, -0.0667, -0.0656, -0.0571, -0.053, -0.0532, -0.038, -0.0209, -0.0098, -0.0019, 0.0179, 0.0334, 0.0556, 0.0699, 0.0987, 0.1248, 0.1626, 0.1952, 0.2278, 0.2571, 0.3047, 0.3448, 0.3911, 0.4383, 0.4708, 0.5079, 0.5351, 0.5532, 0.5747, 0.6013, 0.6168, 0.6391, 0.6435, 0.6625, 0.6899, 0.7111, 0.7238, 0.7359, 0.7423, 0.7545, 0.7639, 0.7737, 0.7709, 0.7694, 0.7608, 0.75, 0.7501, 0.741, 0.7202, 0.7009, 0.6702, 0.6518, 0.618, 0.5917, 0.5615, 0.5253, 0.4895, 0.4554, 0.4191, 0.3959, 0.3673, 0.3449, 0.3213, 0.2995, 0.2763, 0.2534, 0.2241, 0.1954, 0.1643, 0.1376, 0.1074, 0.0767, 0.046, 0.0123, -0.0193, -0.051, -0.0794, -0.1013, -0.1335, -0.1611, -0.1748, -0.1976, -0.2099, -0.2202, -0.2308, -0.2247, -0.221, -0.2117, -0.1997, -0.1865, -0.1735, -0.1673, -0.1501, -0.1435, -0.1249, -0.1179, -0.1062, -0.0998, -0.084, -0.0701, -0.0536, -0.0372, -0.0168, 0.0046, 0.0226, 0.0423, 0.0672, 0.0923, 0.1187, 0.1463, 0.1729, 0.2008, 0.2221, 0.2524, 0.2714, 0.2927, 0.3079, 0.3183, 0.3295, 0.3328, 0.3432, 0.3356, 0.3405, 0.3361, 0.3346, 0.3399, 0.3328, 0.3346, 0.3213, 0.3246, 0.3084, 0.3061, 0.2959, 0.2847, 0.2749, 0.2613, 0.2495, 0.239, 0.2224, 0.2129, 0.1998, 0.1936, 0.1805, 0.1529, 0.1387, 0.1272, 0.1293, 0.143, 0.1504, 0.1509, 0.1649, 0.1718, 0.1784, 0.1654, 0.1537, 0.1336, 0.1136, 0.1048, 0.089, 0.0801, 0.0624, 0.052, 0.0446, 0.0336, 0.0281, 0.0286, 0.0177, 0.0221, 0.0183, 0.0312, 0.0347, 0.0347, 0.0454, 0.048, 0.0528, 0.0515, 0.0605, 0.0655, 0.0756, 0.089, 0.0907, 0.1001, 0.1075, 0.1081, 0.1114, 0.118, 0.1371, 0.1453, 0.1568, 0.1636, 0.1795, 0.1972, 0.2174, 0.2322, 0.2471, 0.2588, 0.2702, 0.2927, 0.3062, 0.3257, 0.331, 0.3419, 0.3528, 0.3597, 0.3725, 0.3644, 0.3728, 0.3726, 0.364, 0.356, 0.3416, 0.3393, 0.3294, 0.3291, 0.3283, 0.3289, 0.3319, 0.3203, 0.3118, 0.3031, 0.2998, 0.2831, 0.2687, 0.2507, 0.2441, 0.2288, 0.2135, 0.1953, 0.1734, 0.1582, 0.1335, 0.1132, 0.0924, 0.0665, 0.0442, 0.018, -0.0048, -0.0197, -0.0433, -0.068, -0.0897, -0.1067, -0.1221, -0.1441, -0.1657, -0.1792, -0.1951, -0.2084, -0.2189, -0.2306, -0.2497, -0.2654, -0.2806, -0.2964, -0.3127, -0.3188, -0.3259, -0.3306, -0.3256, -0.3345, -0.3442, -0.3588, -0.3555, -0.3614, -0.3488, -0.3414, -0.3445, -0.3483, -0.3544, -0.348, -0.3428, -0.345, -0.3373, -0.3418, -0.3546, -0.3662, -0.3713, -0.3679, -0.3833, -0.3844, -0.3809, -0.3841, -0.3778, -0.3894, -0.395, -0.3925, -0.3995, -0.3956, -0.3868, -0.3818, -0.3833, -0.3841, -0.3927, -0.4121, -0.4281, -0.4401, -0.4524, -0.4534, -0.4609, -0.4689, -0.4863, -0.52, -0.5414, -0.5475, -0.5625, -0.5905, -0.6105, -0.6185, -0.6476, -0.6731, -0.6987, -0.7013, -0.6884, -0.6775, -0.6989, -0.7199, -0.7321, -0.7547, -0.7623, -0.7763, -0.8261];

import { BandpassBiquad, glottalPulse, xorshift, softClip } from './dsp.js';

const voice = 1;


export const glottalTable = voice === 1 ? voice1 : voice === 2 ? voice2 : voice1;
console.log

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
    // Precomputed param-name lookups so the per-sample loop below never
    // builds a template-literal string (`A${n}` etc.). With up to 9 formants
    // + 3 antiformants that was up to ~36 throwaway strings PER SAMPLE --
    // harmless for a second of audio, but at 48kHz a long utterance turns
    // that into tens of millions of allocations, and the resulting GC churn
    // is what shows up as lag that gets worse the longer the audio runs.
    this.formantKeys = Array.from({ length: MAX_FORMANTS }, (_, i) => ({
      A: `A${i + 1}`, F: `F${i + 1}`, BW: `BW${i + 1}`,
    }));
    this.antiformantKeys = Array.from({ length: MAX_ANTIFORMANTS }, (_, i) => ({
      AA: `AA${i + 1}`, AF: `AF${i + 1}`, ABW: `ABW${i + 1}`,
    }));

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
      for (let n = 0; n < MAX_FORMANTS; n++) {
        const keys = this.formantKeys[n];
        const amp = cur[keys.A];
        if (amp !== 0) {
          const bp = this.bp[n];
          bp.setFreq(cur[keys.F], cur[keys.BW], this.sr);
          y += bp.process(exc) * amp;
        }
      }
      y *= cur.gain * tremoloMod;

      // Anti-formants: real spectral notches, applied in series after the
      // formant sum. AA<n> blends between the dry signal (0) and the fully
      // notched signal (1).
      for (let n = 0; n < MAX_ANTIFORMANTS; n++) {
        const keys = this.antiformantKeys[n];
        const depth = cur[keys.AA];
        if (depth !== 0) {
          const nf = this.notch[n];
          nf.setFreq(cur[keys.AF], cur[keys.ABW], this.sr);
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
