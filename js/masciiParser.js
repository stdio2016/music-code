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
    if (/^\s*#/.test(this.lines[i])) { // comment line
      ;
    }
    else if (/^\s*$/.test(this.lines[i])) { // empty line
      this.partNo = 0;
    }
    else {
      console.log("parse part %d in line %d", this.partNo, this.lineNo);
      this.partNo++;
    }
  }
};
