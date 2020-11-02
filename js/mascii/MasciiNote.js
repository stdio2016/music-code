function MasciiNote(pitch, accidental) {
  this.pitch = pitch;
  this.accidental = accidental;
  this.chord = '';
  this.figures = [];
  this.bassOctave = null;
  this.bass = null;
  this.bassAccid = null;
  this.source = 0;
  this.beginEnd = '';
  this.beat = true;
  this.startTime = 0;
  this.duration = 0;
}

MasciiNote.prototype.accidToString = function (accid) {
  if (accid == 0) return '=';
  else if (accid > 0) return '+'.repeat(accid);
  else if (accid < 0) return '-'.repeat(accid);
  return '';
};

MasciiNote.prototype.toString = function () {
  var str = this.pitch;
  str += this.accidToString(this.accidental);
  str += this.chord;
  for (var i = 0; i < this.figures.length; i++) {
    var num = this.figures[i][0];
    str += num;
    str += this.accidToString(this.figures[i][1]);
  }
  if (this.bass) {
    str += '/' + this.bassOctave + this.bass;
    str += this.accidToString(this.bassAccid);
  }
  str += this.beginEnd;
  return str;
};

MasciiNote.prototype.isBeat = function () {
  return true;
};

MasciiNote.prototype.removeEmptyBeat = function () {
  
};

MasciiNote.prototype.propagateTiming = function (ctx, start, len) {
  this.startTime = start;
  this.duration = len;
};

MasciiNote.prototype.addEvents = function (ctx) {
  var pitch = '.';
  if (/[A-Ga-g]/.test(this.pitch)) {
    var ch = (this.pitch.charCodeAt(0) & 15) - 1;
    pitch = [9,11,0,2,4,5,7][ch];
    pitch += ctx.octave * 12;
    if (this.pitch >= 'a') pitch += 12;
    if (this.accidental != null) {
      pitch += this.accidental;
      ctx.accidTable[ch] = this.accidental;
    }
    else pitch += ctx.accidTable[ch];
  }
  ctx.addNote(this.source, this.startTime, this.duration, pitch);
};
