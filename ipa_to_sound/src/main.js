// main.js – only speak() playback, no UI
import { compileString } from './engine/sequencer.js';
import { banks } from './engine/banks/index.js';
import { renderToBuffer } from './engine/synth-core.js';
import { encodeWav } from './engine/wav.js';

const DEFAULT_OPTS = {
  baseF0: 120,
  rate: 110,
  scale: 1,
  vibratoDepth: 0,
  vibratoRate: 5,
  tremoloDepth: 0,
  tremoloRate: 5,
  aspiration: 0,
  tilt: 0,
  effort: 0.5,
  bank: banks.defaultName,
  volume: 1.0,
  speed: 1,          // pacing multiplier (holds/gaps/pauses) -- see sequencer.js
  glideSpeed: 1,      // independent multiplier for transition/glide duration
  contour: 'flat',    // 'flat' | 'rise' | 'fall' | 'risefall' | 'fallrise' | 'alternate'
  contourRange: 30,   // Hz swing for the contour
  contourGroupWords: 2, // words per group, only used by 'alternate'
  stressMode: 'classic', // 'classic' | 'pitch' | 'duration' | 'effort' | 'all' | 'none'
  gain: 3.5,          // matches synth-core.js's own internal default
  localSpeed: 1,       // region-local speed multiplier (set via [localSpeed=N])
};

let ctx = null;
let node = null;
let gainNode = null;
let audioInit = null;

async function ensureAudio() {
  if (audioInit) return audioInit;
  audioInit = (async () => {
    ctx = new AudioContext();
    await ctx.audioWorklet.addModule('src/formant-worklet.js');
    node = new AudioWorkletNode(ctx, 'formant-processor', {
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    gainNode = ctx.createGain();
    gainNode.gain.value = 1.0;
    node.connect(gainNode);
    gainNode.connect(ctx.destination);
  })();
  return audioInit;
}

function mergeOpts(opts) {
  return { ...DEFAULT_OPTS, ...opts };
}

function compile(text, opts) {
  const {
    baseF0, rate, scale, vibratoDepth, vibratoRate, tremoloDepth, tremoloRate,
    aspiration, tilt, effort, bank,
    speed, glideSpeed, contour, contourRange, contourGroupWords, stressMode,
    gain, localSpeed,
  } = opts;
  return compileString(text, {
    baseF0,
    rate,
    scale,
    vibratoDepth,
    vibratoRate,
    tremoloDepth,
    tremoloRate,
    aspiration,
    tilt,
    effort,
    bank,
    speed,
    glideSpeed,
    contour,
    contourRange,
    contourGroupWords,
    stressMode,
    gain,
    localSpeed,
  });
}

/**
 * Speak the given phoneme string.
 * @param {string} text - e.g. "HH AE L OW"
 * @param {object} opts - optional synthesis parameters
 */
export async function speak(text, opts = {}) {
  const options = mergeOpts(opts);
  await ensureAudio();
  const { schedule, warnings } = compile(text, options);
  if (warnings.length) console.warn('Compile warnings:', warnings);
  node.port.postMessage({ type: 'reset' });
  node.port.postMessage({ type: 'schedule', schedule });
}

// Sample rate used when rendering to a downloadable file. Independent of
// whatever the real-time AudioContext ends up at (device-dependent) --
// renderToBuffer() runs entirely offline (no AudioContext involved), so
// this is a free choice; 44100 is the standard WAV default.
const RENDER_SAMPLE_RATE = 44100;

/**
 * Render the given phoneme string to a WAV file's bytes, without playing
 * it. Uses the same compile() pass as speak(), then synthesizes offline
 * via the engine's renderToBuffer() instead of the AudioWorklet.
 * @param {string} text - e.g. "HH AE L OW"
 * @param {object} opts - optional synthesis parameters (same as speak())
 * @returns {Promise<{ bytes: Uint8Array, sampleRate: number, warnings: string[] }>}
 */
export async function renderWav(text, opts = {}) {
  const options = mergeOpts(opts);
  const { schedule, warnings, totalMs } = compile(text, options);
  if (warnings.length) console.warn('Compile warnings:', warnings);
  const sampleRate = RENDER_SAMPLE_RATE;
  const buf = renderToBuffer({ sampleRate, schedule, totalMs });
  const { bytes } = encodeWav(buf, sampleRate, {
    metadata: { software: 'IPA player', comment: text },
  });
  return { bytes, sampleRate, warnings };
}

Object.assign(window, {
  speak,
  renderWav,
});