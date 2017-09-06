function MmlParser(code) {
  this.scanner = new MmlTokenizer(code);
}

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

MmlParser.prototype.getNote = function (abc) {
  var ptc = abc.charCodeAt(0) - 65;
  ptc = [9, 11, 0, 2, 4, 5, 7][ptc];
  var acc = this.getAccidental();
  var tokenStart = this.scanner.accept("note");
  var du = this.getInt();
  var dot = this.getDot();
  this.scanner.accept("duration");
  return new MMLNote(abc, du, dot, this.addToken());
};
