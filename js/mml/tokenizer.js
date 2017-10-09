// parser for Music Macro Language (MML)
function MmlTokenizer(code) {
  this.data = code;
  this.pos = 0;
  this.spans = [];
  this.startPos = -1;
  this.lastPos = 0;
  this.newlineCount = 0;
}

MmlTokenizer.prototype.isSpace = function (ch) {
  return ch === ' ' || ch === '\t';
};

MmlTokenizer.prototype.isNewline = function (ch) {
  return ch === '\n';
};

MmlTokenizer.prototype.next = function () {
  this.lastPos = this.pos;
  do {
    ch = this.data.charAt(this.pos++);
    if (this.isNewline(ch)) {
      this.newlineCount++;
    }
  } while (ch !== "" && (this.isNewline(ch) || this.isSpace(ch))) ;
  if (this.startPos < 0 && ch !== "") {
    this.startPos = this.pos - 1;
  }
  return ch;
};

MmlTokenizer.prototype.rewind = function () {
  if (this.startPos === this.pos - 1) this.startPos = -1;
  this.pos = this.lastPos;
};

MmlTokenizer.prototype.reject = function () {
  this.accept('invalid');
};

MmlTokenizer.prototype.accept = function (type) {
  if (this.startPos < 0) return this.spans.length;
  this.spans.push({pos: this.startPos, to: this.pos, type: type});
  this.startPos = -1;
  return this.spans.length;
};

MmlTokenizer.prototype.addToken = function (startPos) {
  if (startPos < this.spans.length) {
    var group = this.spans.splice(startPos - 1, this.spans.length - startPos + 1);
    this.spans.push({
      pos: group[0].pos,
      to: group[group.length-1].to,
      type: group[0].type,
      child: group
    });
  }
  var span = this.spans[this.spans.length - 1];
  span.type += " selectable";
};

MmlTokenizer.prototype.setPosition = function (partId, noteIndex) {
  var span = this.spans[this.spans.length - 1];
  span.partId = partId;
  span.noteIndex = noteIndex;
};

MmlTokenizer.prototype.toHTML = function (tracks) {
  function myonclick(e) {
    var t = e.target;
    var note = tracks[t.dataset.partId].notes[t.dataset.noteIndex] || "N/A";
    alertBox("part "+ t.dataset.partId +" note "+ t.dataset.noteIndex + "\n" +
      note + "\n" + "startPos: " + note.startPos + " endPos: " + note.endPos
    );
  }
  var doc = document.createDocumentFragment();
  var line = document.createElement('div');
  var pos = 0;
  for (var i = 0; i < this.spans.length; i++) {
    var tok = this.spans[i];
    if (tok.pos > pos) {
      var txt = new Text(this.data.slice(pos, tok.pos));
      doc.appendChild(txt);
    }
    var span = document.createElement('span');
    span.className = tok.type;
    span.textContent = this.data.slice(tok.pos, tok.to);
    span.dataset.partId = tok.partId;
    span.dataset.noteIndex = tok.noteIndex;
    if (tok.type !== "invalid") {
      span.onclick = myonclick;
    }
    doc.appendChild(span);
    pos = tok.to;
  }
  if (this.data.length > pos) {
    var txt = new Text(this.data.slice(pos));
    doc.appendChild(txt);
  }
  return doc;
};
