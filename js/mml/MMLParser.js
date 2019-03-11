function MMLParser(code) {
  this.code = code;
  this.pos = 0;
  this.tokenPos = 0;
  this.view = new CodeView();
  this.current = new MMLPart(0);
  this.parts = [this.current];
  this.key = MMLParser.KEY_TABLE[2];
  this.keyAccidental = 0;
  this.transpose = 0;
  this.tempos = [];
  this.compatMode = false;
}
MMLParser.KEY_TABLE = [
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

MMLParser.prototype.getInt = function (len) {
  this.skipSpace();
  var p = this.pos;
  var out = 0;
  var i;
  for (i = 0; i < len; i++) {
    var ch = this.code.charCodeAt(p+i);
    if (ch >= 48 && ch <= 57) out = ch - 48 + out * 10;
    else break;
  }
  this.pos = p + i;
  return i == 0 ? null : out;
};

MMLParser.prototype.getFloat = function (len) {
  var d = this.getInt(len);
  if (d == null) return null;
  if (this.code[this.pos] === ".") {
    var p = this.pos + 1;
    var dd = 1;
    for (i = 0; i < 3; i++) {
      var ch = this.code.charCodeAt(p+i);
      dd /= 10;
      if (ch >= 48 && ch <= 57) d += (ch - 48) * dd;
      else break;
    }
    this.pos = p + i;
  }
  return d;
};

MMLParser.prototype.getAccidental = function () {
  var ch, d = 0, still = true, has = false;
  this.skipSpace();
  do {
    ch = this.code[this.pos++];
    if (ch === "+" || ch === "#") d++;
    else if (ch === "=" || ch === "@") d = d;
    else if (ch === "-") d--;
    else still = false;
    if (still) has = true;
  } while (still);
  this.pos--;
  return has ? d : null;
};

MMLParser.prototype.getDot = function () {
  var d = 0;
  this.skipSpace();
  while (d < 2 && this.code[this.pos] === ".") {
    this.pos++;
    d++;
  }
  return d;
};

MMLParser.prototype.skipSpace = function () {
  var ch;
  do {
    ch = this.code[this.pos++];
  } while (ch == ' ' || ch == '\t');
  this.pos--;
};

MMLParser.prototype.addToken = function (type, endNote) {
  var i = this.pos - 1;
  var from = this.tokenPos;
  while (i > from && (this.code[i] == ' ' || this.code[i] == '\t')) {
    i--;
  }
  this.view.addToken(this.code.slice(from, i+1), type);
  var id;
  if (endNote) id = this.view.endNote();
  this.view.addText(this.code.slice(i+1, this.pos));
  this.tokenPos = this.pos;
  if (endNote) return id;
};

MMLParser.prototype.addNote = function (note) {
  var part = this.current;
  if (part.chordMode) {
    part.chordMode = false;
    part.octave = part.savedOctave;
    note.startTime = part.notes[part.notes.length - 1].startTime;
    note.endTime = part.pos;
  }
  else {
    note.startTime = part.pos;
    part.pos += 1 / note.duration * (2 - Math.pow(0.5, note.dots));
    note.endTime = part.pos;
  }
  part.tieMode = false;
  part.notes.push(note);
};

MMLParser.prototype.readNote = function (abc) {
  this.view.beginNote();
  var ptc = abc.charCodeAt(0) - 65;
  var acc = this.getAccidental();
  var k = [9, 11, 0, 2, 4, 5, 7][ptc];
  if (acc === null) ptc = k + this.key[ptc] + this.keyAccidental;
  else ptc = k + acc;
  ptc += this.current.octave * 12 + 12 + this.transpose;
  if (ptc > 127) ptc = 127;
  var du = this.getInt(3);
  var dot = this.getDot();
  if (!du) {
    du = this.current.duration;
    if (dot === 0) dot = this.current.dots;
  }
  var note = new MMLNote(ptc, du, dot);
  this.skipSpace();
  if (this.code[this.pos] === '~') {
    note.tieAfter = true;
    this.pos++;
  }
  note.volume = this.current.volume;
  note.chord = this.current.chordMode;
  note.source = this.addToken("note", true);
  this.addNote(note);
};

MMLParser.prototype.readRest = function () {
  var pos = this.pos-1;
  this.view.beginNote();
  this.skipSpace();
  var du = this.getInt(3);
  this.skipSpace();
  var dot = this.getDot();
  if (!du) {
    du = this.current.duration;
    if (dot === 0) dot = this.current.dots;
  }
  var note = new MMLNote("rest", du, dot);
  note.source = this.addToken("note", true);
  this.addNote(note);
};

MMLParser.prototype.readN = function () {
  var pitch = this.getInt(3);
  if (!pitch) {
    this.addToken("invalid");
    return;
  }
  this.view.beginNote();
  pitch = Math.min(pitch + 12 + this.transpose, 127); // 0 to 127
  var dot = this.getDot();
  if (dot === 0) dot = this.current.dots;
  var note = new MMLNote(pitch, this.current.duration, dot);
  this.skipSpace();
  if (this.code[this.pos] === '~') {
    note.tieAfter = true;
    this.pos++;
  }
  note.volume = this.current.volume;
  note.chord = this.current.chordMode;
  note.source = this.addToken("note-n", true);
  this.addNote(note);
};

MMLParser.prototype.readDuration = function () {
  var du = this.getInt(3);
  if (!du || du == 0) {
    this.addToken("invalid");
    return;
  }
  if (this.compatMode && du > 64) du = 64;
  var dot = this.getDot();
  this.current.duration = du;
  this.current.dots = dot;
  this.addToken("duration");
};

MMLParser.prototype.setOctave = function (num) {
  if (num > 9) num = 9;
  if (num < -1) num = -1;
  if (this.compatMode) num = Math.min(Math.max(num, 1), 8);
  this.current.octave = num;
  this.addToken("octave");
};

MMLParser.prototype.switchPart = function (num) {
  if (this.parts[num]) {
    this.current = this.parts[num];
  }
  else {
    this.current = this.parts[num] = new MMLPart(num);
  }
};

MMLParser.prototype.setTempo = function (num) {
  if (this.compatMode)
    num = Math.min(Math.max(num, 32), 255);
  else
    num = Math.min(Math.max(num, 20), 1000);
  this.tempos.push({position: this.current.pos, bpm: num});
  this.addToken('instruction');
};

MMLParser.prototype.addTie = function () {
  var part = this.current;
  var i = part.notes.length - 1;
  if (i < 0 || part.chordMode || part.tieMode) {
    this.addToken("invalid");
    return;
  }
  while (i >= 0 && part.notes[i].chord) {
    part.notes[i].tieAfter = true;
    i--;
  }
  part.notes[i].tieAfter = true;
  part.tieMode = true;
  this.addToken('instruction');
};

MMLParser.prototype.readTranspose = function () {
  this.skipSpace();
  if (this.pos >= this.code.length) { this.addToken('invalid'); return; }
  var key = this.code[this.pos].toUpperCase();
  this.skipSpace();
  if (/[A-G]/.test(key)) {
    this.pos++;
    this.key = MMLParser.KEY_TABLE[key.charCodeAt(0) - 65];
    var accid = this.getAccidental();
    this.keyAccidental = accid || 0;
  }
  else {
    var accid = this.getAccidental();
    if (accid !== null)
      this.transpose += accid;
    else {
      this.addToken('invalid');
      return;
    }
  }
  this.addToken('instruction');
};

MMLParser.prototype.chordOn = function () {
  var part = this.current;
  if (part.notes.length > 0 && !part.chordMode & !part.tieMode) {
    this.current.chordMode = true;
    this.addToken('instruction');
    this.current.savedOctave = this.current.octave;
  }
  else {
    this.addToken('invalid');
  }
};

MMLParser.prototype.setVolume = function (num) {
  if (num === null) num = 0.5;
  this.current.volume = Math.min(num, 1);
  this.addToken("instruction");
};

MMLParser.prototype.skipComment = function () {
  var ch, pos = this.pos-1;
  if (this.compatMode) {
    this.switchPart(this.current.id + 1);
    this.compatMode = false;
  }
  do {
    ch = this.code.charAt(this.pos++);
  } while (ch !== "" && ch !== '\n') ;
  if (ch == '\n') this.pos--;
  this.view.addToken(this.code.slice(pos, this.pos), "comment");
};

MMLParser.prototype.readMusicFeel = function () {
  if (this.code.slice(this.pos, this.pos+3).toUpperCase() === "ML@") {
    this.compatMode = true;
    this.pos += 3;
    this.addToken("instruction");
  }
  else {
    this.addToken("invalid");
  }
};

MMLParser.prototype.next = function () {
  var pos = this.pos;
  this.skipSpace();
  this.view.addText(this.code.slice(pos, this.pos));
  if (this.pos >= this.code.length) return ;
  this.tokenPos = this.pos;
  var ch = this.code[this.pos++];
  var num;
  switch(ch.toUpperCase()){
    case 'C': case 'D': case 'E': case 'F': case 'G':
    case 'A': case 'B': // /[A-G][+#-@]*\d*\.?~?
      this.readNote(ch.toUpperCase()); break;
    case ',': case '<':
      if (this.compatMode && ch == ',') {
        this.switchPart(this.current.id + 1);
        this.addToken('instruction');
      }
      else
        this.setOctave(this.current.octave - 1);
      break;
    case "'": case '>':
      this.setOctave(this.current.octave + 1); break;
    case 'O': // /O\d//
      num = this.getInt(1);
      if (num === null) {
        this.addToken("invalid");
        return;
      }
      this.setOctave(num);
      break;
    case 'L': // /L\d*\.?/
      this.readDuration(); break;
    case 'P': case 'R': // /[PR]\d*\.?/
      this.readRest(); break;
    case 'V': // /V\d*/
      this.skipSpace();
      num = this.getInt(3);
      if (num == null) { this.addToken("invalid"); break; }
      num = num / (this.compatMode ? 15 : 127);
      if (num > 1) num = 1;
      this.setVolume(num);
      break;
    case 'T': // /T\d*(\.\d*)?/
      this.skipSpace();
      num = this.getFloat(4);
      if (num === null || this.current.chordMode) { this.addToken("invalid"); break; }
      this.setTempo(num);
      break;
    case 'N': // /N\d*\.?~?/
      this.readN(); break;
    case '&':
      this.addTie(); break;
    case 'M':
      this.readMusicFeel(); break;
    // my extension
    case 'K': // /K[A-G]?[+#-]*
      this.readTranspose(); break;
    case '!': // /!\d*/
      this.skipSpace();
      num = this.getInt(3);
      if (num === null) { this.addToken("invalid"); break; }
      this.switchPart(num);
      this.addToken('instruction');
      break;
    case '/':
      this.chordOn(); break;
    case ';':
      this.skipComment(); break;
    case '\n':
      this.view.newLine();
      break;
    default:
      this.view.addToken(ch, "invalid");
      break;
  }
};

MMLParser.prototype.parse = function () {
  do {
    this.next();
  } while (this.pos < this.code.length);
  this.tempos.sort(function (a, b) {
    if (a.position < b.position) return -1;
    if (a.position > b.position) return 1;
    return 0;
  });
  // default tempo
  this.tempos.unshift({position: 0, bpm: 120});
  for (var i in this.parts) {
    // sounds fun!
    //this.parts[i].makeOfftune();
    this.parts[i].connectTie();
    this.parts[i].setTempo(this.tempos);
  }
};
