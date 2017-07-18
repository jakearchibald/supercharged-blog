const marked = require('marked');
const highlight = require('highlight.js');

const renderer = new marked.Renderer();

marked.setOptions({
  renderer,
  highlight(code, lang) {
    if (lang) {
      return highlight.highlight(lang, code).value;
    }
    return highlight.highlightAuto(code).value;
  }
});

renderer.heading = function (text, level, raw) {
  return marked.Renderer.prototype.heading.call(this, text, level + 1, raw);
};

renderer.code = function (code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<div class="codehilite"><pre>'
      + (escaped ? code : escape(code, true))
      + '\n</pre></div>';
  }

  return '<div class="codehilite"><pre class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\n</pre></div>\n';
};

module.exports = marked;