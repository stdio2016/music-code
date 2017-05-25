// TODO: rewrite Player class
function note(pitch,start){
  var src = actx.createBufferSource();
  var env = actx.createGain();
  src.buffer = fakePno.sample;
  src.loop = true;
  src.loopStart = fakePno.loopStart;
  src.loopEnd = fakePno.loopEnd;
  src.playbackRate.value = Math.pow(2, (pitch - 69) / 12);
  src.connect(env);
  env.connect(master);
  var startTime = currentTime + start;
  if(src.start)
    src.start(startTime);
  else {
    src.noteOn(startTime);
  }
  return {src: src, env: env};
}

function noteOff(state, end, onended) {
  var src = state.src, env = state.env;
  var endtime = currentTime + end;
  env.gain.setValueAtTime(1, endtime);
  env.gain.linearRampToValueAtTime(0, endtime + 0.05);
  if(src.stop)
    src.stop(endtime);
  else {
    src.noteOff(endTime);
  }
  src.onended = onended;
}

function play(){
  var C=60,D=62,E=64,F=65,G=67,A=69;
  var t = asm.assemble();
  currentTime = actx.currentTime;
  for (var i = 0; i < t.length; i++) {
    var p = t[i].notes;
    for (var j = 0; j < p.length; j++) {
      for (var k = 0; k < p[j].data.length; k++) {
        note(p[j].data[k].pitch, p[j].start, p[j].end);
      }
    }
  }
}

PlayerTrack.prototype.segmentLength = 3;
PlayerTrack.prototype.nextFire = 0;
PlayerTrack.prototype.raf = function (code) {
  var me = this;
  if (actx.currentTime >= this.nextFire + currentTime) {
    this.nextFire += this.segmentLength;
    code();
  }
  else {
    this.rafID = setTimeout(function () {
      me.raf(code);
    }, 100);
  }
};
PlayerTrack.prototype.caf = function (id) {
  clearTimeout(id);
};

PlayerTrack.prototype.play = function () {
  if (this.state != "stopped") {
    return alertBox('Oops!');
  }
  this.pos = 0;
  this.nextFire = this.segmentLength;
  this.state = "playing";
  currentTime = actx.currentTime;
  this.playLoop();
};

PlayerTrack.prototype.playLoop = function () {
  var me = this, p = me.notes;
  if (me.state !== "playing") return;
  for (var i = me.pos; i < p.length; i++) {
    if (p[i].start > this.nextFire + this.segmentLength) break;
    for (var j = 0; j < p[i].data.length; j++) {
      var state = note(p[i].data[j].pitch, p[i].start);
      me.playingNotes['n'+i+'_'+j] = state;
      noteOff(state, p[i].end, (function (k) {
        return function () {
          delete me.playingNotes[k];
          var playing = me.pos < p.length;
          for (var keys in me.playingNotes) {
            playing = true; break;
          }
          if (!playing) me.state = "stopped";
        };
      })('n' + i + "_" + j));
    }
  }
  me.pos = i;
  if (i < p.length) {
    me.raf(function() {
      me.playLoop();
    });
  }
};

PlayerTrack.prototype.stop = function () {
  if (this.rafID) {
    this.caf(this.rafID);
  }
  for (var n in this.playingNotes) {
    stopImmediate(this.playingNotes[n]);
  }
  this.playingNotes = {};
  this.state = "stopped";
};

function stopImmediate (state) {
  var src = state.src;
  src.onended = null;
  try {
    src.stop ? src.stop(0) : src.noteOff(0);
  }
  catch (x) {
    ;
  }
  state.env.disconnect();
  src.disconnect();
}
