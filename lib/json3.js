/*! JSON v3.3.2 | https://bestiejs.github.io/json3 | Copyright 2012-2015, Kit Cambridge, Benjamin Tan | http://kit.mit-license.org */
;(function () {
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

  var runInContext = (
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var attempt = __webpack_require__(1),
	    createUTCDate = __webpack_require__(2),
	    createForOwn = __webpack_require__(3),
	    createParse = __webpack_require__(4),
	    createSerializeDate = __webpack_require__(5),
	    createStringify = __webpack_require__(6);

	module.exports = makeRunInContext;
	function makeRunInContext(root) {
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
	  return runInContext;
	}


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	// Internal: Contains `try...catch` logic used by other functions.
	// This prevents other functions from being deoptimized.
	module.exports = attempt;
	function attempt(func) {
	  try {
	    return func();
	  } catch (exception) {}
	}


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	// An associative array where the index is the month of the year (as
	// reported by `Date#getUTCMonth`; e.g., 0 = January, 1 = February,
	// etc) and the value is the number of days between January 1st and
	// the first of the respective month.
	var daysByMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

	// getDay returns the number of days between the Unix epoch and the
	// first day of the given month.
	function getDay(floor, year, month) {
	  return daysByMonth[month] + 365 * (year - 1970) +
	    floor((year - 1969 + (month = +(month > 1))) / 4) -
	    floor((year - 1901 + month) / 100) +
	    floor((year - 1601 + month) / 400);
	}

	module.exports = createUTCDate;
	function createUTCDate(floor) {
	  // UTCDate decomposes a `Date` value and exposes a subset of the
	  // `Date` API. This is used to obtain the year, month, date, hours,
	  // minutes, seconds, and milliseconds if the `getUTC*` methods are
	  // buggy. Adapted from @Yaffle's `date-shim` project.
	  function UTCDate(value) {
	    var date = floor(value / 864e5);
	    this.date = date;

	    var year = floor(date / 365.2425) + 1970 - 1;
	    while (getDay(floor, year + 1, 0) <= date) {
	      year++;
	    }
	    this.year = year;

	    var month = floor((date - getDay(floor, year, 0)) / 30.42);
	    while (getDay(floor, year, month + 1) <= date) {
	      month++;
	    }
	    this.month = month;

	    // The `time` value specifies the time within the day (see ES
	    // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
	    // to compute `A modulo B`, as the `%` operator does not
	    // correspond to the `modulo` operation for negative numbers.
	    this.time = (value % 864e5 + 864e5) % 864e5;
	  }

	  UTCDate.prototype.date = 0;
	  UTCDate.prototype.year = 0;
	  UTCDate.prototype.month = 0;
	  UTCDate.prototype.time = 0;

	  UTCDate.prototype.getUTCFullYear = function() {
	    return this.year;
	  };

	  UTCDate.prototype.getUTCMonth = function() {
	    return this.month;
	  };

	  UTCDate.prototype.getUTCDate = function() {
	    return 1 + this.date - getDay(floor, this.year, this.month);
	  };

	  // The hours, minutes, seconds, and milliseconds are obtained by
	  // decomposing the time within the day. See section 15.9.1.10.
	  UTCDate.prototype.getUTCHours = function() {
	    return floor(this.time / 36e5) % 24;
	  };

	  UTCDate.prototype.getUTCMinutes = function() {
	    return floor(this.time / 6e4) % 60;
	  };

	  UTCDate.prototype.getUTCSeconds = function() {
	    return floor(this.time / 1e3) % 60;
	  };

	  UTCDate.prototype.getUTCMilliseconds = function() {
	    return this.time % 1e3;
	  };

	  return UTCDate;
	}


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var hasDontEnumBug = __webpack_require__(7);

	// A list of non-enumerable properties inherited from `Object.prototype`.
	var dontEnums = ["valueOf", "toString", "toLocaleString",
	  "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];

	module.exports = createForOwn;
	function createForOwn(getClass, isProperty) {
	  // Internal: Normalizes the `for...in` iteration algorithm across
	  // environments. Each enumerated key is yielded to a `callback` function.
	  var forOwn;
	  if (hasDontEnumBug(isProperty)) {
	    // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
	    // properties.
	    forOwn = function forOwn(object, callback) {
	      var isFunction = getClass.call(object) == "[object Function]", property, length;
	      var hasProperty = isProperty;
	      if (!isFunction && typeof object.constructor != "function" && (typeof object.hasOwnProperty == "function" || typeof object.hasOwnProperty == "object" && object.hasOwnProperty)) {
	        hasProperty = object.hasOwnProperty;
	      }
	      for (property in object) {
	        // Gecko <= 1.0 enumerates the `prototype` property of functions under
	        // certain conditions; IE does not.
	        if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
	          callback(property);
	        }
	      }
	      // Manually invoke the callback for each non-enumerable property.
	      for (length = dontEnums.length; property = dontEnums[--length]; hasProperty.call(object, property) && callback(property));
	    };
	  } else {
	    // No bugs detected; use the standard `for...in` algorithm.
	    forOwn = function forOwn(object, callback) {
	      var isFunction = getClass.call(object) == "[object Function]", property, isConstructor;
	      for (property in object) {
	        if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
	          callback(property);
	        }
	      }
	      // Manually invoke the callback for the `constructor` property due to
	      // cross-environment inconsistencies.
	      if (isConstructor || isProperty.call(object, (property = "constructor"))) {
	        callback(property);
	      }
	    };
	  }
	  return forOwn;
	}


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = createParse;
	function createParse(charIndexBuggy, fromCharCode, newSyntaxError, getClass, forOwn) {
	  // Public: `JSON.parse` parses a JSON source string. See
	  // ES 5.1 section 15.12.2.
	  function parse(source, callback) {
	    Index = 0;
	    Source = "" + source;
	    var firstToken = lex(charIndexBuggy, fromCharCode, newSyntaxError);
	    var result = get(charIndexBuggy, fromCharCode, newSyntaxError, firstToken);
	    // If a JSON string contains multiple tokens, it is invalid.
	    if (lex(charIndexBuggy, fromCharCode, newSyntaxError) != "$") {
	      abort(newSyntaxError);
	    }
	    // Reset the parser state.
	    Index = Source = null;
	    if (callback && getClass.call(callback) == "[object Function]") {
	      var value = {};
	      value[""] = result;
	      return walk(getClass, forOwn, value, "", callback);
	    }
	    return result;
	  }
	  return parse;
	}

	// Internal: A map of escaped control characters and their unescaped
	// equivalents.
	var Unescapes = {
	  92: "\\",
	  34: '"',
	  47: "/",
	  98: "\b",
	  116: "\t",
	  110: "\n",
	  102: "\f",
	  114: "\r"
	};

	// Internal: Stores the parser state.
	var Index, Source;

	// Internal: Resets the parser state and throws a `newSyntaxError`.
	function abort(newSyntaxError) {
	  Index = Source = null;
	  throw newSyntaxError();
	}

	// Internal: Returns the next token, or `"$"` if the parser has reached
	// the end of the source string. A token may be a string, number, `null`
	// literal, or Boolean literal.
	function lex(charIndexBuggy, fromCharCode, newSyntaxError) {
	  var source = Source, length = source.length, value, begin, position, isSigned, charCode;
	  while (Index < length) {
	    charCode = source.charCodeAt(Index);
	    switch (charCode) {
	      case 9: case 10: case 13: case 32:
	        // Skip whitespace tokens, including tabs, carriage returns, line
	        // feeds, and space characters.
	        Index++;
	        break;
	      case 123: case 125: case 91: case 93: case 58: case 44:
	        // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
	        // the current position.
	        value = charIndexBuggy ? source.charAt(Index) : source[Index];
	        Index++;
	        return value;
	      case 34:
	        // `"` delimits a JSON string; advance to the next character and
	        // begin parsing the string. String tokens are prefixed with the
	        // sentinel `@` character to distinguish them from punctuators and
	        // end-of-string tokens.
	        for (value = "@", Index++; Index < length;) {
	          charCode = source.charCodeAt(Index);
	          if (charCode < 32) {
	            // Unescaped ASCII control characters (those with a code unit
	            // less than the space character) are not permitted.
	            abort(newSyntaxError);
	          } else if (charCode == 92) {
	            // A reverse solidus (`\`) marks the beginning of an escaped
	            // control character (including `"`, `\`, and `/`) or Unicode
	            // escape sequence.
	            charCode = source.charCodeAt(++Index);
	            switch (charCode) {
	              case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
	                // Revive escaped control characters.
	                value += Unescapes[charCode];
	                Index++;
	                break;
	              case 117:
	                // `\u` marks the beginning of a Unicode escape sequence.
	                // Advance to the first character and validate the
	                // four-digit code point.
	                begin = ++Index;
	                for (position = Index + 4; Index < position; Index++) {
	                  charCode = source.charCodeAt(Index);
	                  // A valid sequence comprises four hexdigits (case-
	                  // insensitive) that form a single hexadecimal value.
	                  if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
	                    // Invalid Unicode escape sequence.
	                    abort(newSyntaxError);
	                  }
	                }
	                // Revive the escaped character.
	                value += fromCharCode("0x" + source.slice(begin, Index));
	                break;
	              default:
	                // Invalid escape sequence.
	                abort(newSyntaxError);
	            }
	          } else {
	            if (charCode == 34) {
	              // An unescaped double-quote character marks the end of the
	              // string.
	              break;
	            }
	            charCode = source.charCodeAt(Index);
	            begin = Index;
	            // Optimize for the common case where a string is valid.
	            while (charCode >= 32 && charCode != 92 && charCode != 34) {
	              charCode = source.charCodeAt(++Index);
	            }
	            // Append the string as-is.
	            value += source.slice(begin, Index);
	          }
	        }
	        if (source.charCodeAt(Index) == 34) {
	          // Advance to the next character and return the revived string.
	          Index++;
	          return value;
	        }
	        // Unterminated string.
	        abort(newSyntaxError);
	      default:
	        // Parse numbers and literals.
	        begin = Index;
	        // Advance past the negative sign, if one is specified.
	        if (charCode == 45) {
	          isSigned = true;
	          charCode = source.charCodeAt(++Index);
	        }
	        // Parse an integer or floating-point value.
	        if (charCode >= 48 && charCode <= 57) {
	          // Leading zeroes are interpreted as octal literals.
	          if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
	            // Illegal octal literal.
	            abort(newSyntaxError);
	          }
	          isSigned = false;
	          // Parse the integer component.
	          for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
	          // Floats cannot contain a leading decimal point; however, this
	          // case is already accounted for by the parser.
	          if (source.charCodeAt(Index) == 46) {
	            position = ++Index;
	            // Parse the decimal component.
	            for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
	            if (position == Index) {
	              // Illegal trailing decimal.
	              abort(newSyntaxError);
	            }
	            Index = position;
	          }
	          // Parse exponents. The `e` denoting the exponent is
	          // case-insensitive.
	          charCode = source.charCodeAt(Index);
	          if (charCode == 101 || charCode == 69) {
	            charCode = source.charCodeAt(++Index);
	            // Skip past the sign following the exponent, if one is
	            // specified.
	            if (charCode == 43 || charCode == 45) {
	              Index++;
	            }
	            // Parse the exponential component.
	            for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
	            if (position == Index) {
	              // Illegal empty exponent.
	              abort(newSyntaxError);
	            }
	            Index = position;
	          }
	          // Coerce the parsed value to a JavaScript number.
	          return +source.slice(begin, Index);
	        }
	        // A negative sign may only precede numbers.
	        if (isSigned) {
	          abort(newSyntaxError);
	        }
	        // `true`, `false`, and `null` literals.
	        var temp = source.slice(Index, Index + 4);
	        if (temp == "true") {
	          Index += 4;
	          return true;
	        } else if (temp == "fals" && source.charCodeAt(Index + 4 ) == 101) {
	          Index += 5;
	          return false;
	        } else if (temp == "null") {
	          Index += 4;
	          return null;
	        }
	        // Unrecognized token.
	        abort(newSyntaxError);
	    }
	  }
	  // Return the sentinel `$` character if the parser has reached the end
	  // of the source string.
	  return "$";
	}

	// Internal: Parses a JSON `value` token.
	function get(charIndexBuggy, fromCharCode, newSyntaxError, value) {
	  var results, hasMembers;
	  if (value == "$") {
	    // Unexpected end of input.
	    abort(newSyntaxError);
	  }
	  if (typeof value == "string") {
	    if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
	      // Remove the sentinel `@` character.
	      return value.slice(1);
	    }
	    // Parse object and array literals.
	    if (value == "[") {
	      // Parses a JSON array, returning a new JavaScript array.
	      results = [];
	      for (;;) {
	        value = lex(charIndexBuggy, fromCharCode, newSyntaxError);
	        // A closing square bracket marks the end of the array literal.
	        if (value == "]") {
	          break;
	        }
	        // If the array literal contains elements, the current token
	        // should be a comma separating the previous element from the
	        // next.
	        if (hasMembers) {
	          if (value == ",") {
	            value = lex(charIndexBuggy, fromCharCode, newSyntaxError);
	            if (value == "]") {
	              // Unexpected trailing `,` in array literal.
	              abort(newSyntaxError);
	            }
	          } else {
	            // A `,` must separate each array element.
	            abort(newSyntaxError);
	          }
	        } else {
	          hasMembers = true;
	        }
	        // Elisions and leading commas are not permitted.
	        if (value == ",") {
	          abort(newSyntaxError);
	        }
	        results.push(get(charIndexBuggy, fromCharCode, newSyntaxError, value));
	      }
	      return results;
	    } else if (value == "{") {
	      // Parses a JSON object, returning a new JavaScript object.
	      results = {};
	      for (;;) {
	        value = lex(charIndexBuggy, fromCharCode, newSyntaxError);
	        // A closing curly brace marks the end of the object literal.
	        if (value == "}") {
	          break;
	        }
	        // If the object literal contains members, the current token
	        // should be a comma separator.
	        if (hasMembers) {
	          if (value == ",") {
	            value = lex(charIndexBuggy, fromCharCode, newSyntaxError);
	            if (value == "}") {
	              // Unexpected trailing `,` in object literal.
	              abort(newSyntaxError);
	            }
	          } else {
	            // A `,` must separate each object member.
	            abort(newSyntaxError);
	          }
	        } else {
	          hasMembers = true;
	        }
	        // Leading commas are not permitted, object property names must be
	        // double-quoted strings, and a `:` must separate each property
	        // name and value.
	        if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex(charIndexBuggy, fromCharCode, newSyntaxError) != ":") {
	          abort(newSyntaxError);
	        }
	        var memberValue = lex(charIndexBuggy, fromCharCode, newSyntaxError);
	        results[value.slice(1)] = get(charIndexBuggy, fromCharCode, newSyntaxError, memberValue);
	      }
	      return results;
	    }
	    // Unexpected token encountered.
	    abort(newSyntaxError);
	  }
	  return value;
	}

	// Internal: Updates a traversed object member.
	function update(getClass, forOwn, source, property, callback) {
	  var element = walk(getClass, forOwn, source, property, callback);
	  if (element === undefined) {
	    delete source[property];
	  } else {
	    source[property] = element;
	  }
	}

	// Internal: Recursively traverses a parsed JSON object, invoking the
	// `callback` function for each value. This is an implementation of the
	// `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
	function walk(getClass, forOwn, source, property, callback) {
	  var value = source[property], length;
	  if (typeof value == "object" && value) {
	    // `forOwn` can't be used to traverse an array in Opera <= 8.54
	    // because its `Object#hasOwnProperty` implementation returns `false`
	    // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
	    if (getClass.call(value) == "[object Array]") {
	      for (length = value.length; length--; update(getClass, forOwn, value, length, callback));
	    } else {
	      forOwn(value, function (property) {
	        update(getClass, forOwn, value, property, callback);
	      });
	    }
	  }
	  return callback.call(source, property, value);
	}

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var toPaddedString = __webpack_require__(8);

	// Internal: Serializes dates according to the `Date#toJSON` method specified
	// in ES 5.1 section 15.9.5.44. See section 15.9.1.15 for the ISO 8601 date
	// time string format.
	function toISOString(v) {
	  var year = v.getUTCFullYear();
	  var yearString = year <= 0 || year >= 1e4 ?
	    // Extended year: [+-]YYYYYY.
	    (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) :
	    // Four-digit year: YYYY.
	    toPaddedString(4, year);
	  return (
	    yearString +
	    // Pad months, dates, hours, minutes, and seconds to two digits.
	    "-" + toPaddedString(2, v.getUTCMonth() + 1) +
	    "-" + toPaddedString(2, v.getUTCDate()) +
	    "T" + toPaddedString(2, v.getUTCHours()) +
	    ":" + toPaddedString(2, v.getUTCMinutes()) +
	    ":" + toPaddedString(2, v.getUTCSeconds()) +
	    // Pad milliseconds to three digits (optional in ES 5.0; required
	    // in ES 5.1).
	    "." + toPaddedString(3, v.getUTCMilliseconds()) +
	    "Z"
	  );
	}

	module.exports = createSerializeDate;
	function createSerializeDate(UTCDate) {
	  // Internal: Serializes a date object.
	  function serializeDate(value) {
	    var epochTime = +value;
	    if (epochTime != epochTime || epochTime == -1 / 0 || epochTime == 1 / 0) {
	      // Handle `NaN`, `Infinity`, and `-Infinity`.
	      return null;
	    }
	    if (UTCDate) {
	      return toISOString(new UTCDate(value));
	    }
	    return toISOString(value);
	  }
	  return serializeDate;
	}


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var attempt = __webpack_require__(1),
	    toPaddedString = __webpack_require__(8);

	var undefined;

	module.exports = createStringify;
	function createStringify(getClass, forOwn, newTypeError) {
	  // Public: `JSON.stringify` serializes a JavaScript `value` as a JSON string.
	  // The optional `filter` argument may specify either a function that alters
	  // how object and array members are serialized, or an array of strings and
	  // numbers that indicates which properties should be serialized. The optional
	  // `width` argument may be either a string or number that specifies the
	  // indentation level of the output. See ES 5.1 section 15.12.3.
	  function stringify(source, filter, width) {
	    var whitespace, callback, properties, className;
	    if (typeof filter == "function" || typeof filter == "object" && filter) {
	      className = getClass.call(filter);
	      if (className == "[object Function]") {
	        callback = filter;
	      } else if (className == "[object Array]") {
	        // Convert the property names array into a makeshift set.
	        properties = {};
	        for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == "[object String]" || className == "[object Number]") && (properties[value] = 1));
	      }
	    }
	    if (width) {
	      className = getClass.call(width);
	      if (className == "[object Number]") {
	        // Convert the `width` to an integer and create a string containing
	        // `width` number of space characters.
	        if ((width -= width % 1) > 0) {
	          for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
	        }
	      } else if (className == "[object String]") {
	        whitespace = width.length <= 10 ? width : width.slice(0, 10);
	      }
	    }
	    // Opera <= 7.54u2 discards the values associated with empty string keys
	    // (`""`) only if they are used directly within an object member list
	    // (e.g., `!("" in { "": 1})`).
	    return serialize(getClass, forOwn, newTypeError, "", (value = {}, value[""] = source, value), callback, properties, whitespace, "", []);
	  }
	  return stringify;
	}

	// Internal: A map of control characters and their escaped equivalents.
	var Escapes = {
	  92: "\\\\",
	  34: '\\"',
	  8: "\\b",
	  12: "\\f",
	  10: "\\n",
	  13: "\\r",
	  9: "\\t"
	};

	// Internal: Double-quotes a string `value`, replacing all ASCII control
	// characters (characters with code unit values between 0 and 31) with
	// their escaped equivalents. This is an implementation of the
	// `Quote(value)` operation defined in ES 5.1 section 15.12.3.
	var unicodePrefix = "\\u00";
	var escapeChar = function (character) {
	  var charCode = character.charCodeAt(0), escaped = Escapes[charCode];
	  if (escaped) {
	    return escaped;
	  }
	  return unicodePrefix + toPaddedString(2, charCode.toString(16));
	};
	var reEscape = /[\x00-\x1f\x22\x5c]/g;
	var quote = function (value) {
	  reEscape.lastIndex = 0;
	  return '"' +
	    (
	      reEscape.test(value)
	        ? value.replace(reEscape, escapeChar)
	        : value
	    ) +
	    '"';
	};

	// Internal: Recursively serializes an object. Implements the
	// `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
	function serialize(getClass, forOwn, newTypeError, property, object, callback, properties, whitespace, indentation, stack) {
	  var type, className, results, element, index, length, prefix, result;
	  var value = attempt(function () {
	    // Necessary for host object support.
	    return object[property];
	  });
	  if (typeof value == "object" && value && typeof value.toJSON == "function") {
	    value = value.toJSON(property);
	  }
	  if (callback) {
	    // If a replacement function was provided, call it to obtain the value
	    // for serialization.
	    value = callback.call(object, property, value);
	  }
	  // Exit early if value is `undefined` or `null`.
	  if (value == undefined) {
	    return value === undefined ? value : "null";
	  }
	  type = typeof value;
	  // Only call `getClass` if the value is an object.
	  if (type == "object") {
	    className = getClass.call(value);
	  }
	  switch (className || type) {
	    case "boolean":
	    case "[object Boolean]":
	      // Booleans are represented literally.
	      return "" + value;
	    case "number":
	    case "[object Number]":
	      // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
	      // `"null"`.
	      return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
	    case "string":
	    case "[object String]":
	      // Strings are double-quoted and escaped.
	      return quote("" + value);
	  }
	  // Recursively serialize objects and arrays.
	  if (typeof value == "object") {
	    // Check for cyclic structures. This is a linear search; performance
	    // is inversely proportional to the number of unique nested objects.
	    for (length = stack.length; length--;) {
	      if (stack[length] === value) {
	        // Cyclic structures cannot be serialized by `JSON.stringify`.
	        throw newTypeError();
	      }
	    }
	    // Add the object to the stack of traversed objects.
	    stack.push(value);
	    results = [];
	    // Save the current indentation level and indent one additional level.
	    prefix = indentation;
	    indentation += whitespace;
	    if (className == "[object Array]") {
	      // Recursively serialize array elements.
	      for (index = 0, length = value.length; index < length; index++) {
	        element = serialize(getClass, forOwn, newTypeError, index, value, callback, properties, whitespace, indentation, stack);
	        results.push(element === undefined ? "null" : element);
	      }
	      result = results.length ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
	    } else {
	      // Recursively serialize object members. Members are selected from
	      // either a user-specified list of property names, or the object
	      // itself.
	      forOwn(properties || value, function (property) {
	        var element = serialize(getClass, forOwn, newTypeError, property, value, callback, properties, whitespace, indentation, stack);
	        if (element !== undefined) {
	          // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
	          // is not the empty string, let `member` {quote(property) + ":"}
	          // be the concatenation of `member` and the `space` character."
	          // The "`space` character" refers to the literal space
	          // character, not the `space` {width} argument provided to
	          // `JSON.stringify`.
	          results.push(quote(property) + ":" + (whitespace ? " " : "") + element);
	        }
	      });
	      result = results.length ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
	    }
	    // Remove the object from the traversed object stack.
	    stack.pop();
	    return result;
	  }
	}


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	// The `valueOf` property inherits the non-enumerable flag from
	// `Object.prototype` in older versions of IE, Netscape, and Mozilla.
	function Properties() {
	  this.valueOf = 0;
	}
	Properties.prototype.valueOf = 0;

	// Tests for bugs in the current environment's `for...in` algorithm.
	module.exports = hasDontEnumBug;
	function hasDontEnumBug(isProperty) {
	  var members = new Properties(), size = 0;
	  for (var property in members) {
	    // Ignore all properties inherited from `Object.prototype`.
	    if (isProperty.call(members, property)) {
	      size++;
	    }
	  }
	  return size === 0;
	}


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	// Internal: Converts `value` into a zero-padded string such that its
	// length is at least equal to `width`. The `width` must be <= 6.
	var leadingZeroes = "000000";
	module.exports = function (width, value) {
	  // The `|| 0` expression is necessary to work around a bug in
	  // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
	  return (leadingZeroes + (value || 0)).slice(-width);
	};


/***/ }
/******/ ])  )(root);

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
}).call(this);
;