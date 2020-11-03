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
  var yes = this.stack.length == 1;
  var m = new MasciiGroup();
  this.chord = new MasciiChord();
  m.nodes.push(this.chord);
  this.measures.push(m);
  this.stack.length = 1;
  this.stack[0] = m;
  return yes;
};

MasciiPart.prototype.nextChord = function () {
  if (this.chord.nodes.length > 0) {
    this.chord = new MasciiChord();
    this.stack[this.stack.length-1].nodes.push(this.chord);
  }
};

MasciiPart.prototype.enterGroup = function (group) {
  this.chord.nodes.push(group);
  this.stack.push(group);
  this.chord = new MasciiChord();
  group.nodes.push(this.chord);
  return true;
};

MasciiPart.prototype.leaveGroup = function (ch) {
  if (this.stack.length == 1) return false;
  var last = this.stack.pop();
  var yes = last.endChar() == ch;
  var top = this.stack[this.stack.length-1];
  this.chord = top.nodes[top.nodes.length-1];
  return yes;
};

MasciiPart.prototype.removeEmptyBeat = function () {
  var meas = this.measures;
  var newI = 0;
  for (var i = 0; i < meas.length; i++) {
    meas[i].removeEmptyBeat();
    if (meas[i].nodes.length > 0) {
      meas[newI++] = meas[i];
    }
  }
  meas.length = newI;
};

MasciiPart.prototype.propagateTiming = function () {
  var ctx = new MasciiContext();
  var i = 0;
  this.measures.forEach(function (m) {
    m.propagateTiming(ctx, i, 1.0);
    if (!m.isEmpty()) {
      i += 1.0;
      ctx.measureNum += 1;
    }
  });
};

MasciiPart.prototype.addEvents = function (ctx) {
  this.measures.forEach(function (m) {
    m.addEvents(ctx);
    ctx.resetAccidental();
    if (!m.isEmpty()) {
      ctx.measureNum += 1;
    }
  });
};

MasciiPart.prototype.toString = function () {
  var str = '|';
  for (var i = 0; i < this.measures.length; i++) {
    str += this.measures[i].toString(1);
    str += '|';
  }
  return str;
};

function MasciiGroup() {
  this.nodes = [];
}

MasciiGroup.prototype.toString = function (x) {
  if (x==1) return ' '+this.nodes.join(' ')+' ';
  return '('+this.nodes.join(' ')+')';
};

MasciiGroup.prototype.endChar = function () {
  return ')';
}

MasciiGroup.prototype.isBeat = function () {
  return true;
};

MasciiGroup.prototype.removeEmptyBeat = function () {
  var nodes = this.nodes;
  var newI = 0;
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].removeEmptyBeat();
    if (nodes[i].nodes.length > 0) {
      nodes[newI++] = nodes[i];
    }
  }
  nodes.length = newI;
};

MasciiGroup.prototype.propagateTiming = function (ctx, start, len) {
  var n = 0;
  this.nodes.forEach(function (node) {
    if (node.isBeat()) n += 1;
  });
  if (n >= 1) {
    var i = 0;
    var slice = len / n;
    this.nodes.forEach(function (node) {
      node.propagateTiming(ctx, start, slice);
      if (node.isBeat()) {
        i += 1;
        start += slice;
      }
    });
  }
};

MasciiGroup.prototype.isEmpty = function () {
  for (var i = 0; i < this.nodes.length; i++) {
    if (this.nodes[i].isBeat()) return false;
  }
  return true;
};

MasciiGroup.prototype.addEvents = function (ctx) {
  this.nodes.forEach(function (m) {
    m.addEvents(ctx);
  });
};

function MasciiDottedGroup(reversed) {
  this.nodes = [];
  this.beat = true;
  this.reversed = reversed;
}

MasciiDottedGroup.prototype = new MasciiGroup();
MasciiDottedGroup.prototype.constructor = MasciiDottedGroup;

MasciiDottedGroup.prototype.toString = function () {
  var begin = this.reversed ? '~[' : '[';
  return begin+this.nodes.join(' ')+']';
};

MasciiDottedGroup.prototype.endChar = function () {
  return ']';
}

MasciiDottedGroup.prototype.propagateTiming = function (ctx, start, len) {
  var n = 0;
  this.nodes.forEach(function (node) {
    if (node.isBeat()) n += 1;
  });
  if (n >= 1) {
    var i = 0;
    var slice = len / n;
    var rhythm = this.reversed ? ctx.reverseRhythm : ctx.rhythm;
    var loopSize = rhythm.length;
    var sum = 0;
    for (var j = 0; j < loopSize; j++) sum += rhythm[j];
    var rem = n % loopSize;
    this.nodes.forEach(function (node) {
      if (node.isBeat()) {
        if (i < n - rem) {
          var k = i % loopSize;
          var myslice = slice * loopSize * rhythm[k] / sum;
        }
        else {
          myslice = slice;
        }
      }
      node.propagateTiming(ctx, start, myslice);
      if (node.isBeat()) {
        start += myslice;
        i += 1;
      }
    });
  }
};

function MasciiChord() {
  this.nodes = [];
  this.beat = false;
}

MasciiChord.prototype.toString = function () {
  return this.nodes.join('');
};

MasciiChord.prototype.isBeat = function () {
  return this.beat;
};

MasciiChord.prototype.removeEmptyBeat = function () {
  var beat = false;
  this.nodes.forEach(function (node) {
    node.removeEmptyBeat();
    if (node.isBeat()) beat = true;
  });
  this.beat = beat;
};

MasciiChord.prototype.propagateTiming = function (ctx, start, len) {
  this.nodes.forEach(function (node) {
    node.propagateTiming(ctx, start, len);
  });
};

MasciiChord.prototype.addEvents = function (ctx) {
  this.nodes.forEach(function (m) {
    m.addEvents(ctx);
  });
};
