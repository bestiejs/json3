# Contributing to JSON 3

<p class="banner">JSON 3 is **no longer maintained**. Please [drop me a line](mailto:json3@yak.systems) if you'd like to take it over, or if you want to chat about the code or project.</p>

### Tests ###

JSON 3 uses [Spec](https://github.com/kitcambridge/spec) for its unit tests.

`test/test_json3.js` contains conformance tests for `parse` and `stringify`. This script can be invoked directly by any supported [CommonJS implementation](https://bestiejs.github.io/json3/#commonjs-environments) or [JavaScript engine](https://bestiejs.github.io/json3/#javascript-engines), and is loaded by the ExtendScript (`test/test_extendscript.jsx`) and browser (`test/test_browser.html`) harnesses.

Unless you're adding an environment-specific test (e.g., testing [RequireJS](http://requirejs.org/) or [`curl.js`](https://github.com/cujojs/curl) support), you'll likely only need to update `test/test_json3.js`.

The tests are randomized before execution to avoid dependencies on global state. If you really need them, you can add order-dependent tests after the `testSuite.shuffle()` call in `test/test_json3.js`.

To add a test:

    testSuite.addTest("Test Name", function (t) {
      t.ok(true, "Tests whether an expression is truthy");
      t.notOk(NaN, "Tests whether an expression is falsy");

      // Equality assertions.
      this.equal(1, "1", "=="); // `this == t`.
      t.notEqual("a", "b", "!=");

      t.strictEqual(1, 1, "===");
      this.notStrictEqual(1, "1", "!==");

      // Deep equality.
      this.deepEqual([1, 2, NaN, { "hello": "world" }],
        [1, 2, NaN, { "hello": "world" }], "Spec.equals(a, b)");

      this.notDeepEqual(["1", 2, NaN], [1, "2", NaN],
        "!Spec.equals(a, b)");

      // Errors.
      t.error(function () {
        throw new Error("universe has imploded");
      }, "Tests whether a function throws an exception");

      t.error(function () {
        throw new Error("omg, everything is exploding");
      }, function (err, test) {
        // `test == t`.
        return err.message.indexOf("omg") > -1;
      }, "Tests whether a function throws a specific exception");

      t.noError(function () {
        return true;
      }, "Ensures a function does not throw an exception");

      // Performs a deep comparison of `JSON.parse(src)` and `struct`.
      var struct = [1, 2, { a: "b" }];
      var src = '[1,2,{"a":"b"}]';
      t.parses(struct, src,
        "Spec.equals(JSON.parse(src), struct)");

      // Ensures `JSON.stringify(struct)` produces the given output.
      t.serializes(src, struct,
        "JSON.stringify(struct) == src");

      // Ensures invalid input is not parsed.
      var invalid = '[1,2';
      t.parseError(invalid,
        "Ensures `JSON.parse(invalid) throws a syntax error");

      // Ensures `JSON.stringify()` does not attempt to serialize
      // cyclic structures.
      var cycle = {};
      cycle.a = cycle;
      t.cyclicError(cycle,
        "Ensures `JSON.stringify(cycle)` throws a `TypeError`");

      // Optionally specifies the expected number of assertions.
      t.done(15);
    });

### Project Page and Minification ###

The builder (`build.js`) is a Node script that:

* Regenerates the [GitHub project page](https://bestiejs.github.io/json3/) from `README.md`...
* Downloads the [Closure Compiler](https://developers.google.com/closure/compiler/) if it's not already on your system, and...
* Minifies `lib/json3.js`.

You don't need to run the builder before submitting your pull request; we'll do this before each release.
