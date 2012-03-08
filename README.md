JSON 3
======

**JSON 3** is an [ECMAScript 5](http://es5.github.com/)-compliant JSON implementation. Its objective is to provide a reasonably fast library compatible with a variety of older environments, including Internet Explorer 6, Opera 7, and Safari 2.

[JSON](http://json.org/) is a language-independent data interchange format based on a loose subset of the JavaScript grammar. Originally popularized by [Douglas Crockford](http://www.crockford.com/), JSON was standardized in the fifth edition of the ECMAScript specification. The 5.1 edition, ratified in June 2011, incorporates several modifications to the grammar pertaining to the serialization of dates.

The JSON 3 parser does **not** use `eval` or regular expressions. This provides security and performance benefits in obsolete and mobile environments, where the margin is particularly significant. Informal benchmarks have shown that JSON 3 is slower than Crockford's recursive descent parser and Mike Samuel's `json-sans-eval`, but approximates the speed of the `eval`-based JSON 2 parser.

JSON 3 exposes two functions: `stringify()` for serializing a JavaScript value to JSON, and `parse()` for parsing a JSON source string into a JavaScript value. The functions behave exactly as described in the spec, **except** for the date serialization deviation noted below.

[Unit tests](http://kitcambridge.github.com/json3/test/test_browser.html) are also available.

## Usage

JSON 3 creates a separate `JSON3` namespace in web browsers and JavaScript engines. As such, it is not yet backward-compatible with JSON 2. **This will change once the library undergoes more rigorous testing**.

You can include it in your HTML source like so:

    <script src="http://kitcambridge.github.com/json3/lib/json3.js"></script>
    <script>
      JSON3.stringify({"Hello": 123});
      // => '{"Hello":123}'
    </script>

You can also use JSON 3 as a CommonJS module, though most CommonJS environments natively support JSON serialization and parsing:

    var JSON3 = require("path/to/json3");
    JSON3.parse("[1, 2, 3]");
    // => [1, 2, 3]

Finally, you can load it directly in Mozilla Rhino, SpiderMonkey, or another JavaScript engine:

    load("path/to/json3");
    JSON3.stringify([1, 2, 3]);
    // => "[1,2,3]"

### Changes from JSON 2

JSON 3...

* Correctly serializes primitive wrapper objects (*[Issue #28](https://github.com/douglascrockford/JSON-js/issues/28)*).
* Throws a `TypeError` for cyclic structures (JSON 2 will recurse until the stack overflows).
* Utilizes feature tests to detect broken or incomplete **native** JSON implementations (JSON 2 only checks for the presence of the native functions). The tests are only executed once, so there is no runtime delay when parsing or serializing values.

In contrast to [JSON 2](http://json.org/js), JSON 3 **does *not***...

* Add `toJSON` methods to the `Boolean`, `Number`, and `String` prototypes. These are not part of any standard, and are made redundant by the design of the `stringify` implementation.
* Add `Date#toJSON` or `Date#toISOString`. See the note about date serialization below.

### Date Serialization

**JSON 3 deviates from the specification in one important way**: it does not define `Date#toISOString()` or `Date#toJSON()`. This is to preserve CommonJS compatibility, as well as avoid polluting native prototypes. Instead, date serialization is performed internally by the `stringify()` function: if a date object does not define a `toJSON()` method, it is serialized as a simplified ISO 8601 date-time string. **This is expected to change in the future, but it's an important incompatibility to be aware of**.

**Several native `Date#toJSON()` implementations produce date time strings that do *not* conform to the grammar outlined in the spec**. For example, all versions of Safari, as well as JSON 2, fail to serialize extended years correctly. Furthermore, JSON 2 and older implementations omit the milliseconds from the date-time string (optional in ES 5, but required in 5.1). Finally, in all versions of Safari, serializing an invalid date will produce the string `"Invalid Date"`, rather than `null`. However, since the `stringify()` and `parse()` implementations in these environments **are** spec-compliant, JSON 3 will not override them.

### Known Incompatibilities

JSON 3 is **not compatible with [Prototype](http://prototypejs.org) 1.6.1 and older**. If you *must* use this version of Prototype, use `Object.toJSON` and `String#evalJSON(true)` instead of `JSON.stringify` and `JSON.parse`, respectively. This is **not** a bug in JSON 3 itself; because Prototype adds several non-standard `toJSON` methods that return serialized values instead of objects, *using the native JSON implementation will yield the same results*.

JSON 3 also assumes that the following methods exist and function as described in the ECMAScript specification:

- **`String.prototype` Methods**: `indexOf`, `charAt`, `slice`.
- **`Object.prototype` Methods**: `toString`, `hasOwnProperty` (a fallback is provided for Safari 2).
- **`Date.prototype` Methods**: `getUTC{FullYear, Month, Date, Hours, Minutes, Seconds, Milliseconds}`.
- **`Array.prototype` Methods**: `push`, `pop`, `join`.
- `Function#call`

- The `Number`, `String`, `Array`, `Object`, `SyntaxError`, and `TypeError` constructors.
- `Math.abs`
- `String.fromCharCode`
- `parseInt`
- `isFinite`

## Contributing

Check out a working copy of the JSON 3 source code with [Git](http://git-scm.com/):

    $ git clone git://github.com/kitcambridge/json3.git

If you'd like to contribute a feature or bug fix, you can [fork](http://help.github.com/fork-a-repo/) JSON 3, commit your changes, and [send a pull request](http://help.github.com/send-pull-requests/). Please make sure to update the unit tests in the `test` directory as well.

Alternatively, you can use the [GitHub issue tracker](http://github.com/kitcambridge/json3/issues) to submit bug reports and feature requests.

## MIT License

Copyright &copy; 2012 [Kit Cambridge](http://kitcambridge.github.com).

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.