/*
 * Prim unit test suite.
 * Requires Node.
*/

var assert = require("assert"), _ = require("./vendor/underscore"), prim = require("../lib/prim");

// Ensures that Prim throws an exception when parsing the given JSON `source`
// string.
exports.parseError = function (source, message, options) {
  assert.throws(function () {
    prim.parse(source, options);
  }, /SyntaxError/, message);
};

// Ensure that Prim parses the given source string correctly.
exports.parses = function (expected, source, message, options) {
  assert.ok(_.isEqual(expected, prim.parse(source, options)), message);
};

exports["Test Empty Source String"] = function () {
  exports.parseError("", "Empty JSON source string");
  exports.parseError("\n\n\r\n", "Source string containing only line terminators");
  exports.parseError("/* Block Comment */", "Source string containing only a block comment", { "extensions": true });
  exports.parseError("// Line Comment", "Source string containing only a line comment", { "extensions": true });
  exports.parseError("/* Block Comment */\n// Line Comment", "Source string containing only comments and line terminators", { "extensions": true });
};

exports["Test Whitespace"] = function () {
  // The only valid JSON whitespace characters are tabs, spaces, and line
  // terminators. All other Unicode category `Z` (`Zs`, `Zl`, and `Zp`)
  // characters are invalid (note that the `Zs` category includes the
  // space character).
  ["{\u00a0}", "{\u1680}", "{\u180e}", "{\u2000}", "{\u2001}", "{\u2002}",
    "{\u2003}", "{\u2004}", "{\u2005}", "{\u2006}", "{\u2007}", "{\u2008}",
    "{\u2009}", "{\u200a}", "{\u202f}", "{\u205f}", "{\u3000}", "{\u2028}",
    "{\u2029}"].forEach(function (value) {
      exports.parseError(value, "Source string containing an invalid Unicode whitespace character");
  });

  exports.parseError("{\u000b}", "Source string containing a vertical tab");
  exports.parseError("{\u000c}", "Source string containing a form feed");
  exports.parseError("{\ufeff}", "Source string containing a byte-order mark");

  exports.parses({}, "{\r\n}", "Source string containing a CRLF line ending");
  exports.parses({}, "{\n\n\r\n}", "Source string containing multiple line terminators");
  exports.parses({}, "{\t}", "Source string containing a tab character");
  exports.parses({}, "{ }", "Source string containing a space character");
};

exports["Test Octal Values"] = function () {
  // `08` and `018` are invalid octal values.
  ["00", "01", "02", "03", "04", "05", "06", "07", "010", "011", "08", "018"].forEach(function (value) {
    exports.parseError(value, "Octal literal");
    exports.parseError("-" + value, "Negative octal literal");
    exports.parseError('"\\' + value + '"', "Octal escape sequence in a string");
    exports.parseError('"\\x' + value + '"', "Hex escape sequence in a string");
  });
};

exports["Test Numeric Literals"] = function () {
  exports.parses(100, "100", "Integer");
  exports.parses(-100, "-100", "Negative integer");
  exports.parses(10.5, "10.5", "Float");
  exports.parses(-3.141, "-3.141", "Negative float");
  exports.parses(0.625, "0.625", "Decimal");
  exports.parses(-0.03125, "-0.03125", "Negative decimal");
  exports.parses(1000, "1e3", "Exponential");
  exports.parses(100, "1e+2", "Positive exponential");
  exports.parses(-0.01, "-1e-2", "Negative exponential");
  exports.parses(3125, "0.03125e+5", "Decimalized exponential");
  exports.parses(100, "1E2", "Case-insensitive exponential delimiter");

  exports.parseError("+1", "Leading `+`");
  exports.parseError("1.", "Trailing decimal point");
  exports.parseError(".1", "Leading decimal point");
  exports.parseError("1e", "Missing exponent");
  exports.parseError("1e-", "Missing signed exponent");
  exports.parseError("--1", "Leading `--`");
  exports.parseError("1-+", "Trailing `-+`");
  exports.parseError("0xaf", "Hex literal");

  // `Infinity` and `NaN`.
  exports.parseError("Infinity", "`Infinity` with extensions disabled");
  exports.parseError("NaN", "`NaN` with extensions disabled");
  exports.parses(1 / 0, "Infinity", "`Infinity` with extensions enabled.", { "extensions": true });
  exports.parses(-1 / 0, "-Infinity", "`-Infinity` with extensions enabled.", { "extensions": true });
  exports.parses(0 / 0, "NaN", "`NaN` with extensions enabled", { "extensions": true });
  exports.parseError("-NaN", "`-NaN` with extensions enabled", { "extensions": true });
};

