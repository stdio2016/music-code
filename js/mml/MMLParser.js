function MMLParser(code) {
  this.code = code;
  this.pos = 0;
  this.prevPos = 0;
  this.marker = new Marker(code);

  this.current = new MMLPart(0);
  this.parts = {0: this.current};
  this.tempos = [];
  this.key = MMLParser.KEY_TABLE[2];
  this.keyAccidental = 0;
  this.transpose = 0;
  this.mmlMode = false;
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

MMLParser.prototype.next = function () {
  var ch;
  this.prevPos = this.pos;
  do {
    ch = this.code.charAt(this.pos++);
  } while (/\s/.test(ch)) ;
  return ch;
};

MMLParser.prototype.back = function () {
  this.pos = this.prevPos;
};

MMLParser.prototype.markAs = function (tokenType) {
  this.marker.markTo(tokenType, this.pos);
};

MMLParser.prototype.getAccidental = function (tokenType) {
  var n = 0;
  var has = false;
  for (;;) {
    var ch = this.next();
    if (ch == '+' || ch == '#') n++;
    else if (ch == '-') n--;
    else if (ch == '=' || ch == '@') n = n;
    else break;
    has = true;
  }
  this.back();
  if (has) this.markAs(tokenType);
  return has ? n : null;
};

MMLParser.prototype.getInt = function (len, tokenType) {
  var n = 0;
  var has = false;
  for (var i = 0; i < len; i++) {
    var ch = this.next().charCodeAt(0);
    if (ch >= 48 && ch <= 57) n = ch - 48 + n*10;
    else {
      this.back();
      break;
    }
    has = true;
  }
  if (has) this.markAs(tokenType);;
  return has ? n : null;
};

MMLParser.prototype.getDot = function (tokenType) {
  var n = 0;
  for (n = 0; n < 2; n++) {
    var ch = this.next();
    if (ch != '.') {
      this.back();
      break;
    }
  }
  if (n > 0) this.markAs(tokenType);;
  return n;
};

MMLParser.prototype.getTie = function (tokenType) {
  if (this.next() == '~') {
    this.markAs(tokenType);
    return true;
  }
  this.back();
  return false;
};

MMLParser.prototype.readNote = function readNote(ch) {
  this.marker.noteStart();
  this.markAs('note');
  var accid = this.getAccidental('accidental');
  var du = this.getInt(3, 'duration');
  var dots = this.getDot('duration');
  var tied = this.getTie('instruction');
  
  var pitch = ch.charCodeAt(0)-65;
  if (accid == null) accid = this.key[pitch] + this.keyAccidental;
  pitch = [9, 11, 0, 2, 4, 5, 7][pitch] + accid;
  pitch += 12 * (this.current.octave + 1) + this.transpose;
  if (du == null || du == 0) {
    du = this.current.duration;
    if (dots == 0) dots = this.current.dots;
  }
  var note = new MMLNote(pitch, du, dots);
  note.tieAfter = tied;
  note.volume = this.current.volume / 127;
  note.chord = this.current.chordMode;
  note.source = this.marker.noteEnd();
  this.current.addNote(note);
};

MMLParser.prototype.readPitchNote = function readPitchNote() {
  this.marker.noteStart();
  this.markAs('note-n');
  var pitch = this.getInt(3, 'note-n');
  if (pitch == null) pitch = 48;
  pitch += 12 + this.transpose;
  var dots = this.getDot('duration');
  var tied = this.getTie('instruction');
  
  if (dots == 0) dots = this.current.dots;
  var note = new MMLNote(pitch, this.current.duration, dots);
  note.tieAfter = tied;
  note.volume = this.current.volume / 127;
  note.chord = this.current.chordMode;
  note.source = this.marker.noteEnd();
  this.current.addNote(note);
};

MMLParser.prototype.readRest = function readRest() {
  this.marker.noteStart();
  this.markAs('note');
  var du = this.getInt(3, 'duration');
  var dots = this.getDot('duration');
  
  if (du == null || du == 0) {
    du = this.current.duration;
    if (dots == 0) dots = this.current.dots;
  }
  var note = new MMLNote('rest', du, dots);
  note.source = this.marker.noteEnd();
  this.current.addNote(note);
};

MMLParser.prototype.readMusicFeel = function () {
  var pos = this.pos;
  if (this.next().toUpperCase() == 'M' && this.next().toUpperCase() == 'L'
      && this.next() == '@') {
    this.markAs('instruction');
    this.mmlMode = true;
  }
  else {
    this.pos = pos;
    var ch = this.next().toUpperCase();
    if (ch == 'L') {
      this.markAs('decoration');
      this.current.feel = 1;
    }
    else if (ch == 'N') {
      this.markAs('decoration');
      this.current.feel = 0.875;
    }
    else if (ch == 'S') {
      this.markAs('decoration');
      this.current.feel = 0.75;
    }
    else {
      this.pos = pos;
      this.markAs('error');
    }
  }
};

MMLParser.prototype.readKey = function () {
  var key = this.next().toUpperCase();
  if (/[A-G]/.test(key)) {
    this.markAs('instruction');
    this.key = MMLParser.KEY_TABLE[key.charCodeAt(0)-65];
    var accid = this.getAccidental('instruction');
    this.keyAccidental = accid;
  }
  else {
    this.back();
    this.markAs('instruction');
    var trans = this.getAccidental('instruction');
    if (trans == null) trans = 0;
    this.transpose += trans;
  }
}

MMLParser.prototype.switchPart = function (num) {
  if (num > MMLNote.MAX_PART) num = MMLNote.MAX_PART;
  if (this.parts[num]) {
    this.current = this.parts[num];
  }
  else {
    this.current = this.parts[num] = new MMLPart(num);
  }
};

MMLParser.prototype.addTie = function () {
  var part = this.current;
  var i = part.notes.length - 1;
  if (i < 0 || part.chordMode || part.tieMode) {
    return;
  }
  while (i >= 0 && part.notes[i].chord) {
    part.notes[i].tieAfter = true;
    i--;
  }
  part.notes[i].tieAfter = true;
  part.tieMode = true;
};

MMLParser.prototype.nextInstruction = function () {
  var ch = this.next().toUpperCase();
  this.pos -= 1;
  this.markAs('ws');
  this.pos += 1;
  var num, dots;
  switch (ch) {
    case 'A': case 'B': case 'C': case 'D': case 'E': case 'F': case 'G':
      this.readNote(ch);
      break;
    case 'K':
      this.readKey();
      break;
    case 'L':
      this.markAs('duration-instruction');
      num = this.getInt(3, 'duration-instruction');
      dots = this.getDot('duration-instruction');
      if (num == null || num == 0) num = 4;
      this.current.duration = Math.min(num, MMLNote.MAX_DURATION);
      this.current.dots = dots;
      break;
    case 'M':
      this.readMusicFeel();
      break;
    case 'N':
      this.readPitchNote();
      break;
    case 'O':
      this.markAs('octave');
      num = this.getInt(1, 'octave');
      if (num == null) num = 4;
      this.current.octave = num;
      break;
    case 'P': case 'R':
      this.readRest();
      break;
    case 'T':
      this.markAs('instruction');
      num = this.getInt(3, 'instruction');
      if (num == null) num = 120;
      num = Math.min(num, MMLNote.MAX_TEMPO);
      num = Math.max(num, MMLNote.MIN_TEMPO);
      this.tempos.push({position: this.current.pos, bpm: num});
      break;
    case 'V':
      this.markAs('decoration');
      num = this.getInt(3, 'decoration');
      if (this.mmlMode) num = num == null ? 63 : Math.min(num, 15) * 8 + 7;
      else num = num == null ? 63 : Math.min(num, 127);
      this.current.volume = num;
      break;
    case '!':
      this.markAs('instruction');
      num = this.getInt(3, 'instruction');
      if (num == null) num = 0;
      this.switchPart(num);
      break;
    case '&':
      this.markAs('instruction');
      this.addTie();
      break;
    case "'":
      this.markAs('octave');
      this.current.octave = Math.min(MMLNote.MAX_OCTAVE, this.current.octave+1);
      break;
    case ',':
      if (this.mmlMode) {
        this.markAs('instruction');
        this.switchPart(this.current.id + 1);
      }
      else {
        this.markAs('octave');
        this.current.octave = Math.max(MMLNote.MIN_OCTAVE, this.current.octave-1);
      }
      break;
    case '/':
      this.current.chordOn();
      this.markAs('instruction');
      break;
    case ';':
      var pos = this.code.indexOf('\n', this.pos);
      if (pos == -1) pos = this.code.length;
      this.pos = pos;
      this.markAs('comment');
      if (this.mmlMode) {
        this.mmlMode = false;
        this.switchPart(this.current.id + 1);
      }
      break;
    case '<':
      this.markAs('octave');
      this.current.octave = Math.max(MMLNote.MIN_OCTAVE, this.current.octave-1);
      break;
    case '>':
      this.markAs('octave');
      this.current.octave = Math.min(MMLNote.MAX_OCTAVE, this.current.octave+1);
      break;
    default:
      this.markAs('error');
  }
};

MMLParser.prototype.parse = function () {
  while (this.pos < this.code.length) {
    this.nextInstruction();
  }
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
