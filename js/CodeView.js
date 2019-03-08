function CodeView() {
  this.html = "<div>";
}

CodeView.prototype.addToken = function (token, type) {
  this.html += "<span class='"+type+"'>" + safeInnerHTML(token) + "</span>";
};

CodeView.prototype.addText = function (text) {
  if (text.length > 0) {
    this.html += safeInnerHTML(text);
  }
};

CodeView.prototype.newLine = function () {
  this.html += "</span><br><span>";
};

CodeView.prototype.beginNote = function () {

};

CodeView.prototype.endNote = function () {

};