exports["Test String Literals"] = function () {
  exports.parses("value", '"value"', "Double-quoted string literal");
  exports.parses("", '""', "Empty string literal");
  exports.parses("\u2028", '"\\u2028"', "String containing an escaped Unicode line separator");
  exports.parses("\u2029", '"\\u2029"', "String containing an escaped Unicode paragraph separator");
  exports.parses("\ud834\udf06", '"\\ud834\\udf06"', "String containing an escaped Unicode surrogate pair");
  exports.parses("\ud834\udf06", '"\ud834\udf06"', "String containing an unescaped Unicode surrogate pair");
  exports.parses("\u0001", '"\\u0001"', "String containing an escaped ASCII control character");
  exports.parses("\b", '"\\b"', "String containing an escaped backspace");
  exports.parses("\f", '"\\f"', "String containing an escaped form feed");
  exports.parses("\n", '"\\n"', "String containing an escaped line feed");
  exports.parses("\r", '"\\r"', "String containing an escaped carriage return");
  exports.parses("\t", '"\\t"', "String containing an escaped tab");

  exports.parseError("'hello'", "Single-quoted string literal");
  exports.parseError('"\\x61"', "String containing a hex escape sequence");
  exports.parseError('"hello \r\n world"', "String containing an unescaped CRLF line ending");
  ["\u0000", "\u0001", "\u0002", "\u0003", "\u0004", "\u0005", "\u0006",
    "\u0007", "\b", "\t", "\n", "\u000b", "\f", "\r", "\u000e", "\u000f",
    "\u0010", "\u0011", "\u0012", "\u0013", "\u0014", "\u0015", "\u0016",
    "\u0017", "\u0018", "\u0019", "\u001a", "\u001b", "\u001c", "\u001d",
    "\u001e", "\u001f"].forEach(function (value) {
      exports.parseError('"' + value + '"', "String containing an unescaped ASCII control character");
  });
};

exports["Test Array Literals"] = function () {
  exports.parseError("[1, 2, 3,]", "Trailing comma in array literal");
  exports.parses([1, 2, [3, [4, 5]], 6, [true, false], [null], [[]]], "[1, 2, [3, [4, 5]], 6, [true, false], [null], [[]]]", "Nested arrays");
  exports.parses([{}], "[{}]", "Array containing empty object literal");
  exports.parses([100, true, false, null, {"a": ["hello"], "b": ["world"]}, [0.01]], "[1e2, true, false, null, {\"a\": [\"hello\"], \"b\": [\"world\"]}, [1e-2]]", "Mixed array");
  exports.parses([1, 2, 3, 4], "[1, 2, /* Block Comment */ 3, 4]// Line Comment", "Array literal with comments", { "extensions": true });
  exports.parseError("[1, 2, 3,]", "Trailing comma in array literal; extensions enabled", { "extensions": true });
};

exports["Test Object Literals"] = function () {
  exports.parses({"hello": "world"}, "{\"hello\": \"world\"}", "Object literal containing one member");
  exports.parses({"hello": "world", "foo": ["bar", true], "fox": {"quick": true, "purple": false}}, "{\"hello\": \"world\", \"foo\": [\"bar\", true], \"fox\": {\"quick\": true, \"purple\": false}}", "Object literal containing multiple members");

  exports.parseError("{key: 1}", "Unquoted identifier used as a property name; extensions disabled");
  exports.parseError("{key: 1}", "Unquoted identifier used as a property name; extensions enabled", { "extensions": true });

  exports.parseError("{false: 1}", "`false` used as a property name; extensions disabled");
  exports.parseError("{false: 1}", "`false` used as a property name; extensions enabled", { "extensions": true });

  exports.parseError("{true: 1}", "`true` used as a property name; extensions disabled");
  exports.parseError("{true: 1}", "`true` used as a property name; extensions enabled", { "extensions": true });

  exports.parseError("{null: 1}", "`null` used as a property name; extensions disabled");
  exports.parseError("{null: 1}", "`null` used as a property name; extensions enabled", { "extensions": true });

  exports.parseError("{'key': 1}", "Single-quoted string used as a property name");

  exports.parseError("{1: 2, 3: 4}", "Numeric keys; extensions disabled");
  exports.parseError("{1: 2, 3: 4}", "Numeric keys; extensions enabled", { "extensions": true });

  exports.parseError("{\"hello\": \"world\", \"foo\": \"bar\",}", "Trailing comma in object literal");
  exports.parseError("{\"hello\": \"world\", \"foo\": \"bar\", 1: 2, 3: 4,}", "Trailing comma in object literal; extensions enabled", { "extensions": true });
};

// JavaScript expressions should never be evaluated, as Prim does not use
// `eval`.
exports["Test Invalid Expressions"] = function () {
  ["1 + 1", "1 * 2", "var value = 123;", "{});value = 123;({}", "call()", "1, 2, 3, \"value\""].forEach(function (expression) {
    exports.parseError(expression, "Source string containing a JavaScript expression");
  });
};

exports["Test Callback Function"] = function () {
  assert.ok(_.isEqual({"a": 1, "b": 16}, prim.parse('{"a": 1, "b": "10000"}', null, function (key, value) {
    return typeof value == "string" ? parseInt(value, 2) : value;
  })), "Callback function provided");
};

// Run the unit tests.
if (module == require.main) {
  Object.keys(exports).forEach(function (value) {
    if (!value.lastIndexOf("Test", 0)) {
      console.log("Running test `%s`...", value);
      process.nextTick(exports[value]);
    }
  });
}