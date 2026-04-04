// ════════════════════════════════════════════════════════════════
//  AUDIO  (Web Audio API — gentle 8-bit blips)
// ════════════════════════════════════════════════════════════════
let _ac = null;
export function getAC() {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  if (_ac.state === 'suspended') _ac.resume();
  return _ac;
}
export function blip(freq, dur, type='square', vol=0.04) {
  try {
    const ac = getAC();
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.start(); o.stop(ac.currentTime + dur);
  } catch {}
}
export const sndSpawn  = () => { blip(880,.05,'square',.04); setTimeout(()=>blip(1320,.08,'square',.03),60); };
export const sndRemove = () => { blip(440,.05,'sawtooth',.03); setTimeout(()=>blip(220,.12,'sawtooth',.02),60); };
export const sndState  = () => blip(660,.04,'square',.02);
