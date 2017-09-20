function MmlParser(code) {
  this.scanner = new MmlTokenizer(code);
  this.tokens = [];
  this.current = new MMLPart(0);
  this.parts = [this.current];
  this.key = MmlParser.KEY_TABLE[2];
  this.keyAccidental = 0;
  this.transpose = 0;
  this.tempos = [];
}
MmlParser.KEY_TABLE = [
  //       pitch
  //A  B  C  D  E  F  G     key
  [ 0, 0,+1, 0, 0,+1,+1], // A
  [+1, 0,+1,+1, 0,+1,+1], // B
  [ 0, 0, 0, 0, 0, 0, 0], // C
  [ 0, 0,+1, 0, 0,+1, 0], // D
  [ 0, 0,+1,+1, 0,+1,+1], // E
  [ 0,-1, 0, 0, 0, 0, 0], // F
  [ 0, 0, 0, 0, 0,+1, 0]  // G
];

MmlParser.prototype.addToken = function (tokenStart) {
  return this.tokens.push(tokenStart, this.scanner.spans.length - 1) / 2 - 1;
};

MmlParser.prototype.getInt = function () {
  var ch = this.scanner.next(), d = 0;
  var has = false;
  while (/\d/.test(ch)) {
    has = true;
    d = d * 10 + (ch.charCodeAt(0) - 48);
    ch = this.scanner.next();
  }
  this.scanner.rewind();
  return has ? d : null;
};

MmlParser.prototype.getFloat = function () {
  var ch = this.scanner.next(), d = 0;
  var has = false;
  while (/\d/.test(ch)) {
    has = true;
    d = d * 10 + (ch.charCodeAt(0) - 48);
    ch = this.scanner.next();
  }
  if (has && ch === ".") {
    ch = this.scanner.next();
    var dd = 1;
    while (/\d/.test(ch)) {
      dd /= 10;
      d += (ch.charCodeAt(0) - 48) * dd;
      ch = this.scanner.next();
    }
  }
  this.scanner.rewind();
  return has ? d : null;
};

MmlParser.prototype.getAccidental = function () {
  var ch, d = 0, still = true, has = false;
  do {
    ch = this.scanner.next();
    if (ch === "+" || ch === "#") d++;
    else if (ch === "=" || ch === "@") d = d;
    else if (ch === "-") d--;
    else still = false;
    if (still) has = true;
  } while (still);
  this.scanner.rewind();
  return has ? d : null;
};

MmlParser.prototype.getDot = function () {
  var ch = this.scanner.next(), d = 0;
  while (ch === ".") {
    d++;
    ch = this.scanner.next();
  }
  this.scanner.rewind();
  return d;
};

MmlParser.prototype.tryTie = function (note) {
  if (note.tieAfter) return ; // already has tie
  note.tieAfter = true;
  if (this.current.tyingNotes.has(note.pitch)) {
    this.current.tyingNotes.get(note.pitch).push(note);
  }
  else {
    var t = [note];
    t.remain = 0;
    this.current.tyingNotes.set(note.pitch, t);
  }
};

MmlParser.prototype.addNote = function (note) {
  var last = this.current.notes[this.current.notes.length - 1];
  note.chord = this.current.chordMode;
  if (this.current.chordMode) {
    this.current.chordMode = false;
    note.startPos = last.startPos;
  }
  else {
    this.current.tiedNotes = this.current.tyingNotes;
    this.current.tyingNotes = new Map();
    if (last) {
      var du = 1 / last.duration * (2 - Math.pow(0.5, last.dots));
      note.startPos = last.startPos + du;
    }
    else {
      note.startPos = 0;
    }
  }
  var ch = this.scanner.next();
  if (ch === "~") {
    this.tryTie(note);
    this.scanner.accept("tie");
  }
  else {
    this.scanner.rewind();
  }
  var tied = this.current.tiedNotes.get(note.pitch);
  if (tied && tied.remain < tied.length) {
    var p = tied[tied.remain++];
    p.tieAfter = note;
    note.tieBefore = p;
  }
  this.current.notes.push(note);
};

MmlParser.prototype.readNote = function (abc) {
  var ptc = abc.charCodeAt(0) - 65;
  var acc = this.getAccidental();
  var k = [9, 11, 0, 2, 4, 5, 7][ptc];
  if (acc === null) ptc = k + this.key[ptc] + this.keyAccidental;
  else ptc = k + acc;
  ptc += this.current.octave * 12 + 12 + this.transpose;
  if (ptc > 127) ptc = 127;
  var tokenStart = this.scanner.accept("note");
  var du = this.getInt();
  var dot = this.getDot();
  if (!du) {
    du = this.current.duration;
    if (dot === 0) dot = this.current.dots;
  }
  this.scanner.accept("duration");
  var note = new MMLNote(ptc, du, dot);
  note.tokenId = this.addToken(tokenStart);
  note.volume = this.current.volume;
  this.addNote(note);
};

