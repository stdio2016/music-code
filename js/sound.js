var actx = new (window.AudioContext || window.webkitAudioContext)();

// copied form mus.html: reverb
var support = {audioContext: true, onended: false, stopTwice: true, isChrome: true, isSafari: false};
if (!/AppleWebKit\/537\.36/.test(navigator.userAgent)) support.isChrome = false;
if (/AppleWebKit/.test(navigator.userAgent) && !support.isChrome) support.isSafari = true;
if(window.AudioContext) ;
else{
  support.audioContext = false;
}
var master = actx.createGain();
var masterGain = actx.createGain();
masterGain.gain.value = 0.3;
master.connect(masterGain);
// freeverb
var chromeProblem = 0;
var filterProblem = 'unknown';
if (support.isChrome || support.isSafari) chromeProblem = 128/actx.sampleRate;

function filterTest() {
  var b = actx.createBiquadFilter();
  var Fs = actx.sampleRate;
  b.type = 'lowpass';
  b.frequency.value = Fs * 0.25;
  b.Q.value = 20 * Math.log10(0.5);
  var aa = new Float32Array(1);
  var pp = new Float32Array(1);
  b.getFrequencyResponse(new Float32Array([Fs * 0.1]), aa, pp);
  if (Math.abs(aa[0] - 0.9045084) < 1e-5 && Math.abs(pp[0] - -0.6283185) < 1e-5) {
    filterProblem = 'ok';
  }
  if (Math.abs(aa[0] - 1.0508441) < 1e-5 && Math.abs(pp[0] - -0.3484485) < 1e-5) {
    filterProblem = 'no-negative-q';
  }
  if (Math.abs(aa[0] - 1.0556796) < 1e-5 && Math.abs(pp[0] - -0.3355522) < 1e-5) {
    filterProblem = 'old-formula';
  }
  support.filter = filterProblem;
}
filterTest();

function get_pole_for_allpass(x) {
  var xx = x * x;
  return (1 - xx) / (2*xx + 2);
}

function tune_to_b(b0, b1, b2) {
  var no = (b0 - b2) / 1.2;
  var lo_plus_hi = b0 + b2 - 2 * no;
  var lo = (lo_plus_hi + b1) * 0.5;
  var hi = (lo_plus_hi - b1) * 0.5;
  return [lo, hi, no];
}

function tune_to_a(Q) {
  if (Q <= 0) return [0.5, 0.5];
  var alpha = 1 / (2 * Q);
  var no = (1.2 + 2 * alpha) / (4 * alpha);
  var al = -(1.2 - 2 * alpha) / (4 * alpha);
  return [al * (1+alpha), no * (1+alpha)];
}

function makeFirstOrderFilter(ctx, b0, b1, a0, a1) {
  b0 /= a0;
  b1 /= a0;
  a1 /= a0;
  var Fs = ctx.sampleRate;
  var Q0 = Math.log10(filterProblem == 'old-formula' ? 25/24 : 1.2) * 20;

  var q = get_pole_for_allpass(a1);
  var w2 = tune_to_a(q);
  var w1 = tune_to_b(b0, b1 - a1*b0, -a1*b1);

  var biquad1 = ctx.createBiquadFilter();
  biquad1.type = 'lowpass';
  biquad1.frequency.value = Fs * 0.25;
  biquad1.Q.value = Q0;
  var g1 = ctx.createGain();
  g1.gain.value = w1[0];

  var biquad2 = ctx.createBiquadFilter();
  biquad2.type = 'highpass';
  biquad2.frequency.value = Fs * 0.25;
  biquad2.Q.value = Q0;
  var g2 = ctx.createGain();
  g2.gain.value = w1[1];

  var g0 = ctx.createGain();
  g0.gain.value = w1[2];

  var middle = ctx.createGain();
  middle.gain.value = w2[1];

  var biquad3 = ctx.createBiquadFilter();
  biquad3.type = 'allpass';
  biquad3.frequency.value = Fs * 0.25;
  biquad3.Q.value = q;
  var g3 = ctx.createGain();
  g3.gain.value = w2[0] / w2[1];

  var input = ctx.createGain();
  var output = ctx.createGain();
  input.connect(biquad1);
  input.connect(biquad2);
  input.connect(g0);
  biquad1.connect(g1);
  biquad2.connect(g2);
  g1.connect(middle);
  g2.connect(middle);
  g0.connect(middle);

  middle.connect(biquad3);
  middle.connect(output);
  biquad3.connect(g3);
  g3.connect(output);
  return {input: input, output: output};
}

