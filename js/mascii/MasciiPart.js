function MasciiPart(id) {
  this.id = id;
  var m = new MasciiGroup();
  this.chord = new MasciiChord();
  m.nodes.push(this.chord);
  this.measures = [m];
  this.stack = [m];
}

MasciiPart.prototype.add = function (note) {
  this.chord.nodes.push(note);
};

MasciiPart.prototype.nextBar = function () {
  var m = new MasciiGroup();
  this.chord = new MasciiChord();
  m.nodes.push(this.chord);
  this.measures.push(m);
  this.stack[0] = m;
};

MasciiPart.prototype.nextChord = function () {
  if (this.chord.nodes.length > 0) {
    this.chord = new MasciiChord();
    this.stack[this.stack.length-1].nodes.push(this.chord);
  }
};

function MasciiGroup() {
  this.nodes = [];
}

MasciiGroup.prototype.toString = function () {
  return '('+this.nodes.join(' ')+')';
};

function MasciiChord() {
  this.nodes = [];
}

MasciiChord.prototype.toString = function () {
  return this.nodes.join(' ');
};
