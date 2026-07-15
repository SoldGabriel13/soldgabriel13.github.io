// main.js – only speak() playback, no UI
import { compileString } from './engine/sequencer.js';
import { banks } from './engine/banks/index.js';

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
  const { baseF0, rate, scale, vibratoDepth, vibratoRate, tremoloDepth, tremoloRate, aspiration, tilt, effort, bank } = opts;
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

Object.assign(window, {
  speak
});