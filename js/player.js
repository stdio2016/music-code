// TODO: rewrite Player class
function note(pitch,start,duration){
  var bpm = 120;
  var src = actx.createBufferSource();
  var env = actx.createGain();
  src.buffer = fakePno.sample;
  src.playbackRate.value = Math.pow(2, (pitch - 69) / 12);
  src.connect(env);
  env.connect(master);
  var startTime = currentTime + start * (60 / bpm);
  if(src.start)
    src.start(startTime);
  else {
    src.noteOn(startTime);
  }

  var endtime = currentTime + (start + duration) * (60 / bpm);
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
  currentTime = actx.currentTime;
  note(G, 0, 0.5);
  note(E, 0.5, 0.5);
  note(E, 1, 1);

  note(F, 2, 0.5);
  note(D, 2.5, 0.5);
  note(D, 3, 1);

  note(C, 4, 0.5);
  note(D, 4.5, 0.5);
  note(E, 5, 0.5);
  note(F, 5.5, 0.5);
  note(G, 6, 0.5);
  note(G, 6.5, 0.5);
  note(G, 7, 1);

  note(G, 8, 0.5);
  note(E, 8.5, 0.5);
  note(E, 9, 1);

  note(F, 10, 0.5);
  note(D, 10.5, 0.5);
  note(D, 11, 1);

  note(C, 12, 0.5);
  note(E, 12.5, 0.5);
  note(G, 13, 0.5);
  note(G, 13.5, 0.5);
  note(E, 14, 2);

  note(D, 16, 0.5);
  note(D, 16.5, 0.5);
  note(D, 17, 0.5);
  note(D, 17.5, 0.5);
  note(D, 18, 0.5);
  note(E, 18.5, 0.5);
  note(F, 19, 1);

  note(E, 20, 0.5);
  note(E, 20.5, 0.5);
  note(E, 21, 0.5);
  note(E, 21.5, 0.5);
  note(E, 22, 0.5);
  note(F, 22.5, 0.5);
  note(G, 23, 1);

  note(G, 24, 0.5);
  note(E, 24.5, 0.5);
  note(E, 25, 1);

  note(F, 26, 0.5);
  note(D, 26.5, 0.5);
  note(D, 27, 1);

  note(C, 28, 0.5);
  note(E, 28.5, 0.5);
  note(G, 29, 0.5);
  note(G, 29.5, 0.5);
  note(C, 30, 2);
}