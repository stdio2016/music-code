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
      (this.tieBefore ? "~" : "") + "V" + Math.round(this.volume * 127) +
      " O" + octave + " " + noteName + (this.duration || "") + (this.dots ? "." : "") +
      (this.tieAfter ? "~" : "") + "]";
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
  this.tyingNotes = new Map(); // MIDI pitch number -> tying MMLNote
  this.lastTiedPos = -1; // last "&" instruction tied note position
  this.retainVolume = false; // last command is "V" without number
  this.chordMode = false; // next note is in the chord
}

MMLPart.prototype.toString = function () {
  if (this.notes.length == 0)
    return "[MMLPart !" + this.id + "]";
  return "[MMLPart !" + this.id + "\n  " + this.notes.join("\n  ") + "\n]";
};

// tempo mark
function MMLTempoMark(position, tempo) {
  if (!(this instanceof MMLTempoMark))
    return new MMLTempoMark(position, tempo);
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
  this.key = [0, 0]; // C major, [CDEFGAB, sharp or flat]
  this.outputHTML = document.createDocumentFragment(); // TODO: better HTML output
}

// private! convert MML code to MMLNotes
MMLAssembler.prototype.musicToNotes = function () {
  var pos = 0;
  while (!this.reader.atEnd()) {
    var instr = this.reader.next();
    var cls = "instruction", note = null;
    switch (instr && instr.type) {
      case "note":
        cls = "note";
        note = this.addNote(this.getPitch(instr.pitch, instr.alter), instr.duration, instr.dots, instr.tied);
        break;
      case "noteN":
        cls = "note";
        note = this.addNote(instr.pitch, null, instr.dots, instr.tied);
        break;
      case "rest":
        cls = "note";
        note = this.addNote("rest", instr.duration, instr.dots, false);
        break;
      case "tie":
        this.addTie();
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
        this.tempos.push(new MMLTempoMark(this.currentPart.pos, instr.bpm));
        break;
      case "duration":
        this.currentPart.duration = instr.duration;
        break;
      case "volume":
        if (instr.volume === null)
          this.currentPart.retainVolume = true;
        else
          this.currentPart.volume = instr.volume;
        break;
      case "musicFeel":
        this.currentPart.feel = instr.feel;
        break;
      case "part":
        this.switchPart(instr.part);
        break;
      case "chord":
        this.currentPart.chordMode = true;
        break;
      case "key":
        this.setKey(instr.key, instr.alter);
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
    var source = this.createSpanForInstr(text, cls);
    if (note !== null) note.source = source;
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
  if (alter === null) alt = keyTable[this.key[0]][ptc] + this.key[1];
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
  if (!part.chordMode) { // advance the position
    part.tiedNotes = part.tyingNotes;
    part.tyingNotes = new Map();
    part.pos += 1 / duration;
  }
  if (part.tiedNotes.has(pitch)) { // tied to previous note
    var tiedNote = part.tiedNotes.get(pitch);
    part.tiedNotes.delete(pitch);
    note.tieBefore = tiedNote;
    tiedNote.tieAfter = note;
  }
  if (tied) { // tied to next note
    part.tyingNotes.set(pitch, note);
  }
  if (part.retainVolume && note.tieBefore !== null) {
    note.volume = note.tieBefore.volume;
    part.retainVolume = false;
  }
  else
    note.volume = part.volume;
  note.chord = part.chordMode;
  note.feel = part.feel;
  part.notes.push(note);
  part.chordMode = false;
  return note;
};

// private! add tie to the current note/chord
MMLAssembler.prototype.addTie = function () {
  var part = this.currentPart;
  var i = part.notes.length;
  do {
    --i;
    if (i > part.lastTiedPos) {
      part.tyingNotes.set(part.notes[i].pitch, part.notes[i]);
    }
    else break;
  } while (part.notes[i].chord);
  part.lastTiedPos = part.notes.length - 1;
};

MMLAssembler.prototype.setKey = function (key, alter) {
  if (key === null) { // "K+" or "K--" or simply "K"
    this.currentPart.transpose += alter || 0;
  }
  else { // "KA" means A major, "KE-" means Eb major, and so on
    var k = "CDEFGAB".indexOf(key);
    this.key = [k , alter || 0];
  }
};

MMLAssembler.prototype.switchPart = function (part) {
  if (part === "next") part = this.currentPart.id + 1;
  var p = this.parts.get(part);
  if (!this.parts.has(part)) {
    p = new MMLPart(part);
    this.parts.set(part, p);
  }
  this.currentPart = p;
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

MMLAssembler.prototype.assemble = function () {
  this.tempos.sort(function (a, b) { return a.position - b.position; });
  if (this.tempos.length == 0 || this.tempos[0].position > 0) {
    this.tempos.splice(0, 0, new MMLTempoMark(0, 120));
  }
  var tm = [0], totle = 0;
  for (var i = 1; i < this.tempos.length; i++) {
    var d = 60 * 4 / this.tempos[i-1].bpm * (this.tempos[i].position - this.tempos[i-1].position);
    tm.push(totle += d);
  }
  var result = [];
  this.parts.forEach(function (part) {
    result.push(this.assemblePart(part, tm));
  }, this);
  return result;
};

// private! convert one part to PlayerTrack
MMLAssembler.prototype.assemblePart = function (part, timetable) {
  var notes = [], tm = [0], idx = 0, pos = 0;
  for (var i = 0; i < part.notes.length; i++) {
    var n = part.notes[i];
    if (!n.chord) {
      pos += 1 / n.duration * (2 - Math.pow(0.5, n.dots));
      while (idx < this.tempos.length - 1 && this.tempos[idx+1].position < pos) {
        idx++;
      }
      var sec = 60 * 4 / this.tempos[idx].bpm;
      tm.push(sec * (pos - this.tempos[idx].position) + timetable[idx]);
    }
  }
  for (var i = 0, idx = 0; i < part.notes.length; i++, idx++) {
    var n = part.notes[i];
    if (n.chord) {
      idx--;
    }
    n.start = tm[idx];
    if (n.type === "note" && n.tieBefore === null) {
      var j = idx + 1, nn = n;
      while (nn.tieAfter) {
        nn = nn.tieAfter; j++;
      }
      var feel = (tm[j] - tm[j-1]) * nn.feel;
      notes.push(new PlayerNote(tm[idx], tm[j-1] + feel, n));
    }
  }
  return new PlayerTrack(notes);
};
