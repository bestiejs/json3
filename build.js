var marked = require("marked"), fs = require("fs"), compressor = require("uglify-js");

// Enable GitHub Flavored Markdown.
marked.setOptions({ "gfm": true });

// Generate the GitHub project page.
fs.readFile("README.md", "utf8", function (exception, source) {
  if (exception) {
    console.log(exception);
  } else {
    source = [
      "<!DOCTYPE html>",
      "<html lang=en>",
      "<head>",
        "<meta charset=utf-8>",
        "<title>JSON 3</title>",
        "<link rel=stylesheet href=page.css media=screen>",
      "</head>",
      "<body>",
        marked(source),
      "<script src=lib/json3.js></script>",
      "</body>",
      "</html>"
    ].join("\n");
    fs.writeFile("index.html", source, function (exception) {
      console.log(exception || "GitHub project page generated successfully.");
    });
  }
});

// Compress JSON 3 using UglifyJS.
fs.readFile("lib/json3.js", "utf8", function (exception, source) {
  var results;
  if (exception) {
    console.log(exception);
  } else {
    results = "";
    // Preserve the copyright header.
    compressor.parser.tokenizer(source)().comments_before.forEach(function (comment) {
      // Remove the leading `!` character from YUI-style comments.
      results += comment.type == "comment1" ? "//" + comment.value + "\n" : ("/*" + comment.value.slice(comment.value.charAt(0) == "!" ? 1 : 0) + "*/");
    });
    results += "\n" + compressor.uglify.gen_code(
      // Enable unsafe transformations.
      compressor.uglify.ast_squeeze_more(
        compressor.uglify.ast_squeeze(
          // Munge variable and function names, excluding the special `define`
          // function exposed by asynchronous module loaders.
          compressor.uglify.ast_mangle(compressor.parser.parse(source), {
            "except": ["define"]
          })
        )), {
      "ascii_only": true
    });
    // Older environments, Safari, and Chrome choke on excessively long lines.
    fs.writeFile("lib/json3.min.js", compressor.uglify.split_lines(results, 4096), function (exception) {
      console.log(exception || "Compressed version generated successfully.");
    });
  }
});