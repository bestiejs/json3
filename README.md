# JSON 3 #

![JSON 3 Logo](https://bestiejs.github.io/json3/page/logo.png)

[![Build Status](https://api.travis-ci.org/bestiejs/json3.png?branch=gh-pages)](https://travis-ci.org/bestiejs/json3)

**JSON 3** is a modern JSON implementation compatible with a variety of JavaScript platforms. The current version is **3.3.2**.

- [Development Version](http://cdnjs.cloudflare.com/ajax/libs/json3/3.3.2/json3.js) *(43 KB; uncompressed with comments)*
- [Production Version](http://cdnjs.cloudflare.com/ajax/libs/json3/3.3.2/json3.min.js) *(3.5 KB; compressed and `gzip`-ped)*
- [Change Log](https://bestiejs.github.io/json3/changes.html)

Special thanks to [cdnjs](http://cdnjs.com/libraries/json3/) and [jsDelivr](http://www.jsdelivr.com/#!json3) for hosting CDN copies of JSON 3.

[JSON](http://json.org/) is a language-independent data interchange format based on a loose subset of the JavaScript grammar. Originally popularized by [Douglas Crockford](http://www.crockford.com/), the format was standardized in the [fifth edition](http://es5.github.io/) of the ECMAScript specification. The 5.1 edition, ratified in June 2011, incorporates several modifications to the grammar pertaining to the serialization of dates.

JSON 3 exposes two functions: `stringify()` for [serializing](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/JSON/stringify) a JavaScript value to JSON, and `parse()` for [producing](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/JSON/parse) a JavaScript value from a JSON source string. It is a **drop-in replacement** for [JSON 2](http://json.org/js). The functions behave exactly as described in the ECMAScript spec, **except** for the date serialization discrepancy noted below.

The JSON 3 parser does **not** use `eval` or regular expressions. This provides security and performance benefits in obsolete and mobile environments, where the margin is particularly significant. The complete [benchmark suite](http://jsperf.com/json3) is available on [jsPerf](http://jsperf.com/).

The project is [hosted on GitHub](http://git.io/json3), along with the [unit tests](http://bestiejs.github.io/json3/test/test_browser.html). It is part of the [BestieJS](https://github.com/bestiejs) family, a collection of best-in-class JavaScript libraries that promote cross-platform support, specification precedents, unit testing, and plenty of documentation.

# Changes from JSON 2 #

JSON 3…

* Correctly serializes primitive wrapper objects.
* Throws a `TypeError` when serializing cyclic structures (JSON 2 recurses until the call stack overflows).
* Utilizes **feature tests** to detect broken or incomplete *native* JSON implementations (JSON 2 only checks for the presence of the native functions). The tests are only executed once at runtime, so there is no additional performance cost when parsing or serializing values.

**As of v3.2.3**, JSON 3 is compatible with [Prototype](http://prototypejs.org) 1.6.1 and older.

In contrast to JSON 2, JSON 3 **does not**…

* Add `toJSON()` methods to the `Boolean`, `Number`, and `String` prototypes. These are not part of any standard, and are made redundant by the design of the `stringify()` implementation.
* Add `toJSON()` or `toISOString()` methods to `Date.prototype`. See the note about date serialization below.

## Date Serialization

**JSON 3 deviates from the specification in one important way**: it does not define `Date#toISOString()` or `Date#toJSON()`. This preserves CommonJS compatibility and avoids polluting native prototypes. Instead, date serialization is performed internally by the `stringify()` implementation: if a date object does not define a custom `toJSON()` method, it is serialized as a [simplified ISO 8601 date-time string](http://es5.github.com/#x15.9.1.15).

**Several native `Date#toJSON()` implementations produce date time strings that do *not* conform to the grammar outlined in the spec**. For instance, all versions of Safari 4, as well as JSON 2, fail to serialize extended years correctly. Furthermore, JSON 2 and older implementations omit the milliseconds from the date-time string (optional in ES 5, but required in 5.1). Finally, in all versions of Safari 4 and 5, serializing an invalid date will produce the string `"Invalid Date"`, rather than `null`. Because these environments exhibit other serialization bugs, however, JSON 3 will override the native `stringify()` implementation.

Portions of the date serialization code are adapted from the [`date-shim`](https://github.com/Yaffle/date-shim) project.

# Usage #

## Web Browsers

    <script src="//cdnjs.cloudflare.com/ajax/libs/json3/3.3.2/json3.min.js"></script>
    <script>
      JSON.stringify({"Hello": 123});
      // => '{"Hello":123}'
      JSON.parse("[[1, 2, 3], 1, 2, 3, 4]", function (key, value) {
        if (typeof value == "number") {
          value = value % 2 ? "Odd" : "Even";
        }
        return value;
      });
      // => [["Odd", "Even", "Odd"], "Odd", "Even", "Odd", "Even"]
    </script>

**When used in a web browser**, JSON 3 exposes an additional `JSON3` object containing the `noConflict()` and `runInContext()` functions, as well as aliases to the `stringify()` and `parse()` functions.

### `noConflict` and `runInContext`

* `JSON3.noConflict()` restores the original value of the global `JSON` object and returns a reference to the `JSON3` object.
* `JSON3.runInContext([context, exports])` initializes JSON 3 using the given `context` object (e.g., `window`, `global`, etc.), or the global object if omitted. If an `exports` object is specified, the `stringify()`, `parse()`, and `runInContext()` functions will be attached to it instead of a new object.

### Asynchronous Module Loaders

JSON 3 is defined as an [anonymous module](https://github.com/amdjs/amdjs-api/wiki/AMD#define-function-) for compatibility with [RequireJS](http://requirejs.org/), [`curl.js`](https://github.com/cujojs/curl), and other asynchronous module loaders.

    <script src="//cdnjs.cloudflare.com/ajax/libs/require.js/2.1.10/require.js"></script>
    <script>
      require({
        "paths": {
          "json3": "./path/to/json3"
        }
      }, ["json3"], function (JSON) {
        JSON.parse("[1, 2, 3]");
        // => [1, 2, 3]
      });
    </script>

To avoid issues with third-party scripts, **JSON 3 is exported to the global scope even when used with a module loader**. If this behavior is undesired, `JSON3.noConflict()` can be used to restore the global `JSON` object to its original value.

**Note:** If you intend to use JSON3 alongside another module, **please do not simply concatenate these modules together**, as that would cause multiple `define` calls in one script, resulting in errors in AMD loaders. The `r.js` build optimizer can be used instead if you need a single compressed file for production.

## CommonJS Environments

    var JSON3 = require("./path/to/json3");
    JSON3.parse("[1, 2, 3]");
    // => [1, 2, 3]

## JavaScript Engines

    load("path/to/json3.js");
    JSON.stringify({"Hello": 123, "Good-bye": 456}, ["Hello"], "\t");
    // => '{\n\t"Hello": 123\n}'

# Compatibility #

JSON 3 has been **tested** with the following web browsers, CommonJS environments, and JavaScript engines.

## Web Browsers

- Windows [Internet Explorer](http://windows.microsoft.com/en-us/internet-explorer/download-ie), version 6.0 and higher
- Google [Chrome](http://www.google.com/chrome), version 19.0 and higher
- Mozilla [Firefox](https://www.mozilla.org/en-US/firefox/new/), version 2.0 and higher
- Apple [Safari](http://www.apple.com/safari/), version 3.0 and higher
- [Opera](http://www.opera.com/) 8.54 and higher
- [SeaMonkey](http://www.seamonkey-project.org/) 1.0 and higher

## CommonJS Environments

- [Node](http://nodejs.org/) 0.6.21 and higher
- [io.js](https://iojs.org/) 1.0.3 and higher
- [RingoJS](http://ringojs.org/) 0.9 and higher
- [Narwhal](https://github.com/280north/narwhal) 0.3.2

## JavaScript Engines

- Mozilla [Rhino](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/Rhino) 1.7R3 and higher
- WebKit [JSC](https://trac.webkit.org/wiki/JSC)
- Google [V8](http://code.google.com/p/v8/)

## Known Incompatibilities

* Attempting to serialize the `arguments` object may produce inconsistent results across environments due to specification version differences. As a workaround, please convert the `arguments` object to an array first: `JSON.stringify([].slice.call(arguments, 0))`.

## Required Native Methods

JSON 3 assumes that the following methods exist and function as described in the ECMAScript specification:

- The `Number`, `String`, `Array`, `Object`, `Date`, `SyntaxError`, and `TypeError` constructors.
- `String.fromCharCode`
- `Object#toString`
- `Object#hasOwnProperty`
- `Function#call`
- `Math.floor`
- `Number#toString`
- `Date#valueOf`
- `String.prototype`: `indexOf`, `charCodeAt`, `charAt`, `slice`, `replace`.
- `Array.prototype`: `push`, `pop`, `join`.

# Contribute #

Check out a working copy of the JSON 3 source code with [Git](http://git-scm.com/):

    $ git clone git://github.com/bestiejs/json3.git
    $ cd json3

We &#9829; bug reports, suggestions, questions, and pull requests! Please see our [contribution guidelines](https://bestiejs.github.io/json3/contribute.html) if you'd like to contribute.

JSON 3 is released under the [MIT License](http://kit.mit-license.org/).
