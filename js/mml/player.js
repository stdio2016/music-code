function MmlPlayer(part) {
  this.track = part.notes;
  this.pos = 0;
  this.endpos = 0;
  this.offsetTime = 0.0;
  this.time = 0.0;
  this.rafId = 0;
  this.playing = new Map();
  this.stoppedNotes = [];
}

MmlPlayer.prototype.play = function () {
  this.offsetTime = actx.currentTime;
  this.playLoop();
};

MmlPlayer.prototype.playLoop = function () {
  var me = this;
  if (me.endpos >= this.track.length && this.stoppedNotes.length === 0) {
    return ;
  }
  while (this.stoppedNotes.length > 0) {
    var note = this.stoppedNotes[0];
    if (actx.currentTime > this.offsetTime + note.time) {
      this.stoppedNotes.shift();
    }
    else {
      break;
    }
  }
  if (actx.currentTime > this.offsetTime + this.time - 1.0) {
    me.nextSegment();
  }
  this.rafId = setTimeout(function () {
    me.playLoop();
  }, 100);
};

MmlPlayer.prototype.nextSegment = function () {
  var newTime = this.time + 2.0;
  var note;
  var totle = this.track.length;
  while (this.pos < totle && (note = this.track[this.pos]).startPos < newTime) {
    var bef = this.playing.get(note.tieBefore);
    if (bef) {
      bef.env.gain.setValueAtTime(note.volume, this.offsetTime + note.startPos);
      this.playing['delete'](note.tieBefore);
      this.playing.set(note, bef);
    }
    else {
      currentTime = this.offsetTime;
      var st = window.note(note.pitch, note.startPos);
      st.env.gain.setValueAtTime(note.volume, this.offsetTime + note.startPos);
      this.playing.set(note, st);
    }
    this.pos++;
  }
  while (this.endpos < totle && (note = this.track[this.endpos]).endPos < newTime) {
    if (!note.tieAfter) {
      var st = this.playing.get(note);
      this.playing['delete'](note);
      window.noteOff(st, note.endPos);
      this.stoppedNotes.push({time: note.endPos, state: st});
    }
    this.endpos++;
  }
  this.time = newTime;
};
