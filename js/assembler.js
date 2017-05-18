// This file requires MMLParser in parser.js

// an MML music note
function MMLNote(pitch, duration, dots) {
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
  this.dots = dots; // dot count, can be either 0 or 1
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
      "O" + octave + " " + noteName + (this.duration || "") + (this.dots ? "." : "") + "]";
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
  this.dots = 0; // current dot count of duration
  this.feel = 7/8; // how much to truncate notes
  this.transpose = 0; // current transpose in semitones
  this.pos = 0; // current position. Unit is whole notes
  this.tiedNotes = new Map(); // MIDI pitch number -> tied MMLNote
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
  this.position = position; // position. Unit is whole notes
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
  this.chordMode = false; // next note is in the chord
  this.key = 0; // C major
  this.outputHTML = document.createDocumentFragment(); // TODO: better HTML output
}

// private! convert MML code to MMLNotes
MMLAssembler.prototype.musicToNotes = function () {
  var pos = 0;
  while (!this.reader.atEnd()) {
    var instr = this.reader.next();
    var cls = "instruction";
    switch (instr && instr.type) {
      case "note":
        cls = "note";
        this.addNote(this.getPitch(instr.pitch, instr.alter), instr.duration, instr.dots, instr.tied);
        break;
      case "noteN":
        cls = "note";
        this.addNote(instr.pitch, null, instr.dots, instr.tied);
        break;
      case "rest":
        cls = "note";
        this.addNote("rest", instr.duration, instr.dots, false);
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
        break;
      case "duration":
        break;
      case "volume":
        break;
      case "musicFeel":
        break;
      case "part":
        break;
      case "chord":
        this.chordMode = true;
        break;
      case "key":
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
      this.createSpan(spaces, "comment");
    this.createSpanForInstr(text, cls);
  }
  codeOut.innerHTML = "";
  codeOut.appendChild(this.outputHTML);
};

// private! set octave of current context
MMLAssembler.prototype.setOctave = function (octave) {
  if (octave > 9) octave = 9;
  else if (octave < -1) octave = -1;
  this.currentPart.octave = octave;
};

// private! get MIDI pitch
MMLAssembler.prototype.getPitch = function (pitch, alter) {
  var ptc = pitch.charCodeAt(0) - 65/* ascii code of 'A' */;
  var keyTable = [
    //       pitch
    //A  B  C  D  E  F  G     key
    [ 0, 0, 0, 0, 0, 0, 0], // C
    [ 0, 0,+1, 0, 0,+1, 0], // D
    [ 0, 0,+1,+1, 0,+1,+1], // E
    [ 0,-1, 0, 0, 0, 0, 0], // F
    [ 0, 0, 0, 0, 0,+1, 0], // G
    [ 0, 0,+1, 0, 0,+1,+1], // A
    [+1, 0,+1,+1, 0,+1,+1]  // B
  ];
  var keyPitch = [9, 11, 0, 2, 4, 5, 7];
  var alt = alter;
  if (alter === null) alt = keyTable[this.key][ptc];
  return (this.currentPart.octave + 1) * 12 + keyPitch[ptc] + alt;
};

// private! add a note to current part
MMLAssembler.prototype.addNote = function (pitch, duration, dots, tied) {
  var part = this.currentPart;
  if (dots === null) {
    if (duration === null) {
      dots = part.dots;
    }
    else {
      dots = 0;
    }
  }
  if (duration === null) {
    duration = part.duration;
  }
  if (pitch !== "rest") pitch += this.currentPart.transpose;
  var note = new MMLNote(pitch, duration, dots);
  // TODO: tie note
  note.volume = part.volume;
  note.chord = this.chordMode;
  note.feel = part.feel;
  part.notes.push(note);
  if (!this.chordMode) { // advance the position
    part.pos += 0.25 / duration;
  }
  this.chordMode = false;
  return note;
};

// private! create a <span> element
MMLAssembler.prototype.createSpan = function (comments, cls) {
  var span = document.createElement("span");
  span.className = cls;
  span.textContent = comments;
  this.outputHTML.appendChild(span);
  return span;
};

// private! create a <span> element for instruction
MMLAssembler.prototype.createSpanForInstr = function (text, cls) {
  var instrs = text.split(/((?:\s|;.*\n)+)/);
  var spans = [];
  for (var i = 0; i < instrs.length; i++) {
    var inside;
    if (i%2 == 0) { // instruction
      inside = this.createSpan(instrs[i], cls);
      spans.push(inside);
    }
    else { // comment
      inside = this.createSpan(instrs[i], "comment");
    }
  }
  return spans;
};