MmlParser.prototype.readRest = function () {
  var tokenStart = this.scanner.accept("note");
  var du = this.getInt();
  var dot = this.getDot();
  if (!du) {
    du = this.current.duration;
    if (dot === 0) dot = this.current.dots;
  }
  this.scanner.accept("duration");
  var note = new MMLNote("rest", du, dot);
  note.tokenId = this.addToken(tokenStart);
  this.addNote(note);
};

MmlParser.prototype.readN = function () {
  var pitch = Math.min(this.getInt() + 12, 127); // 0 to 127
  var tokenStart = this.scanner.accept("note-n");
  var dot = this.getDot();
  if (dot === 0) dot = this.current.dots;
  this.scanner.accept("duration");
  var note = new MMLNote(pitch, this.current.duration, dot);
  note.tokenId = this.addToken(tokenStart);
  note.volume = this.current.volume;
  this.addNote(note);
};

MmlParser.prototype.readDuration = function () {
  var du = this.getInt();
  if (!du) du = 4;
  var dot = this.getDot();
  this.current.duration = du;
  this.current.dots = dot;
  this.scanner.accept('instruction');
};

MmlParser.prototype.setOctave = function (num) {
  if (num > 9) num = 9;
  if (num < -1) num = -1;
  this.current.octave = num;
  this.scanner.accept('octave');
};

MmlParser.prototype.switchPart = function (num) {
  if (this.parts[num]) {
    this.current = this.parts[num];
  }
  else {
    this.current = this.parts[num] = new MMLPart(num);
  }
  this.scanner.accept('instruction');
};

MmlParser.prototype.setTempo = function (num) {
  this.tempos.push(new MMLTempoMark(this.current.pos, num));
  this.scanner.accept('instruction');
};

MmlParser.prototype.addTie = function () {
  var part = this.current;
  for (i = part.notes.length - 1; i > part.lastTiedPos ; i--) {
    if (!part.notes[i].chord) break;
  }
  for (i = i; i < part.notes.length; i++) {
    this.tryTie(part.notes[i]);
  }
  part.lastTiedPos = part.notes.length - 1;
  this.scanner.accept('tie');
};

MmlParser.prototype.readMusicFeel = function () {
  var ch = this.scanner.next();
  var mml = false;
  if (ch === "M" || ch === "m") {
    ch = this.scanner.next();
    if (ch === "L" || ch === "l") {
      ch = this.scanner.next();
      if (ch === "@") {
        this.compatMode = true;
        this.scanner.accept('instruction');
        mml = true;
      }
    }
  }
  if (!mml) {
    this.scanner.reject();
  }
};

MmlParser.prototype.readTranspose = function () {
  var key = this.scanner.next().toUpperCase();
  if (/[A-G]/.test(key)) {
    this.key = MmlParser.KEY_TABLE[key.charCodeAt(0) - 65];
    var accid = this.getAccidental();
    this.keyAccidental = accid || 0;
  }
  else {
    this.scanner.rewind();
    var accid = this.getAccidental();
    if (accid !== null)
      this.transpose += accid;
  }
  this.scanner.accept('instruction');
};

MmlParser.prototype.chordOn = function () {
  if (this.current.notes.length > 0) {
    this.current.chordMode = true;
    this.scanner.accept('instruction');
  }
  else {
    this.scanner.reject();
  }
};

MmlParser.prototype.setVolume = function (num) {
  if (num === null) num = 0.5;
  this.current.volume = Math.min(num, 1);
  this.scanner.accept('instruction');
};

MmlParser.prototype.next = function () {
  var ch = this.scanner.next();
  var num;
  switch(ch.toUpperCase()){
    case 'C': case 'D': case 'E': case 'F': case 'G':
    case 'A': case 'B': // /[A-G][+#-@]*\d*\.?~?
      return this.readNote(ch.toUpperCase());
    case ',': case '<':
      if (this.compatMode && ch == ',')
        return this.switchPart(this.current.id + 1);
      return this.setOctave(this.current.octave - 1);
    case "'": case '>':
      return this.setOctave(this.current.octave + 1);
    case 'O': // /O\d//
      num = this.getInt();
      if (num === null) num = 4;
      return this.setOctave(num);
    case 'L': // /L\d*\.?/
      return this.readDuration();
    case 'P': case 'R': // /[PR]\d*\.?/
      return this.readRest();
    case 'V': // /V\d*/
      num = this.getInt();
      if (num !== null) num = (num+1) / (this.compatMode ? 16 : 128);
      return this.setVolume(num);
    case 'T': // /T\d*(\.\d*)?/
      num = this.getFloat();
      if (num === null || num < 20) num = 120;
      if (num > 1000) num = 1000;
      return this.setTempo(num);
    case 'N': // /N\d*\.?~?/
      return this.readN();
    case '&':
      return this.addTie();
    case 'M':
      return this.readMusicFeel();
    // my extension
    case 'K': // /K[A-G]?[+#-]*
      return this.readTranspose();
    case '!': // /!\d*/
      num = this.getInt();
      if (num === null) num = 0;
      return this.switchPart(num);
    case '/':
      return this.chordOn();
    default:
      this.scanner.reject();
      return null;
  }
};
