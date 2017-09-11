function MmlParser(code) {
  this.scanner = new MmlTokenizer(code);
  this.tokens = [];
  this.current = new MMLPart(0);
  this.parts = [this.current];
}

MmlParser.prototype.addToken = function (tokenStart) {
  console.log("add token from span #" + tokenStart + " to #" + (this.scanner.spans.length - 1));
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

MmlParser.prototype.readNote = function (abc) {
  var ptc = abc.charCodeAt(0) - 65;
  ptc = [9, 11, 0, 2, 4, 5, 7][ptc];
  var acc = this.getAccidental();
  var tokenStart = this.scanner.accept("note");
  var du = this.getInt();
  var dot = this.getDot();
  this.scanner.accept("duration");
  var note = new MMLNote(ptc, du, dot);
  note.tokenId = this.addToken(tokenStart);
};

MmlParser.prototype.setOctave = function (num) {
  if (num > 9) num = 9;
  if (num < -1) num = -1;
  this.current.octave = num;
};

MmlParser.prototype.switchPart = function (num) {
  if (this.parts[num]) {
    this.current = this.parts[num];
  }
  else {
    this.current = this.parts[num] = new MMLPart(num);
  }
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
      num = this.getInt();
      if (num === null || num < 1) num = 4;
      return {type: 'duration', duration: num, dots: this.readDot()};
    case 'P': case 'R': // /[PR]\d*\.?/
      return this.readRest();
    case 'V': // /V\d*/
      num = this.getInt();
      if (num !== null) num /= (this.compatMode ? 15 : 127);
      return null;
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
