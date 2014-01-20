/*!
 * Newton: a utility library for Spec
 * Provides logging and basic introspection functions.
 *
 * Copyright 2012, Kit Cambridge
*/

;(function (root, definition) {
  // Detect asynchronous module loaders and CommonJS environments.
  var isLoader = typeof define == "function" && !!define.amd;
  var isModule = typeof require == "function" && typeof exports == "object" && exports && !isLoader;

  // Weak object inferences for detecting browsers and JS engines.
  var isBrowser = "window" in root && root.window == root && typeof root.navigator != "undefined";
  var isEngine = !isBrowser && !isModule && typeof root.load == "function";

  var Environment = {
    "isLoader": isLoader,
    "isModule": isModule,
    "isBrowser": isBrowser,
    "isEngine": isEngine,
    "document": null
  };

  if (isBrowser) {
    Environment.document = root.document;
  }

  if (isLoader) {
    // Export the plugin for asynchronous module loaders.
    define(["exports", "spec"], function (exports, Spec) {
      return definition(Environment, exports, Spec);
    });
  } else if (isModule) {
    // Export for CommonJS environments.
    try {
      // Load Spec.
      var Spec = require("./spec");
    } catch (exception) {}
    definition(Environment, exports, Spec || {});
  } else {
    // Export for web browsers and JavaScript engines.
    var Newton = definition(Environment, (root.Newton = {
      "noConflict": (function (original) {
        function noConflict() {
          root.Newton = original;
          return Newton;
        }
        return noConflict;
      })(root.Newton)
    }), root.Spec || {});
  }
})(this, function (Environment, exports, Spec) {
  "use strict";

  // Convenience aliases.
  var getClass = {}.toString, document = Environment.document,

  // **stringify** returns a debug-oriented representation of an object, similar to
  // `JSON.stringify`. Objects are serialized according to a superset of the JSON encoding
  // algorithm.
  stringify = exports.stringify = (function () {
    function stringify(object) {
      return serialize(object, []);
    }

    // Converts `value` into a zero-padded string such that its length is at
    // least equal to `width`. The `width` must be <= 6.
    function toPaddedString(width, value) {
      return ("000000" + value).slice(-width);
    }

    // Maps control characters to their escaped equivalents.
    var Escapes = {
      "\\": "\\\\",
      '"': '\\"',
      "\b": "\\b",
      "\f": "\\f",
      "\n": "\\n",
      "\r": "\\r",
      "\t": "\\t"
    };

    // Double-quotes a string, replacing all ASCII control characters with their
    // escaped equivalents.
    function quote(value) {
      var result = '"', index = 0, symbol;
      for (; symbol = value.charAt(index); index += 1) {
        // Escape the reverse solidus, double quote, backspace, form feed, line
        // feed, carriage return, and tab characters.
        result += '\\"\b\f\n\r\t'.indexOf(symbol) > -1 ? Escapes[symbol] :
          // If the character is a control character, append its Unicode escape
          // sequence; otherwise, append the character as-is.
          symbol < " " ? "\\u" + toPaddedString(4, symbol.charCodeAt(0).toString(16)) : symbol;
      }
      return result + '"';
    }

    // `serialize` recursively serializes an object.
    function serialize(value, stack) {
      var className, length, element, result, year;
      if (value == null) {
        return "null";
      }
      className = getClass.call(value);
      switch (className) {
        case "[object Number]":
        case "[object Boolean]":
          // JSON numbers must be finite. `Infinity` and `NaN` are converted
          // to `"null"`.
          return isEmpty(value) ? "null" : "" + value;
        case "[object String]":
          // Strings are double-quoted and escaped.
          return quote(value);
        case "[object Date]":
          if (isEmpty(value)) {
            return "null";
          }
          // Dates are serialized according to the `Date.toJSON` method
          // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15 for
          // the ISO 8601 date time string format.
          year = value.getUTCFullYear();
          // Serialize extended years correctly.
          return '"' + (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, Math.abs(year)) : toPaddedString(4, year)) +
            "-" + toPaddedString(2, value.getUTCMonth() + 1) + "-" + toPaddedString(2, value.getUTCDate()) +
            // Months, dates, hours, minutes, and seconds should have two
            // digits; milliseconds should have three.
            "T" + toPaddedString(2, value.getUTCHours()) + ":" + toPaddedString(2, value.getUTCMinutes()) + ":" + toPaddedString(2, value.getUTCSeconds()) +
            // Milliseconds are optional in ES 5.0, but required in 5.1.
            "." + toPaddedString(3, value.getUTCMilliseconds()) + 'Z"';
        case "[object RegExp]":
          return substitute('{"source": %s, "global": %s, "ignoreCase": %s, "multiline": %s}', quote(value.source), value.global, value.ignoreCase, value.multiline);
      }
      // Recursively serialize objects and arrays.
      if (typeof value == "object") {
        // ES 5.1 section 15.12.3 dictates that JSON structures must be acyclic.
        // `stringify` replaces all circular references with `null` to avoid
        // infinite recursion.
        for (length = stack.length; length--;) {
          if (stack[length] == value) {
            return "null";
          }
        }
        // Add the object to the stack of traversed objects.
        stack.push(value);
        result = [];
        if (className == "[object Array]") {
          // Recursively serialize array elements.
          for (length = value.length; length--;) {
            if (length in value) {
              result[length] = serialize(value[length], stack);
            }
          }
          return "[" + result.join(", ") + "]";
        } else {
          Spec.forOwn(value, function (key, value) {
            // Recursively serialize object members.
            result.push(quote(key) + ": " + serialize(value, stack));
          });
          return "{" + result.join(", ") + "}";
        }
        // Remove the object from the traversed object stack.
        stack.pop();
      }
      return "null";
    }

    return stringify;
  })(),

  // **all** determines whether the callback returns `true` for all object
  // members.
  all = exports.all = function all(object, callback, context) {
    var result = true;
    Spec.forOwn(object, function (key, value, object) {
      return result = !!callback.call(context, key, value, object);
    });
    return result;
  },

  // Internal; produces an encoded `parameter=value` pair.
  toQueryPair = function toQueryPair(parameter, value) {
    parameter = encodeURIComponent(parameter);
    if (value == null) {
      return parameter;
    }
    switch (getClass.call(value)) {
      case "[object String]":
      case "[object Number]":
      case "[object Boolean]":
        return parameter + "=" + encodeURIComponent(value);
    }
  },

  // **serializeQuery** returns a query string containing the contents of the
  // `map` serialized as `parameter=value` pairs. `null` and `undefined` values
  // produce parameters without value portions; array values produce
  // identically-named parameters for each element. All values are encoded using
  // the `encodeURIComponent` function. The order of the pairs in the resulting
  // string is not guaranteed.
  serializeQuery = exports.serializeQuery = function serializeQuery(map, separator) {
    var result = [], member;
    Spec.forOwn(map, function (parameter, value) {
      if (value && getClass.call(value) == "[object Array]") {
        Spec.forEach(value, function (value) {
          var member = toQueryPair(parameter, value);
          if (member) {
            result.push(member);
          }
        });
      } else if ((member = toQueryPair(parameter, value))) {
        result.push(member);
      }
    });
    return result.join(separator || "&");
  },

  // **parseQuery** parses a query `string` and returns an object containing
  // the URL-decoded `parameter=value` pairs. If the `string` contains a `?` or
  // `#` character, all characters before the `?` and after the `#` are ignored.
  // The values of identical parameters (e.g., `a=1&a=2`) are aggregated into an
  // array of values. Parameters without corresponding values are set to `null`.
  // The `separator` argument is optional, and defaults to `"&"`.
  parseQuery = exports.parseQuery = function parseQuery(string, separator) {
    var match = ("" + string).split("?"), results = {}, member, parameter, value, index, position, members, length;
    // Ensure that the given value contains a query string.
    if (match.length > 1 && !match[1] || !(((match = (match = match[1] || match[0]).split("#"))) && (match = match[0].split(" ")[0]))) {
      return results;
    }
    members = match.split(separator || "&");
    for (index = 0, length = members.length; index < length; index += 1) {
      value = null;
      position = (member = members[index]).indexOf("=");
      if (member && position) {
        if (position > -1) {
          parameter = decodeURIComponent(member.slice(0, position));
          if ((value = member.slice(position + 1))) {
            value = decodeURIComponent(value);
          }
        } else {
          parameter = member;
        }
        if (Spec.hasKey(results, parameter)) {
          if (getClass.call(results[parameter]) != "[object Array]") {
            results[parameter] = [results[parameter]];
          }
          results[parameter].push(value);
        } else {
          results[parameter] = value;
        }
      }
    }
    return results;
  },

  // **isEmpty** checks if the given `value` is empty.
  isEmpty = exports.isEmpty = function isEmpty(value) {
    var result;
    if (value == null) {
      return true;
    }
    switch (getClass.call(value)) {
      case "[object Number]":
      case "[object Date]":
        // `NaN` values are considered empty.
        value = +value;
        return value != value || false;
      case "[object Boolean]":
      case "[object Function]":
      case "[object RegExp]":
        return false;
      case "[object String]":
      case "[object Array]":
        return !value.length;
      default:
        return all(function () {
          return false;
        }, value);
    }
  },

  // **substitute** formats a string containing `sprintf`-style specifiers by
  // successively interpolating the provided replacement arguments.
  substitute = exports.substitute = function substitute(value) {
    var result, argument, index, length, symbol, directive;
    value = "" + value;
    if (value.indexOf("%") < 0 || arguments.length < 2) {
      return value;
    }
    for (result = "", argument = 1, index = 0, length = value.length; index < length; index += 1) {
      symbol = value.charAt(index);
      if (symbol == "%") {
        directive = value.charAt(index + 1);
        if (directive == "%") {
          // Escape sequence; append a literal `%` character.
          result += directive;
        } else {
          if (argument in arguments) {
            // Format replacement arguments according to the directive.
            switch (directive) {
              // Floor integers. `NaN` is converted to `0`.
              case "i":
              case "d":
                result += Math.floor(arguments[argument]) || 0;
                break;
              // Represent floating-point values as-is.
              case "f":
                result += +arguments[argument] || 0;
                break;
              // Serialize objects.
              case "o":
                result += stringify(arguments[argument]);
                break;
              // Coerce all other values to strings.
              default:
                result += arguments[argument];
            }
          } else {
            // No replacement argument; append the format specifier as-is.
            result += symbol + directive;
          }
          // Use the next replacement argument for the subsequent interpolation.
          argument += 1;
        }
        index += 1;
      } else {
        result += symbol;
      }
    }
    return result;
  },

  // **createConsole** creates a new console-based logger.
  createConsole = exports.createConsole = function createConsole(print) {
    function onEvent(event) {
      switch (event.type) {
        case "start":
          print(substitute("Started spec `%s`.", this.name));
          break;
        case "setup":
          print(substitute("Started test `%s`.", event.target.name));
          break;
        case "assertion":
          print(substitute("Assertion: %s.", event.message));
          break;
        case "failure":
          print(substitute("Failure: %s. Expected: %o. Actual: %o.", event.message, event.expected, event.actual));
          break;
        case "teardown":
          print(substitute("Finished test `%s`. %d assertions, %d failures.", event.target.name, event.target.assertions, event.target.failures));
          break;
        case "complete":
          print(substitute("Finished spec `%s`. %d assertions, %d failures.", this.name, this.assertions, this.failures));
      }
    }
    return onEvent;
  },

  // **createTAP** creates a new TAP-based reporter.
  createTAP = exports.createTAP = function createTAP(print) {
    var testNumber = 0;
    // Sanitize TAP descriptions by removing directive delimiter.
    function description(description) {
      return description.replace(/#/g, '');
    }
    function onEvent(event) {
      switch (event.type) {
        case "assertion":
          print(substitute("ok %d %s", ++testNumber, description(event.message)));
          break;
        case "failure":
          print(substitute("not ok %d %s", ++testNumber, description(event.message)));
          print(substitute("    Expected: %o", event.expected));
          print(substitute("    Actual: %o",  event.actual));
          break;
        case "complete":
          print(substitute("# tests %d", testNumber));
          print(substitute("# pass %d", this.assertions));
          print(substitute("# fail %d", this.failures));
          print(substitute("%d..%d", 1, this.assertions + this.failures));
          break;
      }
    }
    return onEvent;
  },

  // DOM-only methods.
  onClick, buildNode, clearElement, createReport;

  if (document) {
    // Internal; expands and collapses the test message list.
    onClick = function onClick() {
      // The event target is the list of messages.
      var target = this.parentNode && this.parentNode.childNodes[1];
      if (target) {
        target.style.display = target.style.display == "none" ? "" : "none";
      }
    };

    // **buildNode** creates and returns a new element with the given `tagName`,
    // DOM `properties`, and `children`.
    buildNode = exports.buildNode = (function () {
      // Internal: Tests whether `document.createElement` supports the MSHTML
      // extended syntax. This syntax is necessary for setting the `name` and
      // `type` properties of elements, which are read-only in IE 7 and earlier.
      var supportsExtendedElementSyntax = (function () {
        var element, result = false;
        try {
          element = document.createElement("<input name=a type=b>");
          result = element.name == "a" && element.type == "b";
        } catch (exception) {}
        element = null;
        return result;
      })(),

      // Internal: Detect the style property name used to set the `float`
      // property: `cssFloat` in DOM Level 2-compliant browsers; `styleFloat` in
      // IE <= 8.
      cssFloat = "styleFloat" in document.createElement("div").style ? "styleFloat" : "cssFloat",

      // Internal: Elements used to convert HTML special characters to their
      // entity equivalents.
      textElement = document.createElement("pre"),
      textNode = textElement.appendChild(document.createTextNode("")),

      // Internal: Returns an attribute string comprising the given attribute
      // `name` and `value`.
      serializeAttribute = function serializeAttribute(name, value) {
        textNode.data = "" + value;
        return name + '="' + textElement.innerHTML.replace(/"/g, "&quot;") + '"';
      },

      // Expose the `buildNode` function.
      buildNode = function buildNode(tagName, properties, children) {
        var hasProperties, element, property, length, value;
        if (properties && getClass.call(properties) == "[object Array]") {
          children = properties;
          properties = null;
        } else {
          hasProperties = Object(properties) === properties;
        }
        // Set the read-only `name` and `type` properties in IE.
        if (hasProperties && supportsExtendedElementSyntax) {
          tagName = "<" + tagName;
          if (Spec.hasKey(properties, "name")) {
            tagName += " " + serializeAttribute("name", properties.name);
            delete properties.name;
          }
          if (Spec.hasKey(properties, "type")) {
            tagName += " " + serializeAttribute("type", properties.type);
            delete properties.type;
          }
          tagName += ">";
        }
        element = document.createElement(tagName);
        // Set the corresponding element and style properties.
        if (hasProperties) {
          if (Spec.hasKey(properties, "style")) {
            Spec.forOwn(properties.style, function (property, value) {
              // Normalize the `float` style property.
              element.style[(1, (/(?:style|css)Float/).test(property) ? cssFloat : property)] = value;
            });
            delete properties.style;
          }
          Spec.forOwn(properties, function (property, value) {
            element[property] = value;
          });
        }
        // Append any child elements.
        if (Object(children) === children) {
          Spec.forEach(children, function (value) {
            element.appendChild(value);
          });
        }
        return element;
      };
      return buildNode;
    })();

    // **clearElement** removes all child nodes from the given `element`.
    clearElement = function clearElement(element) {
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
      return element;
    };

    // **createReport** creates a new QUnit-style web logger, returning an event
    // handler that can be attached to a Spec suite.
    createReport = exports.createReport = function createReport(element) {
      function onEvent(event) {
        var type = event.type, target = event.target, messages, message;
        if (getClass.call(element) == "[object String]") {
          element = document.getElementById(element);
        }
        if (!element) {
          throw TypeError(substitute("Invalid logger element: `%o`.", element));
        }
        switch (type) {
          // Clear the previous test results and initialize the logger elements.
          case "start":
            // Clear the previous test results.
            clearElement(element);
            // Re-initialize the logger elements.
            this.elements = {
              "header": element.appendChild(buildNode("h1", { "className": "suiteHeader" }, [document.createTextNode(this.name)])),
              // Representing the status of the suite (e.g., running, passed, failed).
              "status": element.appendChild(buildNode("div", { "className": "suiteStatus suiteRunning" })),
              // Contains the aggregate suite results.
              "results": element.appendChild(buildNode("ol", { "className": "testList" })),
              // Contains the aggregate suite summary.
              "stats": element.appendChild(buildNode("p", { "className": "suiteSummary" }, [document.createTextNode("Running...")]))
            };
            break;
          // Create a new element to display the results of the current test.
          case "setup":
            // Attach the internal event handler to the element.
            this.elements.results.appendChild(buildNode("li", { "className": "testBlock testRunning" }, [
              buildNode("strong", { "onclick": onClick, "className": "testName" }, [document.createTextNode(target.name)])
            ]));
            break;
          // Update the status of the current test.
          case "teardown":
            this.elements.results.childNodes[this.position].className = target.failures ? "testBlock testFailed" : "testBlock testPassed";
            break;
          // Update the suite status and cumulative summary.
          case "complete":
            // Set the spec status.
            this.elements.status.className = target.failures ? "suiteStatus suiteFailed" : "suiteStatus suitePassed";
            // Create the aggregate spec summary.
            clearElement(this.elements.stats).appendChild(document.createTextNode(substitute("%d assertions, %d failures.", target.assertions, target.failures)));
            // Clean up.
            delete this.elements;
            break;
          case "assertion":
          case "failure":
            // Create the message list if it doesn't already exist.
            if (!(messages = this.elements.results.childNodes[this.position].childNodes[1])) {
              // Hide the messages by default.
              messages = buildNode("ol", { "className": "assertionList", "style": { "display": "none" } });
              this.elements.results.childNodes[this.position].appendChild(messages);
            }
            // Create a new message.
            message = type == "assertion" ?
              // `assertion` is fired when an assertion succeeds.
              buildNode("li", { "className": "assertionPassed" }, [
                document.createTextNode(event.message)
              ]) :
              // `failure` is fired when an assertion fails.
              buildNode("li", { "className": "assertionFailed" }, [
                // Add the message to the list of messages.
                document.createTextNode(event.message),
                // Format and show the expected value.
                buildNode("span", { "className": "failureExpected" },
                  // Convert the expected value to JSON.
                  [document.createTextNode("Expected: "), buildNode("code", { "className": "jsonValue" }, [
                    document.createTextNode(stringify(event.expected))
                  ])]),
                // Format and show the actual value.
                buildNode("span", { "className": "failureActual" },
                  // Convert the actual value to JSON.
                  [document.createTextNode("Actual: "), buildNode("code", { "className": "jsonValue" }, [
                    document.createTextNode(stringify(event.actual))
                  ])])
              ]);
            // Show the message.
            messages.appendChild(message);
        }
      }
      return onEvent;
    };
  }

  // Expose the environment information.
  exports.Environment = Environment;

  return exports;
});
