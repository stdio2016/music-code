function MasciiMeta(meta) {
  this.meta = meta;
}

MasciiMeta.prototype.toString = function () {
  var str = '"';
  for (var name in this.meta) {
    str += name + '=' + this.meta[name] + ' ';
  }
  str += '"';
  return str;
};

MasciiMeta.prototype.isBeat = function () {
  return false;
};

MasciiMeta.prototype.removeEmptyBeat = function () {
  ;
};

MasciiMeta.prototype.propagateTiming = function (ctx, start, len) {
  if (this.meta['[]']) {
    console.log('[] is set to', this.meta['[]']);
  }
  if (this.meta['{}']) {
    console.log('~[] is set to', this.meta['{}']);
  }
};

function MasciiOctave(str) {
  this.str = str;
  this.beat = false;
}

MasciiOctave.prototype.toString = function () {
  return this.str;
};

MasciiOctave.prototype.isBeat = function () {
  return false;
};

MasciiOctave.prototype.removeEmptyBeat = function () {
  ;
};

MasciiOctave.prototype.propagateTiming = function (ctx, start, len) {
  ;
};
