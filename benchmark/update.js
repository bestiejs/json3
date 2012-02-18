/*
 * Downloads and wraps various JSON implementations for benchmarking.
 * Requires Node.
*/

var https = require("https"), url = require("url"), path = require("path"), fs = require("fs");

// Fetches a source file via HTTPS.
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

// Douglas Crockford's recursive descent JSON parser.
get("https://raw.github.com/douglascrockford/JSON-js/master/json_parse.js", function (exception, name, data) {
  if (exception) {
    throw exception;
  }
  fs.writeFile("vendor/" + name, data + ";module.exports = json_parse;", function (exception) {
    if (exception) {
      throw exception;
    }
    console.log("Downloaded Crockford's `json_parse` successfully.");
  });
});

// Douglas Crockford's state machine parser.
get("https://raw.github.com/douglascrockford/JSON-js/master/json_parse_state.js", function (exception, name, data) {
  if (exception) {
    throw exception;
  }
  fs.writeFile("vendor/" + name, data + ";module.exports = json_parse;", function (exception) {
    if (exception) {
      throw exception;
    }
    console.log("Downloaded Crockford's `json_parse_state` successfully.");
  });
});

// Douglas Crockford's `eval`-based `json2` parser.
get("https://raw.github.com/douglascrockford/JSON-js/master/json2.js", function (exception, name, data) {
  if (exception) {
    throw exception;
  }
  fs.writeFile("vendor/" + name, "var JSON = null;" + data + ";module.exports = JSON;", function (exception) {
    if (exception) {
      throw exception;
    }
    console.log("Downloaded Crockford's `json2` successfully.");
  });
});

// Mike Samuel's `json-sans-eval`.
get("https://json-sans-eval.googlecode.com/svn/trunk/src/json_sans_eval.js", function (exception, name, data) {
  if (exception) {
    throw exception;
  }
  fs.writeFile("vendor/" + name, data + ";module.exports = jsonParse;", function (exception) {
    if (exception) {
      throw exception;
    }
    console.log("Downloaded Samuel's `json-sans-eval` successfully.");
  });
});

// Asen Bozhilov's JSON parser.
get("https://raw.github.com/abozhilov/json/master/src/json.js", function (exception, name, data) {
  if (exception) {
    throw exception;
  }
  fs.writeFile("vendor/" + name, data + ";module.exports = evalJSON;", function (exception) {
    if (exception) {
      throw exception;
    }
    console.log("Downloaded Bozhilov's `evalJSON` successfully.");
  });
});