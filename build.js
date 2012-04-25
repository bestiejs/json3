#!/usr/bin/env node

/* JSON 3 Builder | http://bestiejs.github.com/json3 */
var path = require("path"), fs = require("fs"), spawn = require("child_process").spawn, marked = require(path.join(__dirname, "vendor", "marked")),

// The path to the Closure Compiler `.jar` file.
closurePath = path.join(__dirname, "vendor", "closure-compiler.jar"),

// The Closure Compiler options: enable advanced optimizations and suppress all
// warnings apart from syntax and optimization errors.
closureOptions = ["--compilation_level=advanced_optimizations", "--warning_level=quiet"];

// Enable GitHub-Flavored Markdown.
marked.setOptions({ "gfm": true });

// Generate the GitHub project page.
fs.readFile(path.join(__dirname, "README.md"), "utf8", function readInfo(exception, source) {
  if (exception) {
    console.log(exception);
  } else {
    // Read the project page template.
    fs.readFile(path.join(__dirname, "page", "page.html"), "utf8", readTemplate);
  }

  // Interpolates the page template and writes the result to disk.
  function readTemplate(exception, page) {
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
      headers.forEach(function (value) {
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
      fs.writeFile(path.join(__dirname, "index.html"), page.replace(/<%=\s*(.+?)\s*%>/g, function interpolate(match, data) {
        switch (data) {
          case "navigation":
            // Insert the table of contents directly into the template.
            return navigation.join("\n");
          case "source":
            // Convert the read me to HTML and insert it into the page body.
            return marked(lines.join("\n"));
        }
        return "";
      }), function writePage(exception) {
        console.log(exception || "GitHub project page generated successfully.");
      });
    }
  }
});

// Compress JSON 3 using the Closure Compiler.
fs.readFile(path.join(__dirname, "lib", "json3.js"), "utf8", function readSource(exception, source) {
  var results;
  if (exception) {
    console.log(exception);
  } else {
    // Shell out to the Closure Compiler executable. Requires Java 6 or higher.
    invoke("java", ["-jar", closurePath].concat(closureOptions), source, compressSource);
  }

  // Post-processes the compressed source and writes the result to disk.
  function compressSource(exception, compressed) {
    if (exception) {
      console.log(exception);
    } else {
      // Extract the JSON 3 header and wrap the compressed source in an
      // immediately-invoked function expression (enabling advanced
      // optimizations causes the Compiler to add global variables).
      compressed = extractComments(source)[0] + "\n;(function(){" + compressed + "}());";
      // Write the compressed version to disk.
      fs.writeFile(path.join(__dirname, "lib", "json3.min.js"), compressed, writeSource);
    }

    // Checks the `gzip`-ped size of the compressed version by shelling out to the
    // Unix `gzip` executable.
    function writeSource(exception) {
      console.log(exception || "Compressed version generated successfully.");
      // Automatically check the `gzip`-ped size of the compressed version.
      // This requires shelling out to the Unix `gzip` executable.
      invoke("gzip", ["-9f", "-c"], compressed, "binary", function checkSize(exception, results) {
        if (!exception) {
          console.log("Compressed version size: %d KB.", results.length);
        }
      });
    }
  }
});

// Internal: Invokes a process with the given `name`, `parameters,` and standard
// `input`. Yields the result to a `callback` function. The optional `encoding`
// argument specifies the output stream encoding.
function invoke(name, parameters, input, encoding, callback) {
  // The standard output stream, error stream, and process instance.
  var error = "", output = "", process = spawn(name, parameters);
  if (typeof encoding == "string") {
    // Explicitly set the encoding of the output stream if one is specified.
    process.stdout.setEncoding(encoding);
  } else {
    callback = encoding;
    encoding = null;
  }
  process.stdout.on("data", function onData(data) {
    // Append the data to the output stream.
    output += data;
  });
  process.stderr.on("data", function onError(data) {
    // Append the error message to the error stream.
    error += data;
  });
  process.on("exit", function onExit(status) {
    var exception;
    // `status` specifies the process exit code.
    if (status) {
      exception = new Error(error);
      exception.status = status;
    }
    callback(exception, output);
  });
  // Proxy the standard input to the process.
  process.stdin.end(input);
}

// Internal: Extracts line and block comments from a JavaScript `source`
// string. Returns an array containing the comments.
function extractComments(source) {
  var index = 0, length = source.length, results = [], symbol, position, original;
  while (index < length) {
    symbol = source[index];
    switch (symbol) {
      // Parse line and block comments.
      case "/":
        original = symbol;
        symbol = source[++index];
        switch (symbol) {
          // Extract line comments.
          case "/":
            position = source.indexOf("\n", index);
            if (position < 0) {
              // Check for CR line endings.
              position = source.indexOf("\r", index);
            }
            results.push(original + source.slice(index, index = position < 0 ? length : position));
            break;
          // Extract block comments.
          case "*":
            position = source.indexOf("*/", index);
            if (position < 0) {
              throw SyntaxError("Unterminated block comment.");
            }
            // Advance past the end of the comment.
            results.push(original + source.slice(index, index = position += 2));
            break;
          default:
            index++;
        }
        break;
      // Parse strings separately to ensure that any JavaScript comments within
      // them are preserved.
      case '"':
      case "'":
        for (position = index, original = symbol; index < length;) {
          symbol = source[++index];
          if (symbol == "\\") {
            // Skip past escaped characters.
            index++;
          } else if ("\n\r\u2028\u2029".indexOf(symbol) > -1) {
            // According to the ES 5.1 spec, strings may not contain unescaped
            // line terminators.
            throw SyntaxError("Illegal line continuation.");
          } else if (symbol == original) {
            break;
          }
        }
        if (source[index] == original) {
          index++;
          break;
        }
        throw SyntaxError("Unterminated string.");
      default:
        // Advance to the next character.
        index++;
    }
  }
  return results;
}