function MMLPlayer(part) {
  this.notes = part.notes;
  this.playPos = 0;
  this.playTime = 0;
  this.startTime = 0;
  this.duration = part.pos;
  this.playId = 0;
  this.sounds = {};
  this.onended = null;
}

MMLPlayer.prototype.play = function () {
  if (this.playId) return ;
  this.startTime = actx.currentTime;
  this.playSmallSegment(4);
  this.playTimeout();
};

MMLPlayer.prototype.stop = function () {
  if (this.playId) {
    clearTimeout(this.playId);
    this.playId = 0;
    for (var i in this.sounds) {
      var e = this.sounds[i];
      try {
        e.src.stop();
      }
      catch (x) {
        e.src.disconnect();
        e.src.connect(stoppedSound);
      }
    }
    this.sounds = {};
    if (this.onended) this.onended();
  }
  this.playPos = 0;
};

MMLPlayer.prototype.playTimeout = function () {
  var me = this;
  if (me.playPos < me.notes.length) {
    me.playId = setTimeout(function () {
      me.playSmallSegment(actx.currentTime - me.startTime + 4);
      me.playTimeout();
    }, 2000);
  }
  else {
    me.playId = setTimeout(function () {
      me.playId = 0;
      me.playPos = 0;
      if (me.onended) me.onended();
    }, (me.startTime + me.duration - actx.currentTime) * 1000);
  }
};

MMLPlayer.prototype.playSmallSegment = function (to) {
  var notes = this.notes;
  for (var i = this.playPos; i < notes.length; i++) {
    var n = notes[i];
    if (n.startTime > to) break;
    if (n.tieBefore || n.type === "rest") continue;
    this.playSound(n, i);
  }
  this.playPos = i;
  this.playTime = to;
};

MMLPlayer.prototype.playSound = function (note, id) {
  var src = actx.createBufferSource();
  var env = actx.createGain();
  src.buffer = fakePno.sample;
  src.loop = true;
  src.loopStart = fakePno.loopStart;
  src.loopEnd = fakePno.loopEnd;
  src.playbackRate.value = Math.pow(2, (note.pitch - fakePno.center) / 12);
  src.connect(env);
  
  env.connect(master);
  var startTime = this.startTime + note.startTime;
  var nn = note;
  while (nn.tieAfter) {
    nn = nn.tieAfter;
  }
  var endTime = this.startTime + nn.endTime;
  
  var vol = note.volume * note.volume;
  env.gain.value = vol;
  env.gain.linearRampToValueAtTime(vol, Math.max(endTime - 0.05, (startTime + endTime) / 2));
  env.gain.linearRampToValueAtTime(0, endTime);
  
  if(src.start)
    src.start(startTime);
  else
    src.noteOn(startTime);
  var sounds = this.sounds;
  src.onended = function () {
    delete sounds[id];
  };
  
  if (src.stop)
    src.stop(endTime);
  else
    src.noteOff(endTime);
  this.sounds[id] = {src: src, env: env};
};
