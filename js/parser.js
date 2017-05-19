// parser for Music Macro Language (MML)
function MMLReader(code) {
  if (!(this instanceof MMLReader)) {
    return new MMLReader(code);
  }
  this.data = code;
  this.pos = 0;
  this.lastPos = 0;
  this.startPos = 0;
};

// get next non-whitespace non-comment character
MMLReader.prototype.nextChar = function () {
  this.lastPos = this.pos;
  var hasComment = true;
  do {
    while (/\s/.test(this.data.charAt(this.pos))) {
      ++this.pos;
    }
    if (this.data.charAt(this.pos) == ';') {
      do {
        ++this.pos;
      } while (!this.atEnd() && this.data.charAt(this.pos) != '\n');
    }
    else hasComment = false;
  } while (hasComment);
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
  var ch = this.nextChar();
  this.startPos = this.pos - 1;
  var num;
  switch(ch.toUpperCase()){
    case 'C': case 'D': case 'E': case 'F': case 'G':
    case 'A': case 'B': // /[A-G][+#-@]*\d*\.?~?
      return this.readNote(ch.toUpperCase());
    case ',': case '<':
      return {type: 'octaveChange', octave: -1};
    case "'": case '>':
      return {type: 'octaveChange', octave: +1};
    case 'O': // /O\d//
      num = this.nextChar();
      if (num === null) num = 4;
      if (num > "9" || num < "0") {
        this.rewind();
        num = 4;
      }
      return {type: 'octave', octave: +num};
    case 'L': // /L\d*\.?/
      num = this.nextInt();
      if (num === null || num < 1) num = 4;
      return {type: 'duration', duration: num, dots: this.readDot()};
    case 'P': case 'R': // /[PR]\d*\.?/
      return this.readRest();
    case 'V': // /V\d*/
      num = this.nextInt();
      return {type:'volume', volume: num};
    case 'T': // /T\d*(\.\d*)?/
      num = this.nextFloat();
      if (num === null || num < 20) num = 120;
      if (num > 1000) num = 1000;
      return {type: 'tempo', bpm: num};
    case 'N': // /N\d*\.?~?/
      return this.readN();
    case '&':
      return {type: 'tie'};
  // my extension
    case 'K': // /K[A-G]?[+#-]*
      return this.readKey();
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
    else if (ch === "=" && allowNatural) {
      accid = 0;
    }
    else {
      this.rewind();
      break;
    }
    hasAccid = true;
  }
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
    dots: dots, tied: tied, pos: [this.startPos, this.pos]};
};

// read rest
MMLReader.prototype.readRest = function () {
  var len = this.nextInt();
  var dots = this.readDot();
  return {type: 'rest', duration: len, dots: dots, pos: [this.startPos, this.pos]};
};

// read note in MIDI pitch format
MMLReader.prototype.readN = function () {
  var pitch = this.nextInt();
  if (pitch === null) pitch = 60;
  var dots = this.readDot();
  return {type: 'noteN', pitch: pitch, dots: dots, pos: [this.startPos, this.pos]};
};

// read key change
MMLReader.prototype.readKey = function () {
  var key = this.nextChar().toUpperCase();
  if (key === "" || key > "G" || key < "A") {
    this.rewind();
    key = null;
  }
  var accid = this.readAccidental(false);
  return {type: 'key', key: key, alter: accid};
};
