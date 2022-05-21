function MasciiPlayer() {
  this.notes = [];
  this.sorted = false;
  this.playPos = 0;
  this.playTime = 0;
  this.startTime = 0;
  this.duration = 0;
  this.playId = 0;
  this.sounds = {};
  this.onended = null;
  
  this.view = null;
  this.showPos = 0;
  this.showTime = 0;
  this.showId = 0;
  this.showingNotes = [];
  this.tempos = [];
  this.timeSigs = [];
}

MasciiPlayer.prototype.addPart = function (part) {
  var mydu = this.duration;
  var ctx = new MasciiContext();
  ctx.tempos = this.tempos;
  ctx.timeSigs = this.timeSigs;
  ctx.seq = this.notes,
  ctx.addNote = function (src, start, du, pitch) {
      this.seq.push({volume: 0.5, pitch: pitch, source: src, t0: start, t1: start + du});
      if (start + du > mydu) mydu = start + du;
  };
  part.addEvents(ctx);
  this.duration = mydu;
  this.sorted = false;
};

MasciiPlayer.prototype.fixTempo = function () {
  this.tempos.unshift({time: 0, bpm: 120});
  this.timeSigs.sort(function (a, b) {
    if (a.time < b.time) return -1;
    if (a.time > b.time) return 1;
    return 0;
  });
  this.tempos.sort(function (a, b) {
    if (a.time < b.time) return -1;
    if (a.time > b.time) return 1;
    return 0;
  });
  var i = 0, j = 0;
  var timeSig = 4/4;
  var bpm = 120;
  var sumTime = 0;
  var pastTime = 0;
  var tempo = [];
  while (j != this.timeSigs.length || i != this.tempos.length) {
    if (j == this.timeSigs.length || i != this.tempos.length && this.timeSigs[j].time > this.tempos[i].time) {
      var rate = timeSig * 4 * 60 / bpm;
      sumTime += rate * (this.tempos[i].time - pastTime);
      bpm = this.tempos[i].bpm;
      rate = timeSig * 4 * 60 / bpm;
      pastTime = this.tempos[i].time;
      tempo.push({position: pastTime, rate: rate, time: sumTime});
      i++;
    }
    else {
      var rate = timeSig * 4 * 60 / bpm;
      sumTime += rate * (this.timeSigs[j].time - pastTime);
      timeSig = this.timeSigs[j].numer / this.timeSigs[j].denom;
      rate = timeSig * 4 * 60 / bpm;
      pastTime = this.timeSigs[j].time;
      tempo.push({position: pastTime, rate: rate, time: sumTime});
      j++;
    }
  }
  console.log(tempo);
  var used = 0;
  var du = 0;
  this.notes.forEach(function (n) {
    while (used+1 < tempo.length && tempo[used+1].position < n.t0) {
      used++;
    }
    n.startTime = (n.t0 - tempo[used].position) * tempo[used].rate + tempo[used].time;
    var j = used;
    while (j+1 < tempo.length && tempo[j+1].position < n.t1) {
      j++;
    }
    n.endTime = (n.t1 - tempo[j].position) * tempo[j].rate + tempo[j].time;
    if (n.endTime > du) du = n.endTime;
  });
  this.duration = du;
};

MasciiPlayer.prototype.play = function () {
  if (!this.sorted) {
    this.sorted = true;
    this.notes.sort(function (a, b) {
      if (a.t0 < b.t0) return -1;
      if (a.t0 > b.t0) return 1;
      return 0;
    });
    this.fixTempo();
  }
  this.showTime = this.playTime;
  this.startTime = actx.currentTime - this.playTime;
  var i = 0;
  while (i < this.notes.length && this.notes[i].endTime <= this.playTime) {
    i++;
  }
  this.playPos = i;
  this.showPos = i;
  this.playSmallSegment(this.playTime + 4, true);
  this.playTimeout();
  this.showPlaying(this.showTime, true);
  this.showTimeout();
};

MasciiPlayer.prototype.stopSound = function () {
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
};

MasciiPlayer.prototype.stop = function () {
  if (this.playId) {
    this.stopSound();
    this.playTime = 0;
    if (this.onended) this.onended();
  }
  else {
    this.playTime = 0;
  }
  this.stopAnimation();
};

