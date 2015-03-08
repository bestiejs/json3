#!/usr/bin/env node

/* JSON 3 Builder | https://bestiejs.github.io/json3 */
var fs = require("fs");
var path = require("path");
var zlib = require("zlib");

var async = require("async");
var webpack = require("webpack");

var genPage = require("./build/genPage");
var minify = require("./build/minify");
var package = require("./package.json");
var PageRenderer = require("./build/renderer");
var pp = require("./build/pp");
var WrapperPlugin = require("./build/wrapper");

function main() {
  async.auto({
    pages: function pages(callback) {
      writePages([{
        "title": "JSON 3",
        "src": path.join(__dirname, "README.md"),
        "dest": path.join(__dirname, "index.html"),
        "markedOptions": {
          "renderer": new PageRenderer({
            "imgClasses": { "logo.png": "logo" },
            "linkClasses": { "travis-ci.org": "travis-ci" }
          })
        }
      }, {
        "title": "Contribute | JSON 3",
        "src": path.join(__dirname, "CONTRIBUTING.md"),
        "dest": path.join(__dirname, "contribute.html"),
        "markedOptions": {
          "renderer": new PageRenderer()
        }
      }, {
        "title": "Releases | JSON 3",
        "src": path.join(__dirname, "CHANGELOG.md"),
        "dest": path.join(__dirname, "changes.html"),
        "markedOptions": {
          "renderer": new PageRenderer({
            "issueFormatters": {
              "issue": function formatIssue(id) {
                return "https://github.com/bestiejs/json3/issues/" + id;
              },
              "pr": function formatPR(id) {
                return "https://github.com/bestiejs/json3/pull/" + id;
              }
            }
          })
        }
      }], callback);
    },

    build: function build(callback) {
      var compiler = webpack({
        context: path.join(__dirname, "src"),
        entry: {
          json3: "./runInContext.js",
        },
        output: {
          path: path.join(__dirname, "lib"),
          filename: "[name].js"
        },
        module: {
          loaders: []
        },
        resolve: {
          modulesDirectories: []
        },
        bail: true,
        node: {
          console: false,
          global: false,
          process: false,
          Buffer: false,
          __filename: false,
          __dirname: false
        }
      });
      compiler.plugin("compilation", function gotCompilation(compilation) {
        compilation.apply(new WrapperPlugin(package.version));
      });
      compiler.run(function afterRun(err, stats) {
        if (err) {
          console.error("Error building JSON 3: %s", err);
          callback(err);
        }
        console.log(stats.toString());
        callback();
      });
    },

    compress: ["build", function compress(callback) {
      var srcPath = path.join(__dirname, "lib", "json3.js");
      var destPath = path.join(__dirname, "lib", "json3.min.js");
      writeMinified(srcPath, destPath, function afterMinify(err, fileSizes) {
        if (err) {
          console.error("Error compressing JSON 3: %s", err);
          return;
        }
        console.log("Development size: %d KB; compressed size: %d KB",
          fileSizes.src, fileSizes.dest);
      });
    }]
  }, function afterBuild(err) {
    if (err) {
      process.exit(1);
      return;
    }
    process.exit(0);
  });
}

function writePages(pages, callback) {
  async.each(pages, function eachPage(page, callback) {
    genPage(page.title, page.dest, page.src, page.markedOptions, afterGen);
    function afterGen(err) {
      if (err) {
        console.log("Error generating project page %j: %s", page.title, err);
        callback(err);
        return;
      }
      console.log("Project page %j generated successfully.", page.title);
      callback();
    }
  });
}

// Compress JSON 3 using the Closure Compiler.
function writeMinified(srcPath, destPath, callback) {
  var fileSizes = {
    "src": 0,
    "dest": 0
  };
  var header, minSrc;
  fs.readFile(srcPath, afterRead);
  function afterRead(err, srcBytes) {
    if (err) {
      callback(err);
      return;
    }
    fileSizes.src = getKilobytes(srcBytes.length);
    var src = srcBytes.toString("utf8");
    // Extract the JSON 3 header.
    header = pp.extractComments(src)[0];
    minify(pp.preprocessSource(src), afterMinify);
  }
  function afterMinify(err, minSrcBytes) {
    if (err) {
      callback(err);
      return;
    }
    // Post-process the compressed source.
    minSrc = new Buffer([
      header,
      pp.postprocessSource(minSrcBytes.toString("utf8"))
    ].join("\n"));
    async.each([
      // Write the compressed version to disk.
      function write(callback) {
        fs.writeFile(destPath, minSrc, callback);
      },
      // Calculate the `gzip`-ped size of the compressed version.
      function gzipSize(callback) {
        zlib.gzip(minSrc, function afterGzip(err, results) {
          if (!err) {
            fileSizes.dest = getKilobytes(results.length);
          }
          callback();
        });
      }
    ], function eachFunc(func, callback) {
      func(callback);
    }, function afterFinish(err) {
      if (err) {
        callback(err);
        return;
      }
      callback(null, fileSizes);
    });
  }
}

function getKilobytes(byteLength) {
  return Math.round(byteLength / 1024 * 100) / 100;
}

main();
