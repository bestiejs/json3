/*! JSON v3.3.2 | https://bestiejs.github.io/json3 | Copyright 2012-2015, Kit Cambridge, Benjamin Tan | http://kit.mit-license.org */

var attempt = require("./attempt"),
    createUTCDate = require("./date"),
    createForOwn = require("./forOwn"),
    createParse = require("./parse"),
    createSerializeDate = require("./serializeDate"),
    createStringify = require("./stringify");

// Detect the `define` function exposed by asynchronous module loaders. The
// strict `define` check is necessary for compatibility with `r.js`.
var isLoader = typeof define === "function" && define.amd;

// Detect the `exports` object exposed by CommonJS implementations.
var freeExports = typeof exports == "object" && exports && !exports.nodeType && exports;

// Use the `global` object exposed by Node (including Browserify via
// `insert-module-globals`), Narwhal, and Ringo as the default context,
// and the `window` object in browsers. Rhino exports a `global` function
// instead.
var root = typeof window == "object" && window || this,
    freeGlobal = freeExports && typeof module == "object" && module && !module.nodeType && typeof global == "object" && global;

if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal)) {
  root = freeGlobal;
}

// Public: Initializes JSON 3 using the given `context` object, attaching the
// `stringify` and `parse` functions to the specified `exports` object.
function runInContext(context, exports) {
  context || (context = root.Object());
  exports || (exports = root.Object());

  // Native constructor aliases.
  var String = context.String || root.String,
      Object = context.Object || root.Object,
      Date = context.Date || root.Date,
      SyntaxError = context.SyntaxError || root.SyntaxError,
      TypeError = context.TypeError || root.TypeError,
      Math = context.Math || root.Math,
      nativeJSON = context.JSON || root.JSON;

  // Delegate to the native `stringify` and `parse` implementations.
  if (typeof nativeJSON == "object" && nativeJSON) {
    exports.stringify = nativeJSON.stringify;
    exports.parse = nativeJSON.parse;
  }

  // Convenience aliases.
  var getClass = Object.prototype.toString;

  // Internal: Determines whether the native `JSON.stringify` and `parse`
  // implementations are spec-compliant. Based on work by Ken Snyder.
  function has(name) {
    var stringify = exports.stringify, parse = exports.parse;
    if (name == "bug-string-char-index") {
      // IE <= 7 doesn't support accessing string characters using square
      // bracket notation. IE 8 only supports this for primitives.
      var isSupported = "a"[0] != "a";
      has[name] = isSupported;
      return isSupported;
    }
    if (name == "json") {
      // Indicates whether both `JSON.stringify` and `JSON.parse` are
      // supported. TODO: Remove `json-stringify`; `date-serialization`
      // checks for it implicitly.
      var isSupported = has("json-stringify") && has("date-serialization") && has("json-parse");
      has[name] = isSupported;
      return isSupported;
    }
    if (name == "extended-years") {
      // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
      var isSupported = !!attempt(function () {
        // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
        // results for certain dates in Opera >= 10.53.
        var extendedYear = new Date(-3509827334573292);
        return extendedYear.getUTCFullYear() == -109252 &&
          extendedYear.getUTCMonth() === 0 &&
          extendedYear.getUTCDate() === 1 &&
          extendedYear.getUTCHours() == 10 &&
          extendedYear.getUTCMinutes() == 37 &&
          extendedYear.getUTCSeconds() == 6 &&
          extendedYear.getUTCMilliseconds() == 708;
      });
      has[name] = isSupported;
      return isSupported;
    }
    if (name == "date-serialization") {
      // Indicates whether `Date`s can be serialized accurately by `JSON.stringify`.
      var isSupported = has("json-stringify") && has("extended-years");
      if (isSupported) {
        isSupported = !!attempt(function () {
          return (
            // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
            // serialize extended years.
            stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
            // The milliseconds are optional in ES 5, but required in 5.1.
            stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
            // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
            // four-digit years instead of six-digit years. Credits: @Yaffle.
            stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
            // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
            // values less than 1000. Credits: @Yaffle.
            stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"'
          );
        });
      }
      has[name] = isSupported;
      return isSupported;
    }
    var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
    if (name == "json-stringify") {
      // Test `JSON.stringify`.
      var isSupported = typeof stringify == "function";
      if (isSupported) {
        // A test function object with a custom `toJSON` method.
        (value = function () {
          return 1;
        }).toJSON = value;
        isSupported = !!attempt(function () {
          return (
            // Firefox 3.1b1 and b2 serialize string, number, and boolean
            // primitives as object literals.
            stringify(0) === "0" &&
            // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
            // literals.
            stringify(new Number()) === "0" &&
            stringify(new String()) == '""' &&
            // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
            // does not define a canonical JSON representation (this applies to
            // objects with `toJSON` properties as well, *unless* they are nested
            // within an object or array).
            stringify(getClass) === undefined &&
            // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
            // FF 3.1b3 pass this test.
            stringify(undefined) === undefined &&
            // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
            // respectively, if the value is omitted entirely.
            stringify() === undefined &&
            // FF 3.1b1, 2 throw an error if the given value is not a number,
            // string, array, object, Boolean, or `null` literal. This applies to
            // objects with custom `toJSON` methods as well, unless they are nested
            // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
            // methods entirely.
            stringify(value) === "1" &&
            stringify([value]) == "[1]" &&
            // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
            // `"[null]"`.
            stringify([undefined]) == "[null]" &&
            // YUI 3.0.0b1 fails to serialize `null` literals.
            stringify(null) == "null" &&
            // FF 3.1b1, 2 halts serialization if an array contains a function:
            // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
            // elides non-JSON values from objects and arrays, unless they
            // define custom `toJSON` methods.
            stringify([undefined, getClass, null]) == "[null,null,null]" &&
            // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
            // where character escape codes are expected (e.g., `\b` => `\u0008`).
            stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
            // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
            stringify(null, value) === "1" &&
            stringify([1, 2], null, 1) == "[\n 1,\n 2\n]"
          );
        });
      }
      has[name] = isSupported;
      return isSupported;
    }
    if (name == "json-parse") {
      // Test `JSON.parse`.
      var parse = parse, isSupported = typeof parse == "function";
      if (isSupported) {
        isSupported = !!attempt(function () {
          // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
          // Conforming implementations should also coerce the initial argument to
          // a string prior to parsing.
          if (parse("0") !== 0 || parse(false)) {
            return;
          }
          // Simple parsing test.
          var value = parse(serialized);
          return value["a"].length == 5 && value["a"][0] === 1;
        });
        if (isSupported) {
          isSupported = !!attempt(function () {
            // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
            return !parse('"\t"');
          });
        }
        if (isSupported) {
          isSupported = !!attempt(function () {
            // FF 4.0 and 4.0.1 allow leading `+` signs and leading
            // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
            // certain octal literals.
            return parse("01") !== 1;
          });
        }
        if (isSupported) {
          isSupported = !!attempt(function () {
            // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
            // points. These environments, along with FF 3.1b1 and 2,
            // also allow trailing commas in JSON objects and arrays.
            return parse("1.") !== 1;
          });
        }
      }
      has[name] = isSupported;
      return isSupported;
    }
    return false;
  }
  has["bug-string-char-index"] = null;
  has["extended-years"] = null;
  has["json-stringify"] = null;
  has["date-serialization"] = null; // Depends on `json-stringify`, `extended-years`.
  has["json-parse"] = null; // Depends on `json-stringify`, `json-parse`, `date-serialization`.

  if (has("json")) {
    return;
  }

  var forOwn = createForOwn(getClass, Object.prototype.hasOwnProperty);

  if (!has("json-stringify")) {
    exports.stringify = createStringify(getClass, forOwn, TypeError);
  } else if (!has("date-serialization")) {
    // For environments with `JSON.stringify` but buggy date serialization,
    // we override the native `Date#toJSON` implementation with a
    // spec-compliant one.
    var UTCDate;
    if (!has("extended-years")) {
      UTCDate = createUTCDate(Math.floor);
    }
    var serializeDate = createSerializeDate(UTCDate);
    if (has("json-stringify")) {
      // TODO: Revert via `JSON3.noConflict()`.
      Date.prototype.toJSON = function() {
        return serializeDate(this);
      };
    }
  }

  if (!has("json-parse")) {
    // Detect incomplete support for accessing string characters by index.
    var charIndexBuggy = has("bug-string-char-index");
    exports.parse = createParse(charIndexBuggy, String.fromCharCode, SyntaxError, getClass, forOwn);
  }

  exports.runInContext = runInContext;
  return exports;
}

if (freeExports && !isLoader) {
  // Export for CommonJS environments.
  runInContext(root, freeExports);
} else {
  // Export for web browsers and JavaScript engines.
  var nativeJSON = root.JSON,
      previousJSON = root.JSON3,
      isRestored = false;

  var JSON3 = runInContext(root, (root.JSON3 = {
    // Public: Restores the original value of the global `JSON` object and
    // returns a reference to the `JSON3` object.
    "noConflict": function () {
      if (!isRestored) {
        isRestored = true;
        root.JSON = nativeJSON;
        root.JSON3 = previousJSON;
        nativeJSON = previousJSON = null;
      }
      return JSON3;
    }
  }));

  root.JSON = {
    "parse": JSON3.parse,
    "stringify": JSON3.stringify
  };
}

// Export for asynchronous module loaders.
if (isLoader) {
  define(function () {
    return JSON3;
  });
}