MasciiPlayer.prototype.pause = function () {
  if (this.playId) {
    this.stopSound();
    this.playTime = actx.currentTime - this.startTime;
    this.showTime = this.playTime;
  }
  cancelAnimationFrame(this.showId);
  this.showId = 0;
};

MasciiPlayer.prototype.playTimeout = function () {
  var me = this;
  if (me.playPos < me.notes.length) {
    me.playId = setTimeout(function () {
      me.playSmallSegment(actx.currentTime - me.startTime + 4, false);
      me.playTimeout();
    }, 2000);
  }
  else {
    me.playId = setTimeout(function () {
      me.playId = 0;
      me.playTime = 0;
      if (me.onended) me.onended();
    }, (me.startTime + me.duration - actx.currentTime) * 1000);
  }
};

MasciiPlayer.prototype.playSmallSegment = function (to, first) {
  var notes = this.notes;
  for (var i = this.playPos; i < notes.length; i++) {
    var n = notes[i];
    if (n.startTime > to) break;
    if (i > this.playPos && !n.chord) first = false;
    if (!first && n.tieBefore) continue;
    //if (n.type === "rest") continue;
    this.playSound(n, i);
  }
  this.playPos = i;
  this.playTime = to;
};

MasciiPlayer.prototype.playSound = function (note, id) {
  if (note.pitch == '.') return;
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
  
  var vol = note.volume;
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

MasciiPlayer.prototype.stopAnimation = function () {
  cancelAnimationFrame(this.showId);
  this.showId = 0;
  for (var i = 0; i < this.showingNotes.length; i++) {
    this.hideNote(this.showingNotes[i]);
  }
  this.showingNotes.length = 0;
};

MasciiPlayer.prototype.showTimeout = function () {
  var me = this;
  if (me.showPos < me.notes.length || me.showingNotes.length > 0) {
    me.showId = requestAnimationFrame(function () {
      me.showPlaying(actx.currentTime - me.startTime, false);
      me.showTimeout();
    });
  }
};

MasciiPlayer.prototype.showPlaying = function (to, first) {
  var notes = this.showingNotes;
  for (var i = 0; i < notes.length; i++) {
    if (notes[i].endTime <= to) {
      this.hideNote(notes[i]);
      notes[i] = null;
    }
  }
  var j = 0;
  for (var i = 0; i < notes.length; i++) {
    if (notes[i] !== null) {
      notes[j] = notes[i];
      j++;
    }
  }
  notes.length = j;
  var notes = this.notes;
  for (var i = this.showPos; i < notes.length; i++) {
    var n = notes[i];
    if (n.startTime > to) break;
    if (i > this.showPos && !n.chord) first = false;
    if (!first && n.tieBefore) continue;
    //if (n.type === "rest") continue;
    this.showNote(n, i);
  }
  this.showPos = i;
  this.showTime = to;
};

MasciiPlayer.prototype.showNote = function (n, i) {
  while (n.tieAfter) {
    this.view.notes[n.source].span.classList.add('playing');
    n = n.tieAfter;
  }
  this.showingNotes.push(n);
  this.view.notes[n.source].span.classList.add('playing');
};

MasciiPlayer.prototype.hideNote = function (n) {
  while (n.tieBefore) {
    this.view.notes[n.source].span.classList.remove('playing');
    n = n.tieBefore;
  }
  this.view.notes[n.source].span.classList.remove('playing');
};


/** 
 * XXX: Copied from MMLPlayer
 */
MasciiPlayer.prototype.seek = function (nsec) {
  var playing = this.playId;
  // stop current playing notes
  this.pause();
  this.stopAnimation();

  // jump to new location
  this.playTime = nsec;
  this.showTime = this.playTime;

  this.playPos = 0;
  this.showPos = 0;
  if (playing) {
    // continue playing
    this.play();
  }
};

MasciiPlayer.prototype.getCurrentPos = function () {
  if (this.playId) {
    return actx.currentTime - this.startTime;
  }
  else {
    return this.playTime;
  }
};
