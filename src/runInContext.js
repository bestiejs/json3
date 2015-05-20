var makeHas = require("./has");
var makeForOwn = require("./forOwn");
var makeParse = require("./parse");
var makeSerializeDate = require("./serializeDate");
var makeStringify = require("./stringify");

module.exports = makeRunInContext;
function makeRunInContext(root) {
  // Public: Initializes JSON 3 using the given `context` object, attaching the
  // `stringify` and `parse` functions to the specified `exports` object. If
  // `preventNoConflict` is `true`, the exported `noConflict` function will be
  // a no-op.
  function runInContext(context, exports, preventNoConflict) {
    context || (context = root.Object());
    exports || (exports = root.Object());

    // Native constructor aliases.
    var String = context.String || root.String,
        Object = context.Object || root.Object,
        Date = context.Date || root.Date,
        SyntaxError = context.SyntaxError || root.SyntaxError,
        TypeError = context.TypeError || root.TypeError,
        Math = context.Math || root.Math,
        nativeJSON = context.JSON || root.JSON,
        prevJSON3 = context.JSON3 || root.JSON3;

    // Delegate to the native `stringify` and `parse` implementations.
    if (typeof nativeJSON == "object" && nativeJSON) {
      exports.stringify = nativeJSON.stringify;
      exports.parse = nativeJSON.parse;
    }

    // Convenience aliases.
    var getClass = Object.prototype.toString;

    var has = makeHas(exports.stringify, exports.parse, Date, Number, String);
    if (!has("json")) {
      var hasOwnProp = Object.prototype.hasOwnProperty;
      var forOwn = makeForOwn(getClass, hasOwnProp);

      if (!has("json-stringify")) {
        exports.stringify = makeStringify(getClass, forOwn, TypeError);
      }

      var needsDateToJSON = !has("date-serialization");
      var prevDateToJSON;
      if (needsDateToJSON) {
        var hasExtendedYears = has("extended-years");
        var serializeDate = makeSerializeDate(hasExtendedYears, Math.floor);
        prevDateToJSON = Date.prototype.toJSON;
        Date.prototype.toJSON = function() {
          return serializeDate(this);
        };
      }

      if (!has("json-parse")) {
        // Detect incomplete support for accessing string characters by index.
        var charIndexBuggy = has("bug-string-char-index");
        exports.parse = makeParse(charIndexBuggy, String.fromCharCode, SyntaxError, getClass, forOwn);
      }
    }

    // Public: Restores the original value of the global `JSON` object and
    // returns a reference to the `JSON3` object.
    exports.noConflict = noConflict;
    function noConflict() {
      if (!preventNoConflict) {
        preventNoConflict = true;
        root.JSON = nativeJSON;
        root.JSON3 = prevJSON3;
        if (needsDateToJSON) {
          Date.prototype.toJSON = prevDateToJSON;
        }
      }
      return exports;
    }

    exports.runInContext = runInContext;
    return exports;
  }
  return runInContext;
}