function makeFirstOrderLowpassFilter(ctx, d) {
  var a = 1 - 1 / (2 * Math.PI * d / ctx.sampleRate + 1);
  return makeFirstOrderFilter(ctx, a, 0, 1, a-1);
}
function makeCombFilter(ctx, t, f, d) {
  var input = ctx.createDelay();
  input.delayTime.value = t - chromeProblem;
  var feed = ctx.createGain();
  feed.gain.value = f;
  var damp = makeFirstOrderLowpassFilter(ctx, d);
  input.connect(damp.input);
  damp.output.connect(feed);
  feed.connect(input);
  return {input: input, output: damp.output, feed: feed};
}
function makeAllpassComb(ctx, t, f) {
  var input = ctx.createGain();
  input.gain.value = 1;
  var delay = ctx.createDelay();
  delay.delayTime.value = t - chromeProblem;
  var feedback = ctx.createGain();
  feedback.gain.value = f;
  input.connect(feedback);
  feedback.connect(delay);
  delay.connect(input);
  var feed = ctx.createGain();
  feed.gain.value = -1;
  var delay2 = ctx.createDelay();
  delay2.delayTime.value = t;
  var feedforward = ctx.createGain();
  feedforward.gain.value = 1 + f;
  var out = ctx.createGain();
  input.connect(feed);
  feed.connect(out);

  input.connect(delay2);
  delay2.connect(feedforward);
  feedforward.connect(out);
  return {input: input, output: out, delay: delay};
}
var preDelay = actx.createDelay();
preDelay.delayTime.value = 0.15;
var preDelayFeedback = actx.createGain();
preDelayFeedback.gain.value = 0.4;
master.connect(preDelayFeedback);
preDelay.connect(preDelayFeedback);
preDelayFeedback.connect(preDelay);
var combChannel = actx.createChannelSplitter(2);

var delayT = [1557/44100, 1617/44100, 1491/44100, 1422/44100, 1277/44100, 1356/44100, 1188/44100, 1116/44100];
var filterFreq = [225, 556, 441, 341];
var allpassL = [], allpassR = [];
for (var i = 0; i < 4; i++) {
  allpassL[i] = makeAllpassComb(actx, filterFreq[i]/44100, 0.5);
  allpassR[i] = makeAllpassComb(actx, (filterFreq[i]-23)/44100, 0.5);
  if (i > 0) {
    allpassL[i-1].output.connect(allpassL[i].input);
    allpassR[i-1].output.connect(allpassR[i].input);
  }
}
combChannel.connect(allpassL[0].input, 0);
combChannel.connect(allpassR[0].input, 1);
for (var i = 0; i < 8; i++) {
  var a = makeCombFilter(actx, delayT[i], 0.7 + 0.28*0.8, 0.2*44100);
  preDelayFeedback.connect(a.input);
  a.output.connect(combChannel);
}
var merger = actx.createChannelMerger(2);
allpassL[3].output.connect(merger, 0, 0);
allpassR[3].output.connect(merger, 0, 1);
var revOut = actx.createGain();
revOut.gain.value = 0.03;
revOut.connect(masterGain);
merger.connect(revOut);
masterGain.connect(actx.destination);
// end of reverb

var stoppedSound = actx.createGain();
stoppedSound.gain.value = 1e-5;
stoppedSound.connect(actx.destination);

// for iOS only
var unlocked = false;
function unlock(){
  var buf = actx.createBuffer(1, 1, 22050);
  var ff = buf.getChannelData(0);
  ff[0] = 0.1;
  var src = actx.createBufferSource();

  src.buffer = buf;

  src.connect(master);
  if (src.start){
    src.start(0);
  }
  else{
    src.noteOn(0);
  }
  window.removeEventListener('touchend', unlock);
}
if(/iP[ao]d|iPhone/.test(navigator.userAgent)){
  window.addEventListener('touchend', unlock, false);
}

// provide instrument sounds
var soundBank = {};

function genFakePiano(){
  var len = 44100 * 2;
  var buff = actx.createBuffer(2, len + 44100 * 110 / 440, 44100);
  var dat = buff.getChannelData(0);
  var k = 440 / 44100 * Math.PI * 2;
  var s = [];
  var e = 1.2456;
  for(var n=0;n<40;n++){e = e * 2 % (Math.PI * 2); s.push(e);}
  for(var t = 0; t < len; t++){
    var sum = 0;
    for(var n = 1; n < 40; n++){
      sum += Math.sin(k * n * t + s[n]) / n * Math.exp(-(n - 1) * 0 - t*n/len);
    }
    dat[t] = sum * Math.exp(-t / (44100 * 0.5)) * 0.25;
  }
  for (var t = 0; t < 44100 * 110 / 440; t++){
    var sum = 0;
    for(var n = 1; n < 40; n++){
      sum += Math.sin(k * n * t + s[n]) * Math.exp(-(n - 1) * 0.25 - n);
    }
    dat[len + t] = sum * Math.exp(-len / (44100 * 0.5)) * 0.25;
  }
  buff.getChannelData(1).set(dat);
  return buff;
}

function loadSmp(where, instr, prop){
  var req = new XMLHttpRequest();

  req.open('GET', where, true);
  req.responseType = 'arraybuffer';

  req.onload = function(){
    var dat = req.response;
    actx.decodeAudioData(dat, function(buffer){
      prop.sample = buffer;
      soundBank[instr] = prop;
    }, function(){
      throw new Error('Cannot decode audio');
    });
  };
  req.send();
}

soundBank.fakePno = {sample: genFakePiano(), center: 69, loopStart: 2, loopEnd: 2.25};
window.fakePno = soundBank.fakePno;
