/*
 * Prim benchmark suite.
 * Requires Node.
*/

var prim = require("../lib/prim").parse, Benchmark = require("./vendor/benchmark"),

// Load the various JSON implementations.
// --------------------------------------

// Crockford's recursive descent parser.
json_parse = require("./vendor/json_parse"),

// Crockford's state machine parser.
json_parse_state = require("./vendor/json_parse_state"),

// Crockford's `eval`-based `json2` parser.
json2 = require("./vendor/json2").parse,

// Bozhilov's JSON parser.
evalJSON = require("./vendor/json"),

// Samuel's `json-sans-eval`.
jsonParse = require("./vendor/json_sans_eval"),

suite = new Benchmark.Suite("Prim Benchmark Suite");

suite.add("Prim", function () {
  prim('{"a": [1, 2, {"b": 3, "c": 4}], "d": 123, "e": "hello"}');
});

suite.add("Crockford's recursive descent parser", function () {
  json_parse('{"a": [1, 2, {"b": 3, "c": 4}], "d": 123, "e": "hello"}');
});

suite.add("Crockford's state machine parser", function () {
  json_parse_state('{"a": [1, 2, {"b": 3, "c": 4}], "d": 123, "e": "hello"}');
});

suite.add("Crockford's `json2`", function () {
  json2('{"a": [1, 2, {"b": 3, "c": 4}], "d": 123, "e": "hello"}');
});

suite.add("Bozhilov's JSON parser", function () {
  evalJSON('{"a": [1, 2, {"b": 3, "c": 4}], "d": 123, "e": "hello"}');
});

suite.add("Samuel's `json-sans-eval`", function () {
  jsonParse('{"a": [1, 2, {"b": 3, "c": 4}], "d": 123, "e": "hello"}');
});

suite.add("Native `JSON.parse`", function () {
  JSON.parse('{"a": [1, 2, {"b": 3, "c": 4}], "d": 123, "e": "hello"}');
});

// Register event handlers for logging results.
suite.on("cycle", function (event, results) {
  console.log(String(results));
}).on("complete", function () {
  var results = this.filter("successful"), fastest = results.filter("fastest"), slowest = results.filter("slowest");
  results.forEach(function (result) {
    var percent, hz = result.hz, text;
    if (fastest.indexOf(result) > -1) {
      console.log("Fastest: `%s`.", result.name);
    } else if (slowest.indexOf(result) > -1) {
      console.log("Slowest: `%s`.%s", result.name, isFinite(hz) ? " " + Math.round((1 - hz / fastest[0].hz) * 100) + "% slower." : "");
    }
  });
});

suite.run({ "async": true });