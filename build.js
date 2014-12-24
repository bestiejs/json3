#!/usr/bin/env node

/* JSON 3 Builder | https://bestiejs.github.io/json3 */
var fs = require("fs"),
    https = require("https"),
    path = require("path"),
    spawn = require("child_process").spawn,
    url = require("url"),
    util = require("util"),
    zlib = require("zlib");

var vendorPath = path.join(__dirname, "vendor"),
    highlightAuto = require(path.join(vendorPath, "highlight")).highlightAuto,
    marked = require(path.join(vendorPath, "marked")),
    package = require(path.join(__dirname, "package.json")),
    tar = require(path.join(vendorPath, "tar"));

// The path to the Closure Compiler `.jar` file and ETag.
var closurePath = path.join(vendorPath, "closure-compiler.jar"),
    closureETag = path.join(vendorPath, "closure-compiler-etag.txt");

// The path to the project page template.
var pageTemplatePath = path.join(path.join(__dirname, "page", "page.html"));

var indexPageSrc = path.join(__dirname, "README.md"),
    contribPageSrc = path.join(__dirname, "CONTRIBUTING.md"),
    relPageSrc = path.join(__dirname, "CHANGELOG.md");

var indexPageDest = path.join(__dirname, "index.html"),
    contribPageDest = path.join(__dirname, "contribute.html"),
    relPageDest = path.join(__dirname, "changes.html");

// The Closure Compiler options: enable advanced optimizations and suppress all
// warnings apart from syntax and optimization errors.
var closureOptions = ["--compilation_level=ADVANCED_OPTIMIZATIONS", "--warning_level=QUIET"];

// A RegExp used to detect the `define` pragma used by asynchronous module
// loaders.
var definePattern = RegExp('(?:' +
  // `typeof define == "function"`. Matches `==` and `===`; `'` and `"`.
  'typeof\\s+define\\s*===?\\s*([\'"])function\\1|' +
  // `"function" == typeof define`. Same rules as above.
  '([\'"])function\\2\\s*===?\\s*typeof\\s+define' +
')' +
// `&&`.
'\\s*&&\\s*(?:' +
  // `!!` (optional Boolean coercion)
  '(?:!!)?' +
  // `define`.
  'define\\s*(?:' +
    // `.amd`.
    '\\.\\s*amd|' +
    // `["amd"]` | `['amd']`.
    '\\[\\s*([\'"])amd\\3\\s*\\]' +
  ')|' +
  '(?:' +
    '(?:' +
      // `typeof define.amd`.
      'typeof\\s+define\\.\\s*amd|' +
      // `typeof define["amd"]` or `typeof define['amd']`.
      'typeof\\s+define\\[\\s*([\'"])amd\\4\\s*\\]' +
    ')' +
    // `=== "object"`. Same rules for quotes and equality operators.
    '\\s*===?\\s*([\'"])object\\5' +
  '|' +
    // `"object" ===`.
    '([\'"])object\\6\\s*===?\\s*' +
    '(?:' +
      'typeof\\s+define\\.\\s*amd|' +
      'typeof\\s+define\\[\\s*([\'"])amd\\7\\s*\\]' +
    ')' +
  ')' +
  '(?:' +
    // `&&` (optional Boolean test for `define.amd`).
    '\\s*&&\\s*' +
    '(?:' +
      // `!!` (optional Boolean coercion)
      '(?:!!)?' +
      // `define.amd`.
      'define\\.\\s*amd|' +
      // `define["amd"] | define['amd']`.
      'define\\[\\s*([\'"])amd\\8\\s*\\]' +
    ')' +
  ')?' +
')', 'g');

function PageRenderer(options) {
  marked.Renderer.call(this);
  if (options) {
    this.issueFormatters = options.issueFormatters;
    this.imgClasses = options.imgClasses;
    this.linkClasses = options.linkClasses;
  }
}

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

marked.setOptions({
  "smartypants": true,
  "highlight": function highlight(source) {
    return highlightAuto(source).value;
  }
});

// Shim `Buffer.concat` for Node.js 0.6
if (!Buffer.concat) {
  Buffer.concat = function(list, length) {
    if (list.length === 0) {
      return new Buffer(0);
    } else if (list.length === 1) {
      return list[0];
    }

    var buffer = new Buffer(length);
    var pos = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      buf.copy(buffer, pos);
      pos += buf.length;
    }

    return buffer;
  };
}

main();

function main() {
  genIndex();
  genContrib();
  genRel();
  minify();
}

function genIndex() {
  var r = new PageRenderer({
    imgClasses: { "logo.png": "logo" },
    linkClasses: { "travis-ci.org": "travis-ci" }
  });
  genPage("JSON 3", indexPageDest, indexPageSrc,
    { "renderer": r }, function afterGen(err) {
    console.log(err || "GitHub project page generated successfully.");
  });
}

function genContrib() {
  var r = new PageRenderer();
  genPage("Contribute | JSON 3", contribPageDest, contribPageSrc,
    { "renderer": r }, function afterGen(err) {

    console.log(err || "Contributing page generated successfully.");
  });
}

