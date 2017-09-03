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
    if (this.pos >= this.data.length) return "";
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
