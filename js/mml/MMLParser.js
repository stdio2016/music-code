function MMLParser(code) {
  this.code = code;
  this.pos = 0;
  this.prevPos = 0;
  this.marker = new Marker(code);

  this.current = new MMLPart(0);
  this.parts = {0: this.current};
  this.tempos = [];
}

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
  return n;
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
  return n;
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
  this.marker.noteEnd();
};

MMLParser.prototype.readPitchNote = function readPitchNote() {
  this.marker.noteStart();
  this.markAs('note-n');
  var pitch = this.getInt(3, 'note-n');
  var dots = this.getDot('duration');
  var tied = this.getTie('instruction');
  this.marker.noteEnd();
};

MMLParser.prototype.readRest = function readRest() {
  this.marker.noteStart();
  this.markAs('note');
  var du = this.getInt(3, 'duration');
  var dots = this.getDot('duration');
  var tied = this.getTie('instruction');
  this.marker.noteEnd();
};

MMLParser.prototype.readMusicFeel = function () {
  var pos = this.pos;
  if (this.next() == 'M' && this.next() == 'L' && this.next() == '@') {
    this.markAs('instruction');
  }
  else {
    this.pos = pos;
    this.markAs('error');
  }
};

MMLParser.prototype.readKey = function () {
  var key = this.next().toUpperCase();
  if (/[A-G]/.test(key)) {
    ;
  }
  else this.back();
  this.markAs('instruction');
  var accid = this.getAccidental('instruction');
}

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
      break;
    case 'P': case 'R':
      this.readRest();
      break;
    case 'T':
      this.markAs('instruction');
      num = this.getInt(3, 'instruction');
      break;
    case 'V':
      this.markAs('decoration');
      num = this.getInt(3, 'decoration');
      break;
    case '!':
      this.markAs('instruction');
      num = this.getInt(3, 'instruction');
      break;
    case '&':
      this.markAs('instruction');
      break;
    case "'":
      this.markAs('octave');
      break;
    case ',':
      this.markAs('octave');
      break;
    case '/':
      this.markAs('instruction');
      break;
    case ';':
      var pos = this.code.indexOf('\n', this.pos);
      if (pos == -1) pos = this.code.length;
      this.pos = pos;
      this.markAs('comment');
      break;
    case '<':
      this.markAs('octave');
      break;
    case '>':
      this.markAs('octave');
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
