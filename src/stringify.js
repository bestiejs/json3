var attempt = require("./attempt"),
    toPaddedString = require("./toPaddedString");

var undefined;

module.exports = makeStringify;
function makeStringify(getClass, forOwn, newTypeError) {
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
        // Convert the `width` to an integer and make a string containing
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
