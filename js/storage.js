var oldSongs = {};
var songs = {};

function initSongList(){
  var songList = document.getElementsByName('song')[0];
  console.log(songList);
  if(!localStorage.volatileMus_SongList){
    localStorage.setItem('volatileMus_SongList', '{}');
  }
  if(!localStorage.musicCode_SongList){
    localStorage.setItem('musicCode_SongList', '{}');
  }
  oldSongs = JSON.parse(localStorage.volatileMus_SongList);
  songs = JSON.parse(localStorage.musicCode_SongList);
  console.log(songs);
  var customSongList = songList.children[1];
  for(var name in oldSongs){
    customSongList.appendChild(new Option(name, "c" + name));
  }
  customSongList = songList.children[2];
  for(var name in songs){
    customSongList.appendChild(new Option(name, "d" + name));
  }
  var name = sessionStorage.getItem('musicCode_ShowPermaLink');
  if((name === null || name.charAt(0) != 'd') && location.hash) {
    var opt = new Option('Song from link','perma');
    songList.appendChild(opt);
    opt.selected = 'selected';
  }
  else if (name) {
    songList.value = name;
    if (songList.value == '') songList.value = 'bTwinkle';
  }
  //if(name) {
  //  document.getElementById('warn').innerText = "http://stdio2016.github.io/volatile/mus.html"+location.hash;
  //}
}

function changeSong(){
  var songSelect = document.getElementsByName('song')[0];
  var dirty = document.getElementById('codeIn').dirty;
  var name = songSelect.value;
  if (songSelect.previousSelection && dirty && name !== songSelect.previousSelection) {
    confirmBox('You have unsaved changes. Really want to change song?', function (yes) {
      if (yes) {
        confirmChangeSong(name);
      } else {
        songSelect.value = songSelect.previousSelection;
      }
    });
  } else {
    confirmChangeSong(name);
  }
}

function confirmChangeSong(name){
  var songSelect = document.getElementsByName('song')[0];
  var code = "";
  if (name == 'bTwinkle'){
    code = "T100L8\nCCGGAAG4\nFFEEDDC4\nGGFFEED4\nGGFFEED4\nCCGGAAG4\nFFEEDDC4";
  }
  else if (name == "bLittleBee"){
    code = "T100L8\nGEE4FDD4\nCDEFGGG4\nGEE4FDD4\nCEGGE2\n" +
      "DDDDDEF4\nEEEEEFG4\nGEE4FDD4\nCEGGC2";
  }
  else if (name == 'bBWV114') {
    code = 
      "MML@T120L8>D4<GAB>C D4<G4G4 >E4CDEF+ G4<G4G4> C4DC< BAB4B+BAG F+4GABG B4A2\n"+
      ">D4<GAB>C D4<G4G4 >E4CDEF+ G4<G4G4> C4DC< BAB4B+BAG A4BAGF+ G2.\n"+
      ">B4GABG A4DEF+D G4EF+GD C+4C-C+<A4 AB>C+DEF+ L4GF+E F+<A>C+ D2.\n"+
      "DL8<GF+G4 >E4<GF+G4 >D4C4<B4 AGF+GA4 DEF+GAB B+4B4A4 B>D<G4F+4 G2.,\n" +
      "<G2A4 L2.B B+ B A G >L4D<BG >D.C8<B8A8\n"+
      "B2A GBG B+2. BB+8B8A8G8 A2F+ G2B >CD<D GDG\n"+
      "G2. F+2. EGE A2<A >A2. B>DC+ D<F+A >D<DB+\n"+
      "BDB B+EB+ BAG >D2. <D2F+ EGF+ GC-D GD<G,;\n";
  }
  else if (name.charAt(0) == 'c'){
    code = oldSongs[name.substr(1)];
  }
  else if (name.charAt(0) == 'd'){
    var cp = songs[name.substr(1)];
    code = cp.code;
    document.getElementById('format').value = cp.lang;
  }
  else if (name == 'perma'){
    var cp = decodePermalink();
    code = cp.code;
    document.getElementById('format').value = cp.lang;
  }
  if (name != sessionStorage.musicCode_ShowPermaLink) {
    sessionStorage.musicCode_ShowPermaLink = '';
  }
  document.getElementById('codeIn').value = code;
  document.getElementById('codeIn').dirty = false;
  songSelect.previousSelection = name;
}

function save(){
  var elt = event.target;
  var songSelect = document.getElementsByName('song')[0];
  var name = songSelect.value;
  var newName = "";
  if (name.charAt(0) == 'c' || name.charAt(0) == 'd'){
    promptBox('Input the song name', name.substring(1), afterGetName);
  }
  else {
    promptBox('Input the song name', '', afterGetName);
  }
  function afterGetName(newName) {
    if(!newName) return;
    document.getElementById('codeIn').dirty = false;
    encodePermalink('d' + newName);
    if(newName == '') return;
    if(!songs[newName]){
      var opt = new Option(newName, "d" + newName);
      songSelect.children[2].appendChild(opt);
      opt.selected = true;
    }
    songSelect.value = 'd' + newName;
    songs[newName] = {
      lang: document.getElementById('format').value,
      code: document.getElementById('codeIn').value
    };
    localStorage.setItem('musicCode_SongList', JSON.stringify(songs));
    elt.focus();
  }
}

function del(){
  var songSelect = document.getElementsByName('song')[0];
  var name = songSelect.value;
  if (name === 'perma') {
    alertBox('The song from permalink is permanent');
    return;
  }
  if (name.charAt(0) != 'd'){
    if (name.charAt(0) == 'c')
      alertBox('Old song cannot be deleted by this program.');
    else
      alertBox('You cannot delete a builtin song');
    return;
  }
  confirmBox('Do you really want to delete "' + name.substring(1) + '"?', confirmDeletion);
  function confirmDeletion(yes) {
    if (!yes) return;
    console.log(name);
    var so = songSelect.children[2];
    for(var i=0; i<so.children.length; i++){
      if(so.children[i].value == name){
        so.children[i].remove();
        break;
      }
    }
    delete songs[name.substr(1)];
    localStorage.setItem('musicCode_SongList', JSON.stringify(songs));
  }
}

function encodePermalink(name){
  var code = document.getElementById('codeIn').value;
  code = encodeURIComponent(code);
  code = code.replace(/\(/g, "%28").replace(/\)/g, "%29");
  if(/[#.,/!*]$/.test(code)){
    code = code + "%20";
  }
  //document.getElementById('warn').innerText = "Generating permalink...";
  sessionStorage.musicCode_ShowPermaLink = name;
  //setTimeout(
    (function(){
      var href = location.href;
      var hashpos = href.indexOf("#");
      var href = hashpos == -1 ? href : href.substr(0, hashpos);
      var lang = document.getElementById('format').value;
      location.href=href+'#lang='+lang+'&code='+code;
      //location.reload();
    })();
  //,500);
}

function decodePermalink(){
  var code = location.hash.substr(1);
  var lang = 'mml';
  var params = code.split('&');
  for (var i = 0; i < params.length; i++) {
    if (params[i].substring(0, 5) == 'code=') {
      code = params[i].substring(5);
    }
    if (params[i].substring(0, 5) == 'lang=') {
      lang = params[i].substring(5);
    }
  }
  code = decodeURIComponent(code);
  return {code: code, lang: lang};
}
