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
        this.parts.push(new MasciiPart(part));
      }
      this.line = line;
      this.parseLine(this.parts[part]);
      this.marker.markTo('note', line.length);
      part += 1;
    }
  }
  this.parts.forEach(function (part) {
    part.removeEmptyBeat();
  });
  if (this.count.bar) {
    this.parts.forEach(function (part) {
      part.propagateTiming();
    });
  }
  else {
    // free formed music
    this.parts.forEach(function (part) {
      if (part.measures.length > 0) {
        var ctx = new MasciiContext();
        var t = 0;
        part.measures[0].nodes.forEach(function (node) {
          node.propagateTiming(ctx, t, 0.25);
          if (node.isBeat()) {
            t += 0.25;
          }
        });
      }
    });
  }
};

MasciiParser.prototype.parseLine = function (part) {
  this.pos = 0;
  while (this.pos < this.line.length) {
    var pos = this.pos;
    do {
      ch = this.line.charAt(this.pos++);
    } while (/\s|_/.test(ch)) ;
    if (this.pos > pos+1) part.nextChord();
    this.marker.markTo('ws', this.pos-1);
    if (/[A-Ga-g]/.test(ch)) {
      part.add(this.parseNote(ch));
      this.count.note++;
    }
    else if (ch == '|') {
      var yes = part.nextBar();
      this.marker.markTo(yes ? 'instruction' : 'error', this.pos);
      this.count.bar++;
    }
    else if (ch == '(') {
      this.marker.markTo('duration', this.pos);
      part.enterGroup(new MasciiGroup());
      this.count.even++;
    }
    else if (ch == ')') {
      var yes = part.leaveGroup(')');
      this.marker.markTo(yes ? 'duration' : 'error', this.pos);
    }
    else if (ch == '.') {
      var note = new MasciiNote('.', null);
      this.marker.noteStart();
      this.marker.markTo('note', this.pos);
      note.source = this.marker.noteEnd();
      part.add(note);
      this.count.rest++;
    }
    else if (/[Oo><0-9]/.test(ch)) {
      this.marker.markTo('octave', this.pos);
      part.add(new MasciiOctave(ch));
      this.count.octave++;
    }
    else if (ch == '*') {
      var note = new MasciiNote('', null);
      note.beginEnd = '*';
      this.marker.noteStart();
      this.marker.markTo('note', this.pos);
      note.source = this.marker.noteEnd();
      part.add(note);
      this.count.endAll++;
    }
    else if (ch == '[') {
      this.marker.markTo('duration', this.pos);
      part.enterGroup(new MasciiDottedGroup(false));
      this.count.dotted++;
    }
    else if (ch == ']') {
      var yes = part.leaveGroup(']');
      this.marker.markTo(yes ? 'duration' : 'error', this.pos);
    }
    else if (ch == '"') {
      part.add(this.parseMeta());
      this.count.meta++;
    }
    else if (ch == '~') {
      if (this.line.charAt(this.pos) == '[') {
        this.pos++;
        this.marker.markTo('duration', this.pos);
        part.enterGroup(new MasciiDottedGroup(true));
        this.count.reverseDotted++;
      }
      else {
        this.marker.markTo('error', this.pos);
      }
    }
    else if (ch == 'x' || ch == 'X') {
      var note = new MasciiNote('x', null);
      this.marker.noteStart();
      note.beginEnd = this.parseBeginEnd();
      this.marker.markTo('note', this.pos);
      note.source = this.marker.noteEnd();
      part.add(note);
      this.repeat++;
    }
    else if (ch == '#') {
      this.marker.markTo('comment', this.line.length);
      this.pos = this.line.length;
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
  return new MasciiMeta(meta);
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
  var accid = this.parseAccidental();
  var note = new MasciiNote(pitch, accid);
  // parse chord name
  var line = this.line;
  var chord = '';
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
  note.chord = chord;
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
      var figaccid = this.parseAccidental();
      note.figures.push([fig, figaccid]);
    }
    else { this.pos--; break; }
  }
  // parse bass
  if (line.charAt(this.pos) == '/') {
    this.pos++;
    var i = this.pos;
    this.marker.markTo('note', i);
    var ch = line.charAt(i);
    var octave = '';
    while (/[0-9<>Oo]/.test(ch)) {
      octave += ch;
      i++;
      ch = line.charAt(i);
    }
    if (/[A-Ga-g]/.test(ch)) {
      note.bassOctave = octave;
      note.bass = ch;
      this.marker.markTo('octave', i);
      this.pos = i+1;
      note.bassAccid = this.parseAccidental();
    }
    else {
      note.bassOctave = '';
      note.bass = pitch;
      note.bassAccid = null;
    }
  }
  note.beginEnd = this.parseBeginEnd();
  this.marker.markTo('note', this.pos);
  note.source = this.marker.noteEnd();
  return note;
};
