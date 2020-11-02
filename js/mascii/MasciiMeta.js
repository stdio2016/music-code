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

MasciiMeta.prototype.parseDottedTiming = function (str) {
  var tm = str.split('/');
  var out = [];
  for (var i = 0; i < tm.length; i++) {
    var r = parseInt(tm[i], 10);
    if (r > 0) out.push(r);
  }
  return out.length > 0 ? out : null;
};

MasciiMeta.prototype.propagateTiming = function (ctx, start, len) {
  if (this.meta['[]']) {
    var tm = this.parseDottedTiming(this.meta['[]']);
    if (tm) ctx.rhythm = tm;
  }
  if (this.meta['{}']) {
    var tm = this.parseDottedTiming(this.meta['{}']);
    if (tm) ctx.reverseRhythm = tm;
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
