// parser for Music Macro Language (MML)
function MMLReader(code) {
  if (!(this instanceof MMLReader)) {
    return new MMLReader(code);
  }
  this.data = code;
  this.pos = 0;
  this.lastPos = 0;
};

// get next non-whitespace character
MMLReader.prototype.nextChar = function () {
  this.lastPos = this.pos;
  while (/\s/.test(this.data.charAt(this.pos))) {
    ++this.pos;
  }
  return this.data.charAt(this.pos++);
};

MMLReader.prototype.atEnd = function () {
  return this.pos >= this.data.length;
};

MMLReader.prototype.rewind = function () {
  this.pos = this.lastPos;
};

// read an integer
MMLReader.prototype.nextInt = function () {
  var result = 0;
  var success = false;
  while (!this.atEnd()) {
    var char = this.nextChar();
    if (char >= '0' && char <= '9') {
      success = true;
      result = result*10 + parseInt(char);
    }
    else {
      this.rewind();
      break;
    }
  }
  if (success)
    return result;
  else
    return null;
};

// read a decimal point number
MMLReader.prototype.nextFloat = function () {
  var integ = this.nextInt();
  if (integ === null) {
    return null;
  }
  if (this.nextChar() !== '.') {
    this.rewind();
    return integ;
  }
  var frac = 0;
  var base = 0.1;
  while (!this.atEnd()) {
    var char = this.nextChar();
    if (char >= '0' && char <= '9') {
      frac += parseInt(char) * base;
      base *= 0.1;
    }
    else {
      this.rewind();
      break;
    }
  }
  return integ + frac;
};

// get next instruction from MML code
MMLReader.prototype.next = function () {
  this.startPos = this.pos;
  var ch = this.nextChar();
  var num;
  switch(ch.toUpperCase()){
    case 'C': case 'D': case 'E': case 'F': case 'G':
    case 'A': case 'B': // /[A-G][+#-@]*\d*\.?~?
      return this.readNote(ch.toUpperCase());
    case 'K': // /K[A-G]?[+#-]*
      return this.readKey();
    case ',': case '<':
      return {type: 'octaveChange', octave: -1};
    case "'": case '>':
      return {type: 'octaveChange', octave: +1};
    case 'O': // /O\d/
      num = this.nextChar();
      if (num === "" || num > "9" || num < "0") num = 4;
      return {type: 'octave', octave: num};
    case 'L': // /L\d*\.?/
      num = this.nextInt();
      if (num === null || num < 1) num = 4;
      return {type: 'duration', duration: num, dots: this.readDot()};
    case 'P': case 'R': // /[PR]\d*\.?/
      return this.readRest();
    case 'V': // /V\d*/
      num = this.nextInt();
      if (num === null) num = 80;
      return {type:'volume', volume: num};
    case 'T': // /T\d*(\.\d*)?/
      num = this.nextFloat();
      if (num === null || num < 20) num = 120;
      return {type: 'tempo', bpm: num};
    case 'N': // /N\d*\.?~?/
      return this.readN();
    case '&':
      return {type: 'tie'};
    case '!': // /!\d*/
      num = this.nextInt();
      if (num === null) num = 0;
      return {type: 'part', part: num};
    case '/':
      return {type: 'chord'};
    default:
      return null;
  }
};

// read accidentals (+, #, and -)
MMLReader.prototype.readAccidental = function (allowNatural) {
  var ch, accid = 0, hasAccid = false;
  while (!this.atEnd()) {
    ch = this.nextChar();
    if (ch === "+" || ch === "#") {
      accid++;
    }
    else if (ch === "-") {
      accid--;
    }
    else if (ch === "@" && allowNatural) {
      accid = 0;
    }
    else {
      break;
    }
    has = true;
  }
  this.rewind();
  if (hasAccid) {
    return accid;
  }
  return null;
};

// read dot of a note
MMLReader.prototype.readDot = function () {
  if (this.nextChar() === ".") {
    return 1;
  }
  this.rewind();
  return 0;
};

// read note A-G
MMLReader.prototype.readNote = function (pitch) {
  var accid = this.readAccidental(true);
  var len = this.nextInt();
  var dots = this.readDot();
  var tied = false;
  if (this.nextChar() === "~") {
    tied = true;
  }
  else {
    this.rewind();
  }
  return {type: 'note', pitch: pitch, alter: accid, duration: len,
    dots: dots, tied: tied};
};
