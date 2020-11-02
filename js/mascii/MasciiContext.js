function MasciiContext() {
  this.octave = 4;
  this.rhythm = [3, 1];
  this.reverseRhythm = [1, 3];
  this.keyTable = MasciiContext.KEY_TABLE[2].slice();
  this.accidTable = this.keyTable.slice();
}
MasciiContext.KEY_TABLE = [
  //       pitch
  //A  B  C  D  E  F  G     key
  [ 0, 0,+1, 0, 0,+1,+1], // A
  [+1, 0,+1,+1, 0,+1,+1], // B
  [ 0, 0, 0, 0, 0, 0, 0], // C
  [ 0, 0,+1, 0, 0,+1, 0], // D
  [ 0, 0,+1,+1, 0,+1,+1], // E
  [ 0,-1, 0, 0, 0, 0, 0], // F
  [ 0, 0, 0, 0, 0,+1, 0]  // G
];

MasciiContext.prototype.setOctave = function (oct) {
  if (oct == '<' || oct == 'O') {
    this.octave -= 1;
  }
  else if (oct == '>' || oct == 'o') {
    this.octave += 1;
  }
  else if (/[0-9]/.test(oct)) {
    this.octave = oct.charCodeAt(0) - 48;
  }
};

MasciiContext.prototype.setKey = function (keyname) {
  var y = keyname.toUpperCase().match(/^([A-G])([+-]?)(M?)$/);
  if (!y) return;
  var n = y[1].charCodeAt(0) - 65;
  var acc = 0;
  if (y[2] == '+') acc = 1;
  if (y[2] == '-') acc = -1;
  if (y[3]) {
    // find relative major
    n = (n+2)%7;
    acc += MasciiContext.KEY_TABLE[4][n] - 1;
  }
  this.keyTable = MasciiContext.KEY_TABLE[n].slice();
  for (var i = 0; i < 7; i++) {
    this.keyTable[i] += acc;
  }
  this.accidTable = this.keyTable.slice();
};

MasciiContext.prototype.resetAccidental = function () {
  for (var i = 0; i < 7; i++) {
    this.accidTable[i] = this.keyTable[i];
  }
};
