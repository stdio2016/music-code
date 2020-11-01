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