function genRel() {
  var r = new PageRenderer({
    issueFormatters: {
      issue: function formatIssue(id) {
        return "https://github.com/bestiejs/json3/issues/" + id;
      },
      pr: function formatPR(id) {
        return "https://github.com/bestiejs/json3/pull/" + id;
      }
    }
  });
  genPage("Releases | JSON 3", relPageDest, relPageSrc,
    {"renderer": r }, function afterGen(err) {

    console.log(err || "Change log generated successfully.");
  });
}

// Compress JSON 3 using the Closure Compiler.
function minify() {
  getCompiler(function hasCompiler(error) {
    if (error) {
      console.log(error);
      return;
    }

    fs.readFile(path.join(__dirname, "lib", "json3.js"), "utf8", function readSource(error, source) {
      if (error) {
        console.log(error);
        return;
      }

      console.log("Development version size: %d KB.", Math.round(Buffer.byteLength(source) / 1024 * 100) / 100);
      // Shell out to the Closure Compiler. Requires Java 7 or higher.
      var error = [], errorLength = 0;
      var output = [], outputLength = 0;
      var compiler = spawn("java", ["-jar", closurePath].concat(closureOptions));
      compiler.stdout.on("data", function onData(data) {
        // Append the data to the output stream.
        output.push(data);
        outputLength += data.length;
      });
      compiler.stderr.on("data", function onError(data) {
        // Append the error message to the error stream.
        error.push(data);
        errorLength += data.length;
      });
      compiler.on("exit", function onExit(status) {
        var exception;
        // `status` specifies the process exit code.
        if (status) {
          exception = new Error(Buffer.concat(error, errorLength));
          exception.status = status;
        }
        compressSource(exception, '' + Buffer.concat(output, outputLength));
      });
      // Proxy the preprocessed source to the Closure Compiler.
      compiler.stdin.end(preprocessSource(source));

      // Post-processes the compressed source and writes the result to disk.
      function compressSource(exception, compressed) {
        if (exception) {
          console.log(exception);
        } else {
          // Extract the JSON 3 header and clean up the minified source.
          compressed = extractComments(source)[0] + '\n' + postprocessSource(compressed);
          // Write the compressed version to disk.
          fs.writeFile(path.join(__dirname, "lib", "json3.min.js"), compressed, writeSource);
        }
        // Checks the `gzip`-ped size of the compressed version.
        function writeSource(exception) {
          console.log(exception || "Compressed version generated successfully.");
          zlib.gzip(compressed, function (exception, results) {
            console.log("Compressed version size: %d KB.", Math.round(results.length / 1024 * 100) / 100);
          });
        }
      }
    });
  });
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

function preprocessSource(source) {
  return source.replace(definePattern, 'typeof define === "function" && define["amd"]');
}

function postprocessSource(source) {
  // Shift variables in the global scope into the IIFE and fix the
  // `define` pragma.
  var result = source.replace(/^(var [^;]*;)\s*(\(function\([^)]*\)\{)/m, '\n;$2$1');
  return result.replace(definePattern, 'typeof define==="function"&&define.amd');
}

// Internal: Lazily downloads the Closure Compiler.
function getCompiler(callback) {
  var hasCompiler = false,
      isFinalized = false,
      eTag;

  var prePending = 2,
      preDone = false;

  var postPending = 1,
      postDone = false;

  // Step one: determine if the Closure Compiler has already been downloaded.
  fs.stat(closurePath, function getStats(error, stats) {
    if (error) {
      if (error.code != "ENOENT") {
        return updatePre(error);
      }
      return updatePre();
    }
    if (!stats.isFile()) {
      return updatePre(new Error(util.format("`%s` must be a file.", closurePath)));
    }
    hasCompiler = true;
    console.log('The Closure Compiler has already been downloaded.');
    updatePre();
  });

  // Step two: Retrieve the locally-cached `ETag` from the previous download.
  fs.readFile(closureETag, "utf8", function readETag(error, source) {
    if (error) {
      if (error.code != "ENOENT") {
        return updatePre(error);
      }
      return updatePre();
    }
    eTag = source;
    updatePre();
  });

  // Step three: download the Closure Compiler.
  function download() {
    var headers = {
      "user-agent": util.format("JSON/%s", package.version)
    };
    if (eTag && hasCompiler) {
      headers["if-none-match"] = eTag;
    }
    var request = https.request({
      "hostname": "dl.google.com",
      "port": 443,
      "path": "/closure-compiler/compiler-latest.tar.gz",
      "headers": headers,
      "agent": false // Disable keep-alive.
    });

    request.on("response", onResponse);
    function onResponse(response) {
      request.removeListener("response", onResponse);
      request.removeListener("error", onError);

      if (response.statusCode == 304) {
        // If the cached `ETag` matches that of the entity, there is no
        // need to download the Compiler tarball or extract the `.jar`.
        // Skip all post-processing steps.
        console.log('No updates available.');
        return finalize();
      }

      // Step four: write the new `ETag` to disk.
      var eTag = response.headers.etag;
      saveETag(eTag);

      // Step five: extract the Compiler `.jar` from the downloaded
      // tarball using `node-tar`'s streaming `.tar` parser.
      var parser = new tar.Parse();

      parser.on("entry", onEntry);
      function onEntry(entry) {
        if (path.basename(entry.path) != "compiler.jar") {
          return;
        }
        parser.removeListener("entry", onEntry);

        // Step six: write the Compiler to disk.
        console.log('Extracting the Closure Compiler...');
        var writeStream = fs.createWriteStream(closurePath);

        writeStream.on("close", onClose);
        function onClose() {
          writeStream.removeListener("close", onClose);
          writeStream.removeListener("error", onError);
          // The Compiler has been successfully downloaded.
          hasCompiler = true;
          updatePost();
        }

        writeStream.on("error", onError);
        function onError(error) {
          writeStream.removeListener("close", onClose);
          writeStream.removeListener("error", onError);
          updatePost(error);
        }

        entry.pipe(writeStream);
      }

      parser.on("error", onError);
      function onError(error) {
        parser.removeListener("entry", onEntry);
        parser.removeListener("error", onError);
        parser.removeListener("end", onEnd);
        updatePost(error);
      }

      // Clean up attached event handlers.
      parser.on("end", onEnd);
      function onEnd() {
        parser.removeListener("entry", onEntry);
        parser.removeListener("error", onError);
        parser.removeListener("end", onEnd);
      }

      // Begin downloading the Compiler tarball.
      console.log('Downloading the Closure Compiler...');
      response.pipe(zlib.createGunzip()).pipe(parser);
    }

    request.on("error", onError);
    function onError(error) {
      request.removeListener("response", onResponse);
      request.removeListener("error", onError);
      // Connection errors are not fatal, as it is possible to use the
      // previously-downloaded copy of Closure Compiler. If a cached copy
      // is not available, the `hasCompiler` flag will be set to `false`,
      // and `finalize` will yield an error to the `callback`.
      console.log('A new version of the Closure Compiler could not be downloaded.');
      updatePost();
    }

    console.log('Updating the Closure Compiler...');
    request.end();
  }

  function finalize(error) {
    if (isFinalized) {
      return;
    }
    isFinalized = true;
    if (error) {
      return callback(error);
    }
    if (!hasCompiler) {
      return callback(new Error("The Closure Compiler is required to build JSON 3."));
    }
    callback();
  }

  function saveETag(eTag) {
    postPending++;
    fs.writeFile(closureETag, eTag, function writeETag(error) {
      if (error) {
        // This error is not fatal. If the write fails, the Compiler will be
        // downloaded again when `getCompiler` is called.
        console.log("The Closure Compiler `ETag` could not be written to disk.");
      }
      updatePost();
    });
  }

  function updatePre(error) {
    if (preDone) {
      return;
    }
    if (error) {
      preDone = true;
      return finalize(error);
    }
    prePending--;
    if (!prePending) {
      preDone = true;
      download();
    }
  }

  function updatePost(error) {
    if (postDone) {
      return;
    }
    if (error) {
      postDone = true;
      return finalize(error);
    }
    postPending--;
    if (!postPending) {
      postDone = true;
      finalize();
    }
  }
}

// Generates the navigation section for a Markdown document.
// Ported from `mdtoc.rb` by Sam Stephenson.
function genNav(source) {
  var headers = [];
  var lines = source.split(/\r?\n/);
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
  var lastSection, lastLevel;
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
  var navigation = headers.map(function (value) {
    var index = value[0], level = value[1], text = value[2], section = value[3], name = section.join(".");
    return "<li><a href=\"#section_" + name + "\">" + text + "</a></li>";
  });
  navigation.push("");
  return {
    "navigation": navigation,
    "lines": lines
  };
}

function buildPage(title, template, src, options) {
  var parts = genNav(src);
  return template.replace(/<%=\s*(.+?)\s*%>/g, function interpolate(match, section) {
    if (section == "title") {
      return title;
    }
    if (section == "navigation") {
      // Insert the table of contents directly into the template.
      return parts.navigation.join("\n");
    }
    if (section == "source") {
      // Convert the page to HTML and insert it into the body.
      return marked(parts.lines.join("\n"), options);
    }
    return "";
  });
}

// Generates a GitHub project page using the template.
function genPage(title, destPath, srcPath, options, callback) {
  var pendingReads = 2;
  var contents = { "src": null, "tmpl": null };
  function afterRead(err, content, prop) {
    if (pendingReads === 0) {
      return;
    }
    if (err) {
      pendingReads = 0;
      callback(err);
      return;
    }
    pendingReads--;
    contents[prop] = content;
    if (pendingReads > 0) {
      return;
    }
    // Interpolate the page template.
    var page = buildPage(title, contents.tmpl, contents.src, options);
    // Write the page to disk.
    fs.writeFile(destPath, page, callback);
  }
  fs.readFile(srcPath, "utf8", function afterReadSrc(err, src) {
    afterRead(err, src, "src");
  });
  fs.readFile(pageTemplatePath, "utf8",
    function afterReadTemplate(err, template) {

    afterRead(err, template, "tmpl");
  });
}
