var path = require("path");
var url = require("url");
var util = require("util");

var marked = require("marked");

var PageRenderer = module.exports = function PageRenderer(options) {
  marked.Renderer.call(this);
  if (options) {
    this.issueFormatters = options.issueFormatters;
    this.imgClasses = options.imgClasses;
    this.linkClasses = options.linkClasses;
  }
};

util.inherits(PageRenderer, marked.Renderer);

PageRenderer.issuePattern = /(\s*|[\[])\s*(issue|pr)\s*#(\d+)([;\]]|\s*)/gi;

PageRenderer.prototype.issueFormatters = null;
PageRenderer.prototype.imgClasses = null;
PageRenderer.prototype.linkClasses = null;

PageRenderer.prototype.listitem = function listitem(text) {
  var self = this;
  if (this.issueFormatters) {
    text = text.replace(PageRenderer.issuePattern, function linkIssue(match, pre, type, id, post) {
      var getURI = self.issueFormatters[type.toLowerCase()];
      if (!getURI) {
        return match;
      }
      return pre + util.format('<a href="%s">#%s</a>',
        getURI(id), id) + post;
    });
  }
  return marked.Renderer.prototype.listitem.call(this, text);
};

PageRenderer.prototype.image = function image(src, title, alt) {
  var attrs = [util.format('src="%s" alt="%s"', src, alt)];
  if (title) {
    attrs.push(util.format('title="%s"', title));
  }
  if (this.imgClasses) {
    var className = this.imgClasses[path.basename(src)];
    if (className) {
      attrs.push(util.format('class="%s"', className));
    }
  }
  return util.format('<img %s>', attrs.join(" "));
};

PageRenderer.prototype.link = function link(href, title, text) {
  var uri = url.parse(href);
  if (this.options && this.options.sanitize && uri.protocol == "javascript") {
    return '';
  }
  var attrs = [util.format('href="%s"', href)];
  if (title) {
    attrs.push(util.format('title="%s"', title));
  }
  if (this.linkClasses) {
    var className = this.linkClasses[uri.hostname];
    if (className) {
      attrs.push(util.format('class="%s"', className));
    }
  }
  return util.format("<a %s>%s</a>", attrs.join(" "), text);
};
