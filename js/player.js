// TODO: rewrite Player class
function note(pitch,start,end){
  var src = actx.createBufferSource();
  var env = actx.createGain();
  src.buffer = fakePno.sample;
  src.loop = true;
  src.loopStart = fakePno.loopStart;
  src.loopEnd = fakePno.loopEnd;
  src.playbackRate.value = Math.pow(2, (pitch - 69) / 12);
  src.connect(env);
  env.connect(master);
  var startTime = currentTime + start;
  if(src.start)
    src.start(startTime);
  else {
    src.noteOn(startTime);
  }

  var endtime = currentTime + end;
  env.gain.setValueAtTime(1, endtime - 0.05);
  env.gain.linearRampToValueAtTime(0, endtime);
  if(src.stop)
    src.stop(endtime);
  else {
    src.noteOff(endTime);
  }
  runningNotes.add(src);
  src.onended = function(){ runningNotes.delete(src); };
}

var runningNotes = new Set();

function play(){
  var C=60,D=62,E=64,F=65,G=67,A=69;
  var t = asm.assemble();
  currentTime = actx.currentTime;
  for (var i = 0; i < t.length; i++) {
    var p = t[i].notes;
    for (var j = 0; j < p.length; j++) {
      for (var k = 0; k < p[j].data.length; k++) {
        note(p[j].data[k].pitch, p[j].start, p[j].end);
      }
    }
  }
}
