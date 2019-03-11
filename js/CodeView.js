function CodeView() {
  this.elements = [];
  this.currentNote = null;
  this.notes = [];
}

CodeView.prototype.addToken = function (token, type) {
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
  var lin = document.createElement('span');
  for (var i = 0; i < this.elements.length; i++) {
    var e = this.elements[i];
    if (e.newline) {
      div.appendChild(lin);
      div.appendChild(document.createElement('br'));
      lin = document.createElement('span');
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
