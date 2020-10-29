function MasciiParser(code) {
  this.code = code;
  this.line = '';
  this.pos = 0;
  this.marker = new Marker(null);
  this.parts = [];
  this.count = {note:0,meta:0,octave:0,octaveShift:0,bar:0,rest:0,endAll:0,even:0,dotted:0,reverseDotted:0,repeat:0};
}

MasciiParser.prototype.parse = function () {
  var lines = this.code.split('\n');
  var part = 0;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    this.marker.feedLine(line);
    if (/^\s*#/.test(line)) {
      // comment line
      this.marker.markTo('comment', line.length);
    }
    else if (/^\s*$/.test(line)) {
      // empty line
      this.marker.markTo('comment', line.length);
      part = 0;
    }
    else {
      if (part == this.parts.length) {
        this.parts.push(new MasciiPart());
      }
      this.line = line;
      this.parseLine(this.parts[part]);
      this.marker.markTo('note', line.length);
      part += 1;
    }
  }
};

MasciiParser.prototype.parseLine = function (part) {
  this.pos = 0;
  while (this.pos < this.line.length) {
    do {
      ch = this.line.charAt(this.pos++);
    } while (/\s|_/.test(ch)) ;
    this.marker.markTo('ws', this.pos-1);
    if (/[A-Ga-g]/.test(ch)) {
      this.parseNote(ch);
      this.count.note++;
    }
    else if (ch == '|') {
      this.marker.markTo('instruction', this.pos);
      this.count.bar++;
    }
    else if (ch == '(') {
      this.marker.markTo('duration', this.pos);
      this.count.even++;
    }
    else if (ch == ')') {
      this.marker.markTo('duration', this.pos);
    }
    else if (ch == '.') {
      this.marker.noteStart();
      this.marker.markTo('note', this.pos);
      this.marker.noteEnd();
      this.count.rest++;
    }
    else if (/[Oo><]/.test(ch)) {
      this.marker.markTo('octave', this.pos);
      this.count.octaveShift++;
    }
    else if (ch == '*') {
      this.marker.noteStart();
      this.marker.markTo('note', this.pos);
      this.marker.noteEnd();
      this.count.endAll++;
    }
    else if (ch == '[') {
      this.marker.markTo('duration', this.pos);
      this.count.dotted++;
    }
    else if (ch == ']') {
      this.marker.markTo('duration', this.pos);
    }
    else if (/[0-9]/.test(ch)) {
      this.marker.markTo('octave', this.pos);
      this.count.octave++;
    }
    else if (ch == '"') {
      this.parseMeta();
      this.count.meta++;
    }
    else if (ch == '~') {
      if (this.line.charAt(this.pos) == '[') {
        this.pos++;
        this.marker.markTo('duration', this.pos);
        this.count.reverseDotted++;
      }
      else {
        this.marker.markTo('error', this.pos);
      }
    }
    else if (ch == 'x' || ch == 'X') {
      this.marker.noteStart();
      this.parseBeginEnd();
      this.marker.markTo('note', this.pos);
      this.marker.noteEnd();
      this.repeat++;
    }
    else {
      this.marker.markTo('error', this.pos);
    }
  }
};

MasciiParser.prototype.parseMeta = function () {
  var key = '', val = '';
  var state = 0;
  var meta = {};
  while (this.pos < this.line.length) {
    var ch = this.line.charAt(this.pos++);
    if (/\s|_|"/.test(ch)) {
      if (state == 1)
        this.marker.markTo('decoration', this.pos-1);
      state = 0;
      if (key) {
        meta[key] = val;
        key = '';
        val = '';
      }
      if (ch == '"') break;
    }
    else if (state == 0 && (ch == ':' || ch == '=')) {
      this.marker.markTo('instruction', this.pos);
      state = 1;
    }
    else {
      if (state == 0) key += ch;
      else val += ch;
    }
  }
  //console.log(meta);
  this.marker.markTo('instruction', this.pos);
  return meta;
};

MasciiParser.prototype.parseAccidental = function () {
  var acc = 0;
  var hasAcc = false;
  while (this.pos < this.line.length) {
    var ch = this.line.charAt(this.pos++);
    if (ch == '+') acc += 1;
    else if (ch == '-') acc -= 1;
    else if (ch == '=') ;
    else { this.pos--; break; }
    hasAcc = true;
  }
  return hasAcc ? acc : null;
};

MasciiParser.prototype.parseBeginEnd = function () {
  var ch = this.line.charAt(this.pos++);
  if (ch == '*') return '*';
  else if (ch == '!') return '!';
  this.pos--;
  return '';
};

MasciiParser.prototype.parseNote = function (pitch) {
  this.marker.noteStart();
  this.parseAccidental();
  // parse chord name
  var line = this.line;
  var chord = null;
  var nameTest = line.substring(this.pos, this.pos+4).toLowerCase();
  if ('hdim' == nameTest) {
    chord = nameTest;
    this.pos += 4;
  }
  else {
    if (/^(?:aug|dim|dom|maj|min|sus)/.test(nameTest)) {
      chord = nameTest;
      this.pos += 3;
    }
    else {
      nameTest = nameTest.charAt(0);
      if (':' == nameTest || 'm' == nameTest) {
        chord = nameTest;
        this.pos += 1;
      }
    }
  }
  // parse figure
  while (this.pos < line.length) {
    var ch = line.charCodeAt(this.pos++);
    var ch2 = line.charAt(this.pos);
    // figure 0 ~ 19
    if (ch >= 48 && ch <= 57 && !/[A-GXa-gx]/.test(ch2)) {
      var fig = ch - 48;
      // figure 10 ~ 19
      if (ch == 49 && /[0-9]/.test(ch2) && !/[A-GXa-gx]/.test(line.charAt(this.pos+1))) {
        fig = ch2.charCodeAt(0) - 38;
        this.pos++;
      }
      this.parseAccidental();
    }
    else { this.pos--; break; }
  }
  // parse bass
  if (line.charAt(this.pos) == '/') {
    this.pos++;
    var i = this.pos;
    this.marker.markTo('note', i);
    var ch = line.charAt(i);
    while (/[0-9<>Oo]/.test(ch)) {
      i++;
      ch = line.charAt(i);
    }
    if (/[A-Ga-g]/.test(ch)) {
      this.marker.markTo('octave', i);
      this.pos = i+1;
      this.parseAccidental();
    }
  }
  this.parseBeginEnd();
  this.marker.markTo('note', this.pos);
  this.marker.noteEnd();
};

function MasciiPart() {
  this.a = [];
}
