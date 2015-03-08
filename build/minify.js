var childProcess = require("child_process");
var path = require("path");

// The path to the Closure Compiler `.jar` file.
var closurePath = path.normalize(__dirname +
  "/../bower_components/closure-compiler/compiler.jar");

// The Closure Compiler options: enable advanced optimizations and suppress all
// warnings apart from syntax and optimization errors.
var closureOptions = [
  "--compilation_level=ADVANCED_OPTIMIZATIONS",
  "--warning_level=QUIET"
];

// Shell out to the Closure Compiler. Requires Java 7 or higher.
module.exports = function minify(src, callback) {
  var compiler = childProcess.spawn("java", ["-jar",
    closurePath].concat(closureOptions));

  var error = [], errorLength = 0;
  var output = [], outputLength = 0;

  addStdioListeners();

  function addStdioListeners() {
    compiler.stdout.on("error", onError);
    compiler.stdout.on("data", onStdoutData);

    compiler.stderr.on("error", onError);
    compiler.stderr.on("data", onStderrData);

    compiler.stdin.on("error", onError);
  }

  function removeStdioListeners() {
    compiler.stdout.removeListener("error", onError);
    compiler.stdout.removeListener("data", onStdoutData);

    compiler.stderr.removeListener("error", onError);
    compiler.stderr.removeListener("data", onStderrData);

    compiler.stdin.removeListener("error", onError);
  }

  function removeListeners() {
    compiler.removeListener("error", onError);
    compiler.removeListener("exit", onExit);
    removeStdioListeners();
  }

  compiler.on("error", onError);
  function onError(err) {
    removeListeners();
    callback(err);
  }

  function onStdoutData(data) {
    // Append the data to the output stream.
    output.push(data);
    outputLength += data.length;
  }

  function onStderrData(data) {
    // Append the error message to the error stream.
    error.push(data);
    errorLength += data.length;
  }

  compiler.on("exit", onExit);
  function onExit(status) {
    removeListeners();
    var err;
    // `status` specifies the process exit code.
    if (status) {
      err = new Error(Buffer.concat(error, errorLength));
      err.status = status;
    }
    callback(err, Buffer.concat(output, outputLength));
  }

  compiler.stdin.end(src);
};
