var ConcatSource = require("webpack/lib/ConcatSource");
var OriginalSource = require("webpack/lib/OriginalSource");

var assets = require("./assets");

var WrapperPlugin = module.exports = function WrapperPlugin(version) {
  this.version = version;
};

WrapperPlugin.prototype.name = "json3";
WrapperPlugin.prototype.version = "";

WrapperPlugin.prototype.apply = function apply(compilation) {
  var self = this;
  var mainTemplate = compilation.mainTemplate;
  compilation.templatesPlugin("render-with-entry",
    function gotRender(src, chunk, hash) {

    return new ConcatSource(
      new OriginalSource(
        assets.header,
        "json3/header"
      ),
      src,
      new OriginalSource(
        assets.footer,
        "json3/footer"
      )
    );
  });
  compilation.plugin("global-hash-paths", function gotPaths(paths) {
    return paths.concat(self.name);
  });
  compilation.plugin("hash", function gotHash(hash) {
    hash.update(self.name);
    hash.update(self.version || "");
  });
};
