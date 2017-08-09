function MasciiParser() {
  this.lineNo = 0;
  this.colNo = 0;
  this.parts = [];
  this.lines = [];
  this.partNo = 0;
}

MasciiParser.prototype.parse = function (str) {
  this.lineNo = this.colNo = 1;
  this.parts = [];
  this.partNo = 0;
  this.lines = str.split(/\r\n|\n|\r/);
  for (var i = 0; i < this.lines.length; i++) {
    this.lineNo = i + 1;
    if (/^[ \t]*#/.test(this.lines[i])) { // comment line
      ;
    }
    else if (/^[ \t]*$/.test(this.lines[i])) { // empty line
      this.partNo = 0;
    }
    else {
      if (this.parts.length <= this.partNo) {
        this.parts.push(new MasciiParser.Part());
        for (var j = 0; j < this.lines[i].length; j++) {
          this.colNo = j + 1;
          this.parts[this.partNo].feedChar(this.lines[i].charAt(j), this.colNo);
        }
        this.colNo++;
        this.parts[this.partNo].feedChar(' ', this.colNo);
      }
      console.log("parse part %d in line %d", this.partNo, this.lineNo);
      this.partNo++;
    }
  }
};

MasciiParser.Part = function () {
  this.insideMeta = false;
  this.afterTlide = false;
  this.stack = [new Measure()];
  this.measures = [];
  this.chordStr = "";
  this.colNo = 0;
};

MasciiParser.Part.prototype.feedChar = function (ch, colNo) {
  var top = this.stack[this.stack.length - 1];
  if (this.insideMeta) {

  }
  else if (this.afterTlide) {
    this.afterTlide = false;
    if (ch === '[') {
      this.beginGroup(colNo - 1, ReverseDottedGroup);
    }
    else {
      throw SyntaxError('Expect left bracket "[" after "~" to form a ~[ ... ] group');
    }
  }
  else {
    switch (ch) {
      case ' ': case '\t':
        this.endChord(); break;
      case '(':
        if (this.chordStr === "") {
          this.stack[this.stack.length - 1].chord.colNo = colNo;
        }
        this.beginGroup(colNo, MasciiGroup); break;
      case '[':
        if (this.chordStr === "") {
          this.stack[this.stack.length - 1].chord.colNo = colNo;
        }
        this.beginGroup(colNo, DottedGroup); break;
      case '|':
        if (this.stack.length !== 1) {
          throw SyntaxError('Barline can only occur outside groups');
        }
        this.endChord();
        this.measures.push(this.stack[0]);
        this.stack[0] = new Measure(colNo);
        break;
      case ')':
        this.endGroup(colNo, MasciiGroup); break;
      case ']':
        this.endGroup(colNo, DottedGroup); break;
      case '~':
        this.afterTlide = true; break;
      default:
        if (this.chordStr === "") {
          this.colNo = colNo;
        }
        this.chordStr += ch;
    }
  }
};

MasciiParser.Part.prototype.endChord = function () {
  var top = this.stack[this.stack.length - 1];
  this.parseChord();
  if (top.chord.notes.length > 0) {
    top.notes.push(top.chord);
    top.chord = new MasciiChord();
  }
};

MasciiParser.Part.prototype.beginGroup = function (colNo, groupType) {
  var top = this.stack[this.stack.length - 1];
  this.parseChord();
  var a = new groupType(colNo);
  top.chord.notes.push(a);
  this.stack.push(a);
};

MasciiParser.Part.prototype.endGroup = function (colNo, groupType) {
  var top = this.stack[this.stack.length - 1];
  if (!(top instanceof groupType)) {
    throw SyntaxError('Parenthesis mismatch');
  }
  this.endChord();
  this.stack.pop();
};

MasciiParser.Part.prototype.parseChord = function () {
  if (this.chordStr === "") return ;
  var top = this.stack[this.stack.length - 1];
  top.chord.notes.push(this.chordStr);
  this.chordStr = "";
};

function MasciiChord(colNo) {
  this.notes = [];
}

function Measure(colNo) {
  this.chord = new MasciiChord();
  this.notes = [];
  this.colNo = colNo;
}

function MasciiGroup(colNo) {
  this.chord = new MasciiChord();
  this.notes = [];
  this.colNo = colNo;
}

function DottedGroup(colNo) {
  this.chord = new MasciiChord();
  this.notes = [];
  this.colNo = colNo;
}

function ReverseDottedGroup(colNo) {
  DottedGroup.call(this, colNo);
}

ReverseDottedGroup.prototype = new DottedGroup();
ReverseDottedGroup.prototype.constructor = ReverseDottedGroup;
