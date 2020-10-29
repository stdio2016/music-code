function Marker(text) {
  this.text = text;
  this.pos = 0;
  this.tokens = [];
  this.noteId = 0;
  this.inNote = false;
  this.notes = [];
}

Marker.prototype.noteStart = function () {
  if (this.inNote) return;
  this.inNote = true;
  this.noteId += 1;
  this.tokens.push({type: 1, id: this.noteId});
};

Marker.prototype.noteEnd = function () {
  if (!this.inNote) return;
  this.inNote = false;
  this.tokens.push({type: 2, id: this.noteId});
  return this.noteId;
};

Marker.prototype.markTo = function (name, pos) {
  if (pos > this.pos) {
    // if the name of previous token is the same, merge it with current token
    var n = this.tokens.length;
    if (n > 0 && this.tokens[n-1].name === name) {
      this.tokens[n-1].text += this.text.substring(this.pos, pos);
    }
    else {
      this.tokens.push({
        type: 0,
        name: name,
        text: this.text.substring(this.pos, pos)
      });
    }
    this.pos = pos;
  }
};

Marker.prototype.feedLine = function (line) {
  if (this.text != null) {
    this.tokens.push({type: 0, name: '', text: '\n'});
  }
  this.text = line;
  this.pos = 0;
};

Marker.prototype.toHTML = function () {
  var out = document.createElement('div');
  var linediv = document.createElement('div');
  out.appendChild(linediv);
  var tokens = this.tokens;
  var note = null;
  for (var i = 0; i < tokens.length; i++) {
    var tok = tokens[i];
    if (tok.type == 1) {
      note = document.createElement('span');
      note.className = 'selectable';
      this.notes[tok.id] = {span: note};
      linediv.appendChild(note);
    }
    else if (tok.type == 2) {
      note = null;
    }
    else if (note != null) {
      var elt = document.createElement('span');
      elt.textContent = tok.text;
      elt.className = 'mcp-' + tok.name;
      note.appendChild(elt);
    }
    else {
      // token may contain newlines
      var lines = tok.text.split('\n');
      if (lines[0]) {
        var elt = document.createElement('span');
        elt.textContent = lines[0];
        elt.className = 'mcp-' + tok.name;
        linediv.appendChild(elt);
      }
      for (var j = 1; j < lines.length; j++) {
        if (linediv.children.length == 0) {
          out.appendChild(document.createElement('br'));
        }
        linediv = document.createElement('div');
        out.appendChild(linediv);
        if (lines[j]) {
          var elt = document.createElement('span');
          elt.textContent = lines[j];
          elt.className = 'mcp-' + tok.name;
          linediv.appendChild(elt);
        }
      }
    }
  }
  return out;
};
