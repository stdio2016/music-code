// parser for Music Macro Language (MML)
function MmlTokenizer(code) {
  this.data = code;
  this.pos = 0;
  this.spans = [];
  this.buf = [];
  this.spanPos = 0;
}

MmlTokenizer.prototype.isSpace = function (ch) {
  return ch === ' ' || ch === '\t';
};

MmlTokenizer.prototype.isNewline = function (ch) {
  return ch === '\n';
};

MmlTokenizer.prototype.next = function () {
  var ch;
  if (this.spanPos < this.buf.length) {
    ch = this.buf[this.spanPos][0];
  }
  else {
    var sep = [""];
    var oldPos = this.pos;
    var comment = true;
    while (comment) {
      do {
        ch = this.data.charAt(this.pos++);
      } while (this.isSpace(ch)) ;
      sep.push(this.data.slice(oldPos, this.pos - 1));
      oldPos = this.pos;
      if (ch === ';') {
        do {
          ch = this.data.charAt(this.pos++);
        } while (ch !== "" && !this.isNewline(ch)) ;
        sep.push(this.data.slice(oldPos - 1, this.pos - 1));
        oldPos = this.pos;
      }
      if (this.isNewline(ch)) {
        sep.push('\n');
        oldPos = this.pos;
        comment = true;
      }
      else {
        comment = false;
      }
    }
    sep[0] = ch;
    this.buf.push(sep);
  }
  this.spanPos++;
  return ch;
};

MmlTokenizer.prototype.rewind = function () {
  this.spanPos--;
};

MmlTokenizer.prototype.reject = function () {
  var tok = this.buf.shift();
  this.addSpace(tok);
  this.spans.push({str: tok[0], type: 'invalid'});
  this.spanPos = 0;
};

MmlTokenizer.prototype.accept = function (type) {
  if (this.spanPos <= 0) return this.spans.length;
  this.addSpace(this.buf[0]);
  var pos = this.spans.length;
  var sum = this.buf[0][0];
  for (var i = 1; i < this.spanPos; i++) {
    var tok = this.buf[i];
    if (tok.length == 2) {
      sum += tok[1].concat(tok[0]);
    }
    else {
      this.spans.push({str: sum, type: type});
      this.addSpace(tok);
      sum = tok[0];
    }
  }
  this.spans.push({str: sum, type: type});
  this.buf = this.buf.slice(this.spanPos);
  this.spanPos = 0;
  return pos;
};

MmlTokenizer.prototype.addSpace = function (tok) {
  for (var i=1; i<tok.length; i++) {
    if (tok[i].length === 0) continue;
    if (tok[i][0] === ";") {
      this.spans.push({str: tok[i], type: 'comment'});
    }
    else if (tok[i] === "\n") {
      this.spans.push({str: tok[i], type: 'newline'});
    }
    else {
      this.spans.push({str: tok[i], type: 'space'});
    }
  }
};

MmlTokenizer.prototype.toHTML = function () {
  var doc = document.createDocumentFragment();
  var line = document.createElement('div');
  var has = false;
  for (var i = 0; i < this.spans.length; i++) {
    var tok = this.spans[i];
    if (tok.type === "newline") {
      doc.appendChild(line);
      line = document.createElement('div');
    }
    else {
      var span = document.createElement('span');
      span.className = tok.type;
      span.textContent = tok.str;
      line.appendChild(span);
      has = true;
    }
  }
  if (has)
    doc.appendChild(line);
  return doc;
};

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
  this.scanner.accept("number");
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
  this.scanner.accept("accidental");
  return has ? d : null;
};
