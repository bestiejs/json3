var fs = require("fs");

var _ = require("lodash");
var h = require("highlight.js");
var marked = require("marked");

var assets = require("./assets");

var pageTemplate = _.template(assets.page, {
  imports: {
    marked: marked
  }
});

marked.setOptions({
  "smartypants": true,
  "highlight": function highlight(source) {
    return h.highlightAuto(source).value;
  }
});

// Generates a GitHub project page using the template.
module.exports = function genPage(title, destPath, srcPath, markedOptions, callback) {
  fs.readFile(srcPath, "utf8", function afterRead(err, src) {
    if (err) {
      callback(err);
      return;
    }
    // Generate the page.
    var page = buildPage(title, src, markedOptions);
    // Write the page to disk.
    fs.writeFile(destPath, page, callback);
  });
};

function buildPage(title, src, markedOptions) {
  var parts = genNav(src);
  return pageTemplate({
    navigation: parts.navigation,
    lines: parts.lines,
    title: title,
    markedOptions: markedOptions
  });
}

// Generates the navigation section for a Markdown document.
// Ported from `mdtoc.rb` by Sam Stephenson.
function genNav(source) {
  var headers = [];
  var lines = source.split(/\r?\n/);
  // First pass: Scan the Markdown source looking for titles of the format:
  // `### Title ###`. Record the line number, header level (number of
  // octothorpes), and text of each matching title.
  _.forEach(lines, function (line, index) {
    var match = /^(\#{1,6})\s+(.+?)\s+\1$/.exec(line);
    if (match) {
      headers.push([index, match[1].length, match[2]]);
    }
  });
  // Second pass: Iterate over all matched titles and compute their
  // corresponding section numbers. Then replace the titles with annotated
  // anchors.
  var lastSection, lastLevel;
  _.forEach(headers, function (value) {
    var index = value[0], level = value[1], text = value[2], section, length;
    if (lastSection) {
      // Clone the last section metadata array.
      section = lastSection.slice(0);
      if (lastLevel < level) {
        section.push(1);
      } else {
        length = lastLevel - level;
        while (length--) {
          section.pop();
        }
        section[section.length - 1] += 1;
      }
    } else {
      section = [1];
    }
    lines[index] = _.repeat('#', level) + "<a name=\"section_" + section.join(".") + "\"></a>" + text;
    value.push(section);
    lastSection = section;
    lastLevel = level;
  });
  // Third pass: Iterate over matched titles once more to produce the table of
  // contents.
  var navigation = _.map(headers, function (value) {
    var index = value[0], level = value[1], text = value[2], section = value[3], name = section.join(".");
    return "<li><a href=\"#section_" + name + "\">" + text + "</a></li>";
  });
  navigation.push("");
  return {
    "navigation": navigation,
    "lines": lines
  };
}
