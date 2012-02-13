/*
 * Downloads and wraps various JSON implementations for benchmarking.
 * Requires Node.
*/

var https = require("https"), url = require("url"), path = require("path"), fs = require("fs");

// Fetches a source file.
function get(source, callback) {
  source = url.parse(source);
  https.get(source, function (response) {
    var data = "";
    response.setEncoding("utf-8");
    response.on("data", function (chunk) {
      data += chunk;
    }).on("end", function () {
      callback(null, path.basename(source.path), data);
    });
  }).on("error", callback);
}

// Creates a CommonJS module wrapper around a JSON implementation. Returns a
// callback function that can be passed to the `get` function.
function wrap(exports, callback) {
  return function (exception, name, data) {
    if (exception) {
      callback(exception);
    } else {
      fs.writeFile("vendor/" + name, data + ";" + exports + ";", callback);
    }
  };
}

// Douglas Crockford's recursive descent JSON parser.
get("https://raw.github.com/douglascrockford/JSON-js/master/json_parse.js", wrap("module.exports = json_parse", function (exception) {
  if (exception) {
    throw exception;
  }
  console.log("Downloaded `json_parse` successfully.");
}));

// Douglas Crockford's state machine parser.
get("https://raw.github.com/douglascrockford/JSON-js/master/json_parse_state.js", wrap("module.exports = json_parse", function (exception) {
  if (exception) {
    throw exception;
  }
  console.log("Downloaded `json_parser_state` successfully.");
}));

// Mike Samuel's `json-sans-eval`.
get("https://json-sans-eval.googlecode.com/svn/trunk/src/json_sans_eval.js", wrap("module.exports = jsonParse", function (exception) {
  if (exception) {
    throw exception;
  }
  console.log("Downloaded `json-sans-eval` successfully.");
}));

// Asen Bozhilov's JSON parser.
get("https://raw.github.com/abozhilov/json/master/src/json.js", wrap("module.exports = evalJSON", function (exception) {
  if (exception) {
    throw exception;
  }
  console.log("Downloaded `evalJSON` successfully.");
}));