// PlayerTrack is an immutable interval tree
// each interval is a note
function PlayerTrack(notes) {
  var sorted = notes.slice(0);
  sorted.sort(function (a, b) {
    if (a.start > b.start) return 1;
    else if (a.start < b.start) return -1;
    else if (a.end > b.end) return 1;
    else if (a.end < b.end) return -1;
    else return 0;
  });
  var nn = [];
  for (var i = 0; i < sorted.length; i++) {
    var s = sorted[i];
    var h = [s.data];
    while (++i < sorted.length && sorted[i].start == s.start && sorted[i].end == s.end) {
      h.push(sorted[i].data);
    }
    nn.push(new PlayerNote(s.start, s.end, h));
    --i;
  }
  function helper(i, j) {
    var mid = Math.floor((i + j) / 2);
    if (i == j) return -Infinity;
    var max = nn[mid].end;
    if (i < mid) max = Math.max(helper(i, mid), max);
    if (mid < j) max = Math.max(helper(mid + 1, j), max);
    nn[mid].maxEnd = max;
    return max;
  }
  helper(0, nn.length);
  this.notes = nn;
}

// Find all notes within range [from, to]
PlayerTrack.prototype.forEachInRange = function (from, to, call) {
  var notes = this.notes;
  function bs(i, j) {
    if (i == j) return ;
    var mid = Math.floor((i + j) / 2), n = notes[mid];
    if (n.maxEnd < from) return ;
    if (n.hasIntersect(from, to)) {
      call(n);
    }
    if (i < j - 1)
      bs(i, mid);
    if (n.start <= to)
      bs(mid + 1, j);
  }
  bs(0, notes.length);
};

// Find first note whose start > time
PlayerTrack.prototype.getFirstAfter = function (time) {
  var notes = this.notes;
  function bs(from, to, time) {
    if (from == to) return from;
    var mid = Math.floor((from + to) / 2);
    if (notes[mid].start > time) {
      if (from + 1 == to) return mid;
      return bs(from, mid + 1, time);
    }
    else
      return bs(mid + 1, to, time);
  }
  return bs(0, notes.length, time);
};

function PlayerNote(start, end, data) {
  this.start = start;
  this.end = end;
  this.data = data;
  this.maxEnd = end;
}

PlayerNote.prototype.hasIntersect = function (from, to) {
  if (this.end < from) return false;
  if (to < this.start) return false;
  return true;
};

PlayerNote.prototype.toString = function () {
  return "("+this.start+" -> "+this.end+"): "+this.data;
};
