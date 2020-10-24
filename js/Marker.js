
function Marker(text) {
  this.text = text;
  this.pos = 0;
  this.tokens = [];
  this.noteId = 0;
}

Marker.prototype.noteStart = function () {
  this.noteId += 1;
  this.tokens.push({type: 1, id: this.noteId});
};

Marker.prototype.noteEnd = function () {
  this.tokens.push({type: 2, id: this.noteId});
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
  if (this.tokens.length > 0) {
    this.tokens.push({type: 0, name: '', text: '\n'});
  }
  this.txt = line;
  this.pos = 0;
};

Marker.prototype.toHTML = function () {
  var out = document.createElement('div');
  var linediv = document.createElement('div');
  out.appendChild(linediv);
  var tokens = this.tokens;
  for (var i = 0; i < tokens.length; i++) {
    var tok = tokens[i];
    if (tok.text == '\n') {
      if (linediv.children.length == 0) {
        out.appendChild(document.createElement('br'));
      }
      linediv = document.createElement('div');
      out.appendChild(linediv);
    }
    else {
      var elt = document.createElement('span');
      elt.textContent = tok.text;
      elt.className = 'mcp-' + tok.name;
      linediv.appendChild(elt);
    }
  }
  return out;
};
