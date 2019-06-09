function CodeView() {
  this.elements = [];
  this.currentNote = null;
  this.notes = [];
  this.errors = 0;
}

CodeView.prototype.addToken = function (token, type) {
  if (type === "invalid") this.errors++;
  if (this.currentNote) {
    this.currentNote.code += "<span class="+type+">" + safeInnerHTML(token) + "</span>";
  }
  else {
    this.elements.push({token: token, type: type});
  }
};

CodeView.prototype.addText = function (text) {
  if (text.length > 0) {
    if (this.currentNote) {
      this.currentNote.code += safeInnerHTML(text);
    }
    else {
      this.elements.push(text);
    }
  }
};

CodeView.prototype.newLine = function () {
  this.elements.push({newline: true});
};

CodeView.prototype.beginNote = function () {
  this.currentNote = {code: "", note: true};
};

CodeView.prototype.endNote = function () {
  this.elements.push(this.currentNote);
  var id = this.currentNote.id = this.notes.length;
  this.notes.push(this.currentNote);
  this.currentNote = null;
  return id;
};

CodeView.prototype.toHTML = function () {
  var div = document.createElement('div');
  var lin = document.createElement('div');
  lin.className = 'line';
  for (var i = 0; i < this.elements.length; i++) {
    var e = this.elements[i];
    if (e.newline) {
      if (lin.childNodes.length == 0) {
        div.appendChild(document.createElement('br'));
      }
      else {
        div.appendChild(lin);
      }
      lin = document.createElement('div');
      lin.className = 'line';
    }
    else if (e.type) {
      var ee = document.createElement('span');
      ee.className = e.type;
      ee.innerText = e.token;
      lin.appendChild(ee);
    }
    else if (e.note) {
      var ee = document.createElement('span');
      ee.className = "selectable";
      ee.innerHTML = e.code;
      this.notes[e.id].span = ee;
      lin.appendChild(ee);
    }
    else {
      lin.appendChild(new Text(e));
    }
  }
  div.appendChild(lin);
  return div;
};
