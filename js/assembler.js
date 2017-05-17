// This file requires MMLParser in parser.js

// an MML music note
function MMLNote(pitch, duration) {
  if (!(this instanceof MMLNote)) {
    return new MMLNote(pitch, duration);
  }
  if (pitch === "rest") {
    this.type = "rest"; // type of note, can be "note" or "rest"
    this.pitch = 0; // MIDI pitch number
  }
  else {
    this.type = "note";
    this.pitch = pitch;
  }
  this.tieBefore = null; // a MMLNote connecting to this note
  this.tieAfter = null; // a MMLNote this note connects to
  this.volume = 0.5; // volume of the note, from 0 to 1
  this.source = []; // <span> elements that contains the music code
  this.chord = false; // this note is part of a chord
  this.duration = duration;
  this.feel = 7/8; // how much to truncate this note, can be 3/4, 7/8 or 1
}

MMLNote.prototype.toString = function () {
  if (this.type == "rest") {
    return "[MMLNote P" + this.duration + "]";
  }
  else {
    var octave = Math.floor(this.pitch / 12) - 1;
    if (octave < 0) octave = "0<";
    var noteName = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"][this.pitch % 12];
    return "[MMLNote " + (this.chord ? "/" : "") +
      "O" + octave + " " + noteName + (this.duration || "") + "]";
  }
};

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
  this.feel = 7/8; // how much to truncate notes
  this.transpose = 0; // current transpose in semitones
}

MMLPart.prototype.toString = function () {
  if (this.notes.length == 0)
    return "[MMLPart !" + this.id + "]";
  return "[MMLPart !" + this.id + "\n  " + this.notes.join("\n  ") + "\n]";
};

// tempo mark
function MMLTempoMark(position, tempo) {
  if (!(this instanceof MMLTempoMark))
    return new MMLTempoMark(pos, tempo);
  this.position = position; // unit: whole notes
  this.bpm = tempo; // quarter notes per minute
}

MMLTempoMark.prototype.toString = function () {
  return "[MMLTempoMark T" + this.bpm + " at measure " + this.position + "]"
};

// Magic happens here!
function MMLAssembler(code) {
  if (!(this instanceof MMLAssembler))
    return new MMLAssembler(code);
  this.reader = new MMLReader(code);
  this.currentPart = new MMLPart(0);
  this.parts = new Map([[0, this.currentPart]]); // part id -> MMLPart
  this.tempos = []; // array of tempo marks
  this.outputHTML = []; // TODO: better HTML output
}

// private! convert MML code to MMLNotes
MMLAssembler.prototype.musicToNotes = function () {
  var pos = 0;
  while (!this.reader.atEnd()) {
    var instr = this.reader.next();
    var cls = "normal";
    switch (instr && instr.type) {
      case "note":
        break;
      case "noteN":
        break;
      case "rest":
        break;
      case "tie":
        break;
      case "octave":
        this.setOctave(instr.octave);
        cls = "octave";
        break;
      case "octaveChange":
        this.setOctave(this.currentPart.octave + instr.octave);
        cls = "octave";
        break;
      case "tempo":
        cls = "instruction";
        break;
      case "duration":
        cls = "instruction";
        break;
      case "volume":
        cls = "instruction";
        break;
      case "musicFeel":
        cls = "instruction";
        break;
      case "part":
        cls = "instruction";
        break;
      case "chord":
        cls = "instruction";
        break;
      case "key":
        cls = "instruction";
        break;
      default: cls = "syntax-error";
    }
    // TODO: better HTML output
    var startPos = this.reader.startPos;
    var spaces = this.reader.data.substr(pos, startPos - pos);
    // NOTE: instruction text can have comments in it
    var text = this.reader.data.substr(startPos, this.reader.pos - startPos);
    pos = this.reader.pos;
    if (spaces.length > 0)
      this.outputHTML.push("<span class='comment'>" + safeInnerHTML(spaces) + "</span>");
    this.outputHTML.push("<span class='" + cls + "'>" + safeInnerHTML(text) + "</span>");
  }
  codeOut.innerHTML = this.outputHTML.join("");
};

// private! set octave of current context
MMLAssembler.prototype.setOctave = function (octave) {
  if (octave > 9) octave = 9;
  else if (octave < -1) octave = -1;
  this.currentPart = octave;
};
