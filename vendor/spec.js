/*!
 * Spec unit testing library
 * http://github.com/kitcambridge/spec
 *
 * Copyright 2011-2014, Kit Cambridge
 * http://kitcambridge.github.com
 *
 * Released under the MIT License.
*/

;(function (root, Spec) {
  if (typeof define == "function" && define.amd) {
    // Export Spec for asynchronous module loaders.
    define("spec", ["exports"], Spec);
  } else {
    // Export for CommonJS environments, web browsers, and JavaScript engines.
    Spec = Spec(typeof exports == "object" && exports || (root.Spec = {
      // **noConflict** restores the original value of the `Spec` variable and
      // returns a reference to the Spec object.
      "noConflict": (function (original) {
        function noConflict() {
          root.Spec = original;
          return Spec;
        }
        return noConflict;
      })(root.Spec)
    }));
  }
})(this, function (exports) {
  "use strict";

  // The current version of Spec. Keep in sync with `package.json`.
  exports.version = "1.0.1";

  // Utility Methods
  // ---------------

  // `Object#toString` exposes the internal `[[Class]]` name of an object.
  var getClass = {}.toString, call = getClass.call,

  // **Spec.Environment** stores information about the current environment.
  Environment = exports.Environment = {
    // Indicates whether the `Object#hasOwnProperty` function is supported.
    "hasOwnProp": false,
    // Indicates whether the `[[Prototype]]` chain is exposed via the
    // `__proto__` property and can be mutated.
    "mutableProto": false,
    // Indicates whether the JScript `[[DontEnum]]` bug is present.
    "dontEnum": false,
    // Indicates whether the Safari 2 shadowed property enumeration bug is
    // present.
    "shadowEnum": false,
    // Indicates whether `undefined` elements in arrays are treated as elisions
    // (JScript 5.x spec, section 2.1.26).
    "undefinedElisions": !(0 in [void 0]),
    // Indicates whether Node's `process.nextTick` function is supported.
    "nextTick": typeof process == "object" && process != null && typeof process.nextTick == "function",
    // Indicates whether the `setTimeout` function is supported.
    "setTimeout": typeof setTimeout != "undefined",
    // Indicates whether Mozilla's LiveConnect APIs are supported.
    "java": typeof java != "undefined" && java != null && getClass.call(java) == "[object JavaPackage]" && typeof JavaAdapter == "function",
    // Indicates whether `JavaAdapter`s work with abstract base classes.
    "javaAdapter": false
  },

  // **hasKey** determines if a property is a direct property of the
  // specified object.
  hasKey = exports.hasKey = (function () {
    var memo = {}, hasOwnProperty = memo.hasOwnProperty, hasKey;
    // The `__proto__` property can't be set more than once in Gecko.
    Environment.mutableProto = (memo.__proto__ = null, memo.__proto__ = { 1: 2 }, memo)[1] == 2;
    memo = null;

    if ((Environment.hasOwnProp = getClass.call(hasOwnProperty) == "[object Function]")) {
      // Wrap `Object#hasOwnProperty` in conforming implementations.
      hasKey = function hasKey(object, property) {
        if (object !== Object(object)) {
          throw TypeError("Invalid argument.");
        }
        return call.call(hasOwnProperty, object, property);
      };
    } else if (Environment.mutableProto) {
      // Simulate `Object#hasOwnProperty` in Safari 2.0.3 and earlier.
      hasKey = function hasKey(object, property) {
        var original, result;
        if (object !== Object(object)) {
          throw TypeError("Invalid argument.");
        }
        // Capture and break the object's prototype chain. See the ES 5.1 spec,
        // section 8.6.2.
        original = object.__proto__;
        result = property in (object.__proto__ = null, object);
        // Restore the original prototype chain.
        object.__proto__ = original;
        return result;
      };
    } else {
      // Use the `constructor` property to simulate `Object#hasOwnProperty` in
      // environments that don't expose the prototype chain.
      hasKey = function hasKey(object, property) {
        if (object !== Object(object)) {
          throw TypeError("Invalid argument.");
        }
        var parent = (object.constructor || Object).prototype;
        return property in object && !(property in parent && object[property] === parent[property]);
      };
    }
    return hasKey;
  })(),

  // **forOwn** iterates over an `object`, executing a `callback` function once
  // per object member. If a `context` is specified, the `callback` is bound to
  // it. The iteration algorithm is normalized to account for cross-environment
  // inconsistencies.
  forOwn = exports.forOwn = (function () {
    var members, property, forOwn, size = 0;

    // Tests for bugs in the current environment's `for...in` algorithm. The
    // `valueOf` property inherits the non-enumerable flag from
    // `Object.prototype` in JScript <= 5.8 and Gecko <= 1.0.
    function Properties() {
      this.valueOf = 0;
    }
    Properties.prototype.valueOf = 0;

    // Iterate over a new instance of the `Properties` class.
    members = new Properties();
    for (property in members) {
      // Ignore all other properties inherited from `Object.prototype`.
      if (hasKey(members, property)) {
        size += 1;
      }
    }
    members = null;

    // Normalize the iteration algorithm.
    if (!size) {
      // A list of non-enumerable properties inherited from `Object.prototype`.
      members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
      // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
      // properties.
      Environment.dontEnum = true;
      forOwn = function forOwn(object, callback, context) {
        var isFunction, property, length;
        if (object !== Object(object)) {
          throw TypeError("Invalid argument.");
        }
        isFunction = getClass.call(object) == "[object Function]";
        for (property in object) {
          // Gecko <= 1.0 enumerates the `prototype` property of functions under
          // certain conditions; IE does not.
          if (!(isFunction && property == "prototype") && hasKey(object, property) && call.call(callback, context, property, object[property], object) === false) {
            return;
          }
        }
        // Manually invoke the callback for each non-enumerable property.
        for (length = members.length; length--;) {
          property = members[length];
          if (hasKey(object, property) && call.call(callback, context, property, object[property], object) === false) {
            break;
          }
        }
      };
    } else if (size == 2) {
      // Safari <= 2.0.4 enumerates shadowed properties twice.
      Environment.shadowEnum = true;
      forOwn = function forOwn(object, callback, context) {
        var members, isFunction, property;
        if (object !== Object(object)) {
          throw TypeError("Invalid argument.");
        }
        // Create a set of iterated properties.
        members = {};
        isFunction = getClass.call(object) == "[object Function]";
        for (property in object) {
          // Store each property name to prevent double enumeration. The
          // `prototype` property of functions is not enumerated due to cross-
          // environment inconsistencies.
          if (!(isFunction && property == "prototype") && !hasKey(members, property) && (members[property] = 1) && hasKey(object, property) && call.call(callback, context, property, object[property], object) === false) {
            break;
          }
        }
      };
    } else {
      // No bugs detected; use the standard `for...in` algorithm.
      forOwn = function forOwn(object, callback, context) {
        var isFunction, property, isConstructor;
        if (object !== Object(object)) {
          throw TypeError("Invalid argument.");
        }
        isFunction = getClass.call(object) == "[object Function]";
        for (property in object) {
          if (!(isFunction && property == "prototype") && hasKey(object, property) && !(isConstructor = property === "constructor") && call.call(callback, context, property, object[property], object) === false) {
            return;
          }
        }
        // Manually invoke the callback for the `constructor` property due to
        // cross-environment inconsistencies.
        if (isConstructor || hasKey(object, "constructor")) {
          call.call(callback, context, "constructor", object.constructor, object);
        }
      };
    }
    return forOwn;
  })(),

  // **equals** recursively compares two objects.
  equals = exports.equals = (function () {
    // Comparison algorithm derived from work by Jeremy Ashkenas and Philippe
    // Rathe.
    function eq(left, right, stack) {
      var className, size, result;
      // Identical objects are equivalent.
      if (left === right) {
        // `0` and `-0` are identical, but they aren't equivalent. See the
        // ECMAScript Harmony `egal` proposal.
        return left !== 0 || (1 / left == 1 / right);
      }
      // `null` and `undefined` are compared by identity.
      if (left == null) {
        return left === right;
      }
      className = getClass.call(left);
      if (className != getClass.call(right)) {
        return false;
      }
      switch (className) {
        // Strings, numbers, dates, and booleans are compared by value.
        // Primitives and their corresponding object wrappers are equivalent;
        // thus, `"5"` is equivalent to `new String("5")`.
        case "[object String]":
          return String(left) == String(right);
        case "[object Number]":
          left = +left;
          right = +right;
          // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is
          // performed for other numeric values.
          return left != left ? right != right : (left ? left == right : (1 / left == 1 / right));
        // Coerce dates and booleans to numeric primitive values. Dates are
        // compared by their millisecond representations; invalid dates are not
        // equivalent.
        case "[object Date]":
        case "[object Boolean]":
          return +left == +right;
        // RegExps are compared by their source patterns, flags, and
        // last-matched index.
        case "[object RegExp]":
          return left.source == right.source &&
                 left.global == right.global &&
                 left.multiline == right.multiline &&
                 left.ignoreCase == right.ignoreCase &&
                 left.lastIndex == right.lastIndex;
      }
      if (typeof left != "object" || typeof right != "object") {
        return false;
      }
      // Assume equality for cyclic structures. The algorithm for detecting
      // cyclic structures is adapted from ES 5.1 section 15.12.3, abstract
      // operation `JO`. This is a linear search; performance is inversely
      // proportional to the number of unique nested objects.
      for (size = stack.length; size--;) {
        if (stack[size] == left) {
          return true;
        }
      }
      // Add the first object to the stack of traversed objects.
      stack.push(left);
      result = true;
      // Recursively compare objects and arrays.
      if (className == "[object Array]") {
        // Compare array lengths to determine if a deep comparison is necessary.
        size = left.length;
        result = size == right.length;
        if (result) {
          // Deep compare the contents, ignoring non-numeric properties.
          while (size--) {
            // Ensure commutative equality for sparse arrays.
            if (!(result = (size in left == size in right) && eq(left[size], right[size], stack))) {
              break;
            }
          }
        }
      } else {
        size = 0;
        // Deep compare objects.
        result = true;
        forOwn(left, function (key, value) {
          // Count the expected number of properties.
          size += 1;
          // Deep compare each own object member.
          return result = hasKey(right, key) && eq(value, right[key], stack);
        });
        // Ensure that both objects contain the same number of properties.
        if (result) {
          forOwn(right, function () {
            if (!(size--)) {
              return false;
            }
          });
          result = !size;
        }
      }
      // Remove the first object from the stack of traversed objects.
      stack.pop();
      return result;
    }

    // Define the top-level `equals` function.
    function equals() {
      for (var index = 0, length = arguments.length; index < length - 1;) {
        // Apply the comparison function left-to-right until all the provided
        // arguments have been consumed.
        if (!eq(arguments[index], arguments[index += 1], [])) {
          return false;
        }
      }
      return true;
    }

    return equals;
  })(),

  // **forEach** iterates over a `list` of elements, yielding to a `callback`
  // function on each iteration. If the `callback` explicitly returns `false`,
  // the loop will terminate.
  forEach = exports.forEach = function forEach(list, callback, context) {
    var index, length;
    if (Object(list) !== list) {
      throw TypeError("Invalid argument.");
    }
    for (index = 0, length = list.length >>> 0; index < length; index += 1) {
      if (call.call(callback, context, list[index], index, list) === false) {
        break;
      }
    }
    return list;
  },

  // **defer** attempts to execute a callback function asynchronously in supported
  // environments.
  defer = exports.defer = (function() {
    var defer, timer;
    // `process.nextTick` executes a function asynchronously in Node.
    if (Environment.nextTick) {
      defer = function defer(callback, context) {
        // `process.nextTick` is an efficient alternative to `setTimeout(..., 0)`.
        // As of Node 0.6.9, neither `process.nextTick` nor `setTimeout` isolate
        // execution; if the `callback` throws an exception, subsequent deferred
        // callbacks **will not execute**. This is an unfortunate incompatibility
        // with both the `setTimeout` function exposed in Browsers and Phantom,
        // and the Java `Timer` API exposed via LiveConnect in Rhino.
        function run() {
          call.call(callback, context);
        }
        process.nextTick(run);
      };
    // Browsers and Phantom provide the `setTimeout` function.
    } else if (Environment.setTimeout) {
      defer = function defer(callback, context) {
        function run() {
          call.call(callback, context);
        }
        setTimeout(run, 0);
      };
    // Mozilla Rhino's LiveConnect interface exposes the Java `Timer` API for
    // executing tasks in a background thread.
    } else if (Environment.java) {
      defer = function defer(callback, context) {
        timer = new java.util.Timer();
        function run() {
          // Terminate the background thread once the task runs. If the thread
          // is not terminated, the Rhino process will persist even after
          // execution is completed.
          timer.cancel();
          call.call(callback, context);
        }
        // Schedule the timer task for background execution. A new scheduler is
        // created for each task to ensure that exceptions do not leak between
        // tasks.
        timer.schedule(new JavaAdapter(java.util.TimerTask, { "run": run }), 0);
      };
      // Rhino 1.74R has a bug that prevents `JavaAdapter` to work with abstract
      // base classes.
      try {
        defer(function() {});
        Environment.javaAdapter = true;
      } catch(exception) {
        timer.cancel();
      }
    }
    // Execute the callback function synchronously in other environments.
    if (!defer || !Environment.javaAdapter) {
      defer = function defer(callback, context) {
        call.call(callback, context);
      };
    }
    return defer;
  }());

  // Internal: Re-throws an exception asynchronously, allowing all subsequent
  // callbacks to fire.
  function rethrow(exception) {
    defer(function () {
      throw exception;
    });
  }

  // Custom Events
  // -------------

  // `Spec.Events` provides an interface for managing custom events. You can
  // add and remove individual event handlers; triggering an event executes its
  // handlers in succession. Based on work by Jeremy Ashkenas.

  exports.Events = Events;
  function Events() {
    this.events = {};
  }

  // **addListener** attaches a `callback` function to an `event`. The callback
  // will be invoked whenever the event, specified by a string identifier, is
  // fired. If the `event` contains spaces, it is treated as a list of multiple
  // event types. If the optional `context` argument is provided, the `callback`
  // will be bound to it. Callbacks attached to the special `all` event will be
  // invoked for **all** triggered events.
  Events.prototype.on = Events.prototype.addListener = addListener;
  function addListener(event, callback, context) {
    if (event && callback) {
      forEach(event.split(" "), function (event) {
        var callbacks = hasKey(this.events, event) && this.events[event], target = callbacks ? callbacks.previous : {}, previous;
        target.next = previous = {};
        // Store the event handler and context.
        target.callback = callback;
        target.context = context;
        // Create a new event target node.
        this.events[event] = {
          "previous": previous,
          "next": callbacks ? callbacks.next : target
        };
      }, this);
    }
    return this;
  }

  // **removeListener** removes a previously-bound event handler. If the
  // `context` is omitted, all versions of the handler, including those bound to
  // different contexts, will be removed. If the `callback` is omitted, all
  // registered handlers for the given `event` will be removed. If both the
  // `callback` and `event` are omitted, **all** listeners for all events will
  // be removed.
  Events.prototype.removeListener = removeListener;
  function removeListener(event, callback, context) {
    if (!event) {
      // Remove all event listeners.
      this.events = {};
    } else if (this.events) {
      forEach(event.split(" "), function (event) {
        var target = hasKey(this.events, event) && this.events[event], previous;
        if (target) {
          // Remove the event listener registry.
          delete this.events[event];
          if (callback) {
            // Create a new registry without the given listener.
            previous = hasKey(target, "previous") && target.previous;
            for (; (target = hasKey(target, "next") && target.next) != previous;) {
              if (hasKey(target, "callback") && target.callback != callback || (context && (hasKey(target, "context") && target.context != context))) {
                this.on(event, target.callback, target.context);
              }
            }
          }
        }
      }, this);
    }
    return this;
  }

  // **emit** fires an event, specified by either a string identifier or an
  // event object with a `type` property. Multiple event types are not
  // supported for string identifiers.
  Events.prototype.emit = emit;
  function emit(event) {
    var target, type, previous, all, error;
    // Convert a string identifier into an event object.
    if (typeof event == "string" || getClass.call(event) == "[object String]") {
      event = { "type": event };
    }
    type = hasKey(event, "type") && event.type;
    // Capture a reference to the current event target.
    if (!hasKey(event, "target")) {
      event.target = this;
    }
    // Capture a reference to the callback registry for the `all` event.
    all = type != "all" && hasKey(this.events, "all") && this.events.all;
    if ((target = hasKey(this.events, type) && this.events[type])) {
      previous = hasKey(target, "previous") && target.previous;
      for (; (target = hasKey(target, "next") && target.next) != previous;) {
        // Execute the callbacks in succession.
        try {
          call.call(target.callback, hasKey(target, "context") && target.context || this, event);
        } catch (exception) {
          rethrow(exception);
        }
      }
    }
    // Fire the `all` event.
    if (all) {
      previous = hasKey(all, "previous") && all.previous;
      for (; (all = hasKey(all, "next") && all.next) != previous;) {
        try {
          call.call(all.callback, hasKey(all, "context") && all.context || this, event);
        } catch (exception) {
          rethrow(exception);
        }
      }
    }
    return this;
  }

  // Suites
  // ------

  // Suites are event-driven collections of unit tests. Using custom events, you
  // can create routines for setting up and tearing down tests, handling
  // assertions and failures, and logging test results.

  exports.Suite = Suite;

  // Creates a new suite with an optional `name`.
  function Suite(name) {
    Events.call(this);
    if (name != null) {
      this.name = name;
    }
    this.length = 0;
  }

  // The default suite name.
  Suite.prototype.name = "Anonymous Suite";

  // Add support for custom events.
  Suite.prototype = new Events();
  Suite.prototype.constructor = Suite;

  // Extend the `Suite` prototype with generic array methods.
  (function (prototype, methods) {
    for (var index = -1, method; method = methods[index += 1];) {
      prototype[method] = methods[method];
    }
  })(Suite.prototype, ["join", "pop", "push", "reverse", "shift", "sort", "splice", "unshift"]);

  // Shuffles the suite using a Fisher-Yates shuffle.
  Suite.prototype.shuffle = shuffle;
  function shuffle() {
    for (var value, index, length = this.length >>> 0; length;) {
      index = Math.floor(Math.random() * length);
      value = this[--length];
      this[length] = this[index];
      this[index] = value;
    }
    return this;
  }

  // Adds a test to the suite. The test name is optional.
  Suite.prototype.addTest = addTest;
  function addTest(name, test) {
    this.push(new Test(name, test));
    return this;
  }

  // Returns the index of the next available test relative to the given
  // `position`, or `null` if no additional tests are available.
  Suite.prototype.index = index;
  function index(position) {
    var length = this.length >>> 0, test;
    position || (position = 0);
    if (position < 0) {
      position = length + position;
    }
    for (; position < length; position += 1) {
      test = position in this && this[position];
      if (test && typeof test.constructor == "function" && test instanceof Test) {
        return position;
      }
    }
    return null;
  }

  // An event handler invoked each time a test in the suite emits an event.
  // This event handler updates the suite summary and prepares to run the next
  // test.
  Suite.prototype.onEvent = onSuiteEvent;
  function onSuiteEvent(event) {
    var target = event.target;
    // Proxy the fired event.
    this.emit(event);
    switch (event.type) {
      // Update the suite summary.
      case "assertion":
        this.assertions += 1;
        break;
      case "failure":
        this.failures += 1;
        break;
      case "teardown":
        // Unbind the internal event handler.
        target.removeListener("all", this.onEvent, this);
        if ((this.position = this.index(this.position += 1)) != null) {
          target = this[this.position];
          // Run the next test.
          defer(target.on("all", this.onEvent, this).run, target);
        } else {
          // Finish running the suite.
          this.emit("complete");
        }
    }
  }

  // Runs the suite.
  Suite.prototype.run = runSuite;
  function runSuite() {
    // Create the spec summary.
    var target;
    this.position = this.assertions = this.failures = 0;
    // Begin running the suite.
    this.emit("start");
    // Bind the internal event handler to the first test.
    if ((this.position = this.index(this.position)) != null) {
      target = this[this.position];
      // Run the first test.
      defer(target.on("all", this.onEvent, this).run, target);
    } else {
      // Finish running the suite.
      this.emit("complete");
    }
    return this;
  }

  // Tests
  // -----

  // Wraps a test function with convenience methods and assertions.
  exports.Test = Test;
  function Test(name, test) {
    Events.call(this);
    if (name && test == null) {
      test = name;
      name = null;
    }
    if (name != null) {
      this.name = name;
    }
    this.test = test;
    // Bind the helper event handler.
    this.on("all", this.onEvent, this);
  }

  // Add support for custom events.
  Test.prototype = new Events();
  Test.prototype.constructor = Test;

  // The default test name.
  Test.prototype.name = "Anonymous Test";

  // An event handler invoked each time a test emits an event.
  Test.prototype.onEvent = onTestEvent;
  function onTestEvent(event) {
    var expected;
    switch (event.type) {
      case "setup":
        this.assertions = this.failures = 0;
        break;
      case "assertion":
        this.assertions += 1;
        break;
      case "failure":
        this.failures += 1;
        break;
      case "teardown":
        expected = event.expected;
        // Verify that the expected number of assertions were executed.
        if ((typeof expected == "number" || getClass.call(expected) == "[object Number]") && expected != this.assertions) {
          this.emit({
            "type": "failure",
            "actual": this.assertions,
            "expected": expected,
            "message": "done"
          });
        }
    }
  }

  // **assert** creates a new assertion method with the given `name`. If the
  // provided `callback` function returns a falsy value, the assertion fails.
  Test.assert = assert;
  function assert(name, callback) {
    function assertion(actual, expected, message) {
      return this.ok(call.call(callback, this, actual, expected), {
        "actual": actual,
        "expected": expected,
        "message": message == null ? name : message
      });
    }
    return assertion;
  }

  // Runs the test.
  Test.prototype.run = runTest;
  function runTest() {
    this.emit("setup");
    // Pass the wrapper as the first argument to the test function.
    this.test(this);
    return this;
  }

  // **ok** tests whether an `expression` is truthy. The optional `message`
  // defaults to the name of the current assertion (e.g., `ok`).
  Test.prototype.ok = ok;
  function ok(expression, event) {
    if (Object(event) !== event) {
      event = {
        "actual": expression,
        "expected": true,
        "message": event == null ? "ok" : event
      };
    }
    // Note: To test for the boolean `true`, use the `strictEqual` assertion.
    event.type = expression ? "assertion" : "failure";
    return this.emit(event);
  }

  // **notOk** tests whether an `expression` is falsy.
  Test.prototype.notOk = notOk;
  function notOk(expression, message) {
    return this.ok(!expression, message == null ? "notOk" : message);
  }

  // **equal** tests whether `actual` is **equal** to `expected`, as determined
  // by the `==` operator.
  Test.prototype.equal = assert("equal", assertEqual);
  function assertEqual(actual, expected) {
    return actual == expected;
  }

  // **notEqual** tests for **loose** or coercive inequality.
  Test.prototype.notEqual = assert("notEqual", assertNotEqual);
  function assertNotEqual(actual, expected) {
    return actual != expected;
  }

  // **strictEqual** tests for **strict** equality (`actual === expected`).
  Test.prototype.strictEqual = assert("strictEqual", assertStrictEqual);
  function assertStrictEqual(actual, expected) {
    return actual === expected;
  }

  // **notStrictEqual** tests for strict inequality.
  Test.prototype.notStrictEqual = assert("notStrictEqual", assertStrictNotEqual);
  function assertStrictNotEqual(actual, expected) {
    return actual !== expected;
  }

  // **deepEqual** tests for deep equality and equivalence, as determined by the
  // `Spec.equals` function.
  Test.prototype.deepEqual = assert("deepEqual", equals);

  // **notDeepEqual** tests for deep inequality.
  Test.prototype.notDeepEqual = assert("notDeepEqual", assertNotDeepEqual);
  function assertNotDeepEqual(actual, expected) {
    return !equals(actual, expected);
  }

  // Ensures that the `callback` function throws an exception.
  Test.prototype.error = assertError;
  function assertError(callback, expected, message) {
    var ok = false, isFunction = typeof expected == "function";
    // Invalid expected value; the message was passed as the second argument.
    if (!isFunction && message == null) {
      message = expected;
      expected = null;
    }
    try {
      callback();
    } catch (exception) {
      ok = expected == null || (isFunction && call.call(expected, this, exception, this));
    }
    return this.ok(ok, message == null ? "error" : message);
  }

  // Ensures that the `callback` function does not throw any exceptions.
  Test.prototype.noError = assertNoError;
  function assertNoError(callback, message) {
    var ok = true;
    try {
      callback();
    } catch (exception) {
      ok = false;
    }
    return this.ok(ok, message == null ? "noError" : message);
  }

  // **done** completes a test with an optional number of expected `assertions`.
  // This method **must** be called at the end of each test.
  Test.prototype.done = done;
  function done(assertions) {
    return this.emit({
      "type": "teardown",
      "expected": assertions
    });
  }
  return exports;
});
