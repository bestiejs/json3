var marked = require("marked"), fs = require("fs"), compressor = require("uglify-js");

// Enable GitHub Flavored Markdown.
marked.setOptions({ "gfm": true });

// Generate the GitHub project page.
fs.readFile("README.md", "utf8", function (exception, source) {
  if (exception) {
    console.log(exception);
  } else {
    source = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
        '<meta charset="utf-8">',
        '<title>JSON 3</title>',
        '<link rel="stylesheet" href="page.css" media="screen">',
      '</head>',
      '<body>',
        marked(source),
      '<script src="lib/json3.js"></script>',
      '</body>',
      '</html>'
    ].join("\n");
    fs.writeFile("index.html", source, function (exception) {
      console.log(exception || "GitHub project page generated successfully.");
    });
  }
});

// Compress JSON 3 using UglifyJS.
fs.readFile("lib/json3.js", "utf8", function (exception, source) {
  if (exception) {
    console.log(exception);
  } else {
    source = compressor.uglify.gen_code(compressor.uglify.ast_squeeze(compressor.uglify.ast_mangle(compressor.parser.parse(source))));
    fs.writeFile("lib/json3.min.js", source, function (exception) {
      console.log(exception || "Compressed version generated successfully.");
    });
  }
});