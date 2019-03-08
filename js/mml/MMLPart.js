// a music part
function MMLPart(partId) {
  if (!(this instanceof MMLPart))
    return new MMLPart(partId);
  this.id = partId || 0;
  this.notes = []; // array of MMLNotes
  // all of the following are used in MMLAssembler
  this.octave = 4; // current octave
  this.volume = 0.5; // current volume
  this.duration = 4; // current duration
  this.dots = 0; // current dot count of duration
  this.feel = 1; // how much to truncate notes
  this.transpose = 0; // current transpose in semitones
  this.pos = 0; // current position. Unit is whole notes
  this.tiedNotes = new Map(); // MIDI pitch number -> tied MMLNote
  this.tyingNotes = new Map(); // MIDI pitch number -> tying MMLNote
  this.chordMode = false; // next note is in the chord
  this.tieMode = false;
  this.savedOctave = 4;
}

MMLPart.prototype.toString = function () {
  if (this.notes.length == 0)
    return "[MMLPart !" + this.id + "]";
  return "[MMLPart !" + this.id + "\n  " + this.notes.join("\n  ") + "\n]";
};

MMLPart.prototype.toLegacy = function () {
  var str = "!" + this.id;
  var o = 4;
  for (var i = 0; i < this.notes.length; i++) {
    str += this.notes[i].toLegacy(o);
    if (this.notes[i].type == "note")
    o = Math.floor(this.notes[i].pitch / 12) - 1;
  }
  return str;
};
