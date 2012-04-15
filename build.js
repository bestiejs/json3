/* JSON 3 Builder | http://bestiejs.github.com/json3 */
var fs = require("fs"), marked = require("./vendor/marked"), compressor = require("./vendor/uglifyjs/uglify-js");

// Enable GitHub-Flavored Markdown.
marked.setOptions({ "gfm": true });

// Generate the GitHub project page.
fs.readFile("README.md", "utf8", function readSource(exception, source) {
  if (exception) {
    console.log(exception);
  } else {
    // Read the project page template.
    fs.readFile("page/page.html", "utf8", function readPage(exception, page) {
      var headers, lines, lastSection, lastLevel, navigation;
      if (exception) {
        console.log(exception);
      } else {
        // Generate the page navigation. Ported from `mdtoc.rb` by Sam
        // Stephenson.
        headers = [];
        lines = source.split(/\r?\n/);
        // First pass: Scan the Markdown source looking for titles of the format:
        // `### Title ###`. Record the line number, header level (number of
        // octothorpes), and text of each matching title.
        lines.forEach(function (line, index) {
          var match = /^(\#{1,6})\s+(.+?)\s+\1$/.exec(line);
          if (match) {
            headers.push([index, match[1].length, match[2]]);
          }
        });
        // Second pass: Iterate over all matched titles and compute their
        // corresponding section numbers. Then replace the titles with annotated
        // anchors.
        headers.forEach(function(value) {
          var index = value[0], level = value[1], text = value[2], section, length;
          if (lastSection) {
            // Duplicate the last section metadata array.
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
          lines[index] = Array(level + 1).join("#") + "<a name=\"section_" + section.join(".") + "\"></a>" + text;
          value.push(section);
          lastSection = section;
          lastLevel = level;
        });
        // Third pass: Iterate over matched titles once more to produce the table of
        // contents.
        navigation = headers.map(function (value) {
          var index = value[0], level = value[1], text = value[2], section = value[3], name = section.join(".");
          return "<li><a href=\"#section_" + name + "\">" + text + "</a></li>";
        });
        navigation.push("");
        // Write the page source to disk.
        fs.writeFile("index.html", page.replace(/<%=\s*(.+?)\s*%>/g, function (match, data) {
          switch (data) {
            case "navigation":
              // Insert the table of contents directly into the template.
              return navigation.join("\n");
            case "source":
              // Convert the read me to HTML and insert it into the page body.
              return marked(lines.join("\n"));
          }
          return "";
        }), function (exception) {
          console.log(exception || "GitHub project page generated successfully.");
        });
      }
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
    results += "\n;" + compressor.uglify.gen_code(
      // Enable unsafe transformations.
      compressor.uglify.ast_squeeze_more(
        compressor.uglify.ast_squeeze(
          // Munge variable and function names, excluding the special `define`
          // function exposed by asynchronous module loaders.
          compressor.uglify.ast_mangle(compressor.parser.parse(source), {
            "except": ["define"]
          }
      ))), {
      "ascii_only": true
    });
    // Older environments, Safari, and Chrome choke on excessively long lines.
    fs.writeFile("lib/json3.min.js", compressor.uglify.split_lines(results, 4096), function (exception) {
      console.log(exception || "Compressed version generated successfully.");
    });
  }
});