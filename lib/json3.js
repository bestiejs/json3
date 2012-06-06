/*! JSON v3.2.2 | http://bestiejs.github.com/json3 | Copyright 2012, Kit Cambridge | http://kit.mit-license.org */
;(function () {
  // Convenience aliases.
  var getClass = {}.toString, floor = Math.floor, isProperty, interpolate, forEach, undef;

  // Set up the `JSON5` namespace.
  var JSON5 = typeof exports == "object" && exports || (this.JSON5 || (this.JSON5 = {}));

  // Internal: Closure variables and utility methods.
  var Escapes, toPaddedString, quote, serialize;
  var fromCharCode, Unescapes, abort, lex, get, walk, update, Index, Source;

  // A mapping between the months of the year and the number of days between
  // January 1st and the first of the respective month.
  var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

  // Internal: Calculates the number of days between the Unix epoch and the
  // first day of the given month.
  var getDay = function (year, month) {
    return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
  };

  // Internal: Determines if a property is a direct property of the given
  // object. Delegates to the native `Object#hasOwnProperty` method.
  if (!(isProperty = {}.hasOwnProperty)) {
    isProperty = function (property) {
      var members = {}, constructor;
      if ((members.__proto__ = null, members.__proto__ = {
        // The *proto* property cannot be set multiple times in recent
        // versions of Firefox and SeaMonkey.
        "toString": 1
      }, members).toString != getClass) {
        // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
        // supports the mutable *proto* property.
        isProperty = function (property) {
          // Capture and break the object's prototype chain (see section 8.6.2
          // of the ES 5.1 spec). The parenthesized expression prevents an
          // unsafe transformation by the Closure Compiler.
          var original = this.__proto__, result = property in (this.__proto__ = null, this);
          // Restore the original prototype chain.
          this.__proto__ = original;
          return result;
        };
      } else {
        // Capture a reference to the top-level `Object` constructor.
        constructor = members.constructor;
        // Use the `constructor` property to simulate `Object#hasOwnProperty` in
        // other environments.
        isProperty = function (property) {
          var parent = (this.constructor || constructor).prototype;
          return property in this && !(property in parent && this[property] === parent[property]);
        };
      }
      members = null;
      return isProperty.call(this, property);
    };
  }

  // Internal: Substitutes named parameters with their corresponding `values`
  // in a `source` string.
  interpolate = function (source, values) {
    var pattern = /#\{(.*?)\}/g, result = "", lastIndex = 0, match, name;
    while ((match = pattern.exec(source))) {
      result += source.slice(lastIndex, match.index);
      lastIndex = match.index + match[0].length;
      name = match[1];
      result += isProperty.call(values, name) ? values[name] : "";
    }
    if (lastIndex < source.length) {
      result += source.slice(lastIndex);
    }
    return result;
  };

  // Internal: Normalizes the `for...in` iteration algorithm across
  // environments. Each enumerated key is yielded to a `callback` function.
  forEach = function (object, callback) {
    var size = 0, Properties, members, property, forEach = "return function (object, callback) {" +
      "var isFunction = getClass.call(object) == '[object Function]', property #{initialize};" +
      "for (property in object) {" +
        "if (!(isFunction && property == 'prototype') #{precondition} && isProperty.call(object, property) #{postcondition}) {" +
          "callback(property);" +
        "}" +
      "}" +
      "#{compatibility}" +
    "}";

    // Tests for bugs in the current environment's `for...in` algorithm. The
    // `valueOf` property inherits the non-enumerable flag from
    // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
    (Properties = function () {
      this.valueOf = 0;
    }).prototype.valueOf = 0;

    // Iterate over a new instance of the `Properties` class.
    members = new Properties();
    for (property in members) {
      // Ignore all properties inherited from `Object.prototype`.
      if (isProperty.call(members, property)) {
        size++;
      }
    }
    Properties = members = null;

    // Normalize the iteration algorithm.
    if (!size) {
      // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
      // properties. Mozilla and Netscape enumerate the `prototype` property
      // of functions; IE does not.
      forEach = interpolate(forEach, {
        // A list of non-enumerable properties inherited from the `Object`
        // prototype. The callback is automatically invoked for each property.
        "compatibility": "valueOf,toString,toLocaleString,propertyIsEnumerable,isPrototypeOf,hasOwnProperty,constructor".replace(/(\w+),/g, "if (isProperty.call(object, '$1')) callback(property);")
      });
    } else if (size == 2) {
      // Safari <= 2.0.4 enumerates shadowed properties twice.
      forEach = interpolate(forEach, {
        // `members` is a set of iterated properties.
        "initialize": ", members = {}",
        // Store each property name to prevent double enumeration. The
        // `prototype` property of functions is not enumerated due to cross-
        // environment inconsistencies.
        "precondition": "&& !isProperty.call(members, property) && (members[property] = 1)"
      });
    } else {
      // No bugs detected; use the standard `for...in` algorithm.
      forEach = interpolate(forEach, {
        "initialize": ", isConstructor",
        "postcondition": "&& !(isConstructor = property == 'constructor')",
        // Manually invoke the callback for the `constructor` property due to
        // cross-environment inconsistencies.
        "compatibility": "if (isConstructor || isProperty.call(object, (property = 'constructor'))) callback(property);"
      })
    }
    forEach = Function("getClass", "isProperty", forEach)(getClass, isProperty);
    return forEach(object, callback);
  };

  // Public: Serializes a JavaScript `value` as a JSON string. The optional
  // `filter` argument may specify either a function that alters how object and
  // array members are serialized, or an array of strings and numbers that
  // indicates which properties should be serialized. The optional `width`
  // argument may be either a string or number that specifies the indentation
  // level of the output.
  // Internal: A map of control characters and their escaped equivalents.
  Escapes = {
    "\\": "\\\\",
    '"': '\\"',
    "\b": "\\b",
    "\f": "\\f",
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t"
  };

  // Internal: Converts `value` into a zero-padded string such that its
  // length is at least equal to `width`. The `width` must be <= 6.
  toPaddedString = function (width, value) {
    // The `|| 0` expression is necessary to work around a bug in
    // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
    return ("000000" + (value || 0)).slice(-width);
  };

  // Internal: Double-quotes a string `value`, replacing all ASCII control
  // characters (characters with code unit values between 0 and 31) with
  // their escaped equivalents. This is an implementation of the
  // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
  quote = function (value) {
    var result = '"', index = 0, symbol;
    for (; symbol = value.charAt(index); index++) {
      // Escape the reverse solidus, double quote, backspace, form feed, line
      // feed, carriage return, and tab characters.
      result += '\\"\b\f\n\r\t'.indexOf(symbol) > -1 ? Escapes[symbol] :
        // If the character is a control character, append its Unicode escape
        // sequence; otherwise, append the character as-is.
        symbol < " " ? "\\u00" + toPaddedString(2, symbol.charCodeAt(0).toString(16)) : symbol;
    }
    return result + '"';
  };

  // Internal: Recursively serializes an object. Implements the
  // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
  serialize = function (property, object, callback, properties, whitespace, indentation, stack) {
    var value = object[property], className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, any;
    if (typeof value == "object" && value) {
      className = getClass.call(value);
      if (className == "[object Date]" && !isProperty.call(value, "toJSON")) {
        if (value > -1 / 0 && value < 1 / 0) {
          // Dates are serialized according to the `Date#toJSON` method
          // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
          // for the ISO 8601 date time string format.
          if (getDay) {
            // Manually compute the year, month, date, hours, minutes,
            // seconds, and milliseconds if the `getUTC*` methods are
            // buggy. Adapted from @Yaffle's `date-shim` project.
            date = floor(value / 864e5);
            for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
            for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
            date = 1 + date - getDay(year, month);
            // The `time` value specifies the time within the day (see ES
            // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
            // to compute `A modulo B`, as the `%` operator does not
            // correspond to the `modulo` operation for negative numbers.
            time = (value % 864e5 + 864e5) % 864e5;
            // The hours, minutes, seconds, and milliseconds are obtained by
            // decomposing the time within the day. See section 15.9.1.10.
            hours = floor(time / 36e5) % 24;
            minutes = floor(time / 6e4) % 60;
            seconds = floor(time / 1e3) % 60;
            milliseconds = time % 1e3;
          } else {
            year = value.getUTCFullYear();
            month = value.getUTCMonth();
            date = value.getUTCDate();
            hours = value.getUTCHours();
            minutes = value.getUTCMinutes();
            seconds = value.getUTCSeconds();
            milliseconds = value.getUTCMilliseconds();
          }
          // Serialize extended years correctly.
          value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
            "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
            // Months, dates, hours, minutes, and seconds should have two
            // digits; milliseconds should have three.
            "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
            // Milliseconds are optional in ES 5.0, but required in 5.1.
            "." + toPaddedString(3, milliseconds) + "Z";
        } else {
          value = null;
        }
      } else if (typeof value.toJSON == "function" && ((className != "[object Number]" && className != "[object String]" && className != "[object Array]") || isProperty.call(value, "toJSON"))) {
        // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
        // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
        // ignores all `toJSON` methods on these objects unless they are
        // defined directly on an instance.
        value = value.toJSON(property);
      }
    }
    if (callback) {
      // If a replacement function was provided, call it to obtain the value
      // for serialization.
      value = callback.call(object, property, value);
    }
    if (value === null) {
      return "null";
    }
    className = getClass.call(value);
    if (className == "[object Boolean]") {
      // Booleans are represented literally.
      return "" + value;
    } else if (className == "[object Number]") {
      // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
      // `"null"`.
      return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
    } else if (className == "[object String]") {
      // Strings are double-quoted and escaped.
      return quote(value);
    }
    // Recursively serialize objects and arrays.
    if (typeof value == "object") {
      // Check for cyclic structures. This is a linear search; performance
      // is inversely proportional to the number of unique nested objects.
      for (length = stack.length; length--;) {
        if (stack[length] === value) {
          // Cyclic structures cannot be serialized by `JSON.stringify`.
          throw TypeError();
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
        for (index = 0, length = value.length; index < length; any || (any = true), index++) {
          element = serialize(index, value, callback, properties, whitespace, indentation, stack);
          results.push(element === undef ? "null" : element);
        }
        return any ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
      } else {
        // Recursively serialize object members. Members are selected from
        // either a user-specified list of property names, or the object
        // itself.
        forEach(properties || value, function (property) {
          var element = serialize(property, value, callback, properties, whitespace, indentation, stack);
          if (element !== undef) {
            // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
            // is not the empty string, let `member` {quote(property) + ":"}
            // be the concatenation of `member` and the `space` character."
            // The "`space` character" refers to the literal space
            // character, not the `space` {width} argument provided to
            // `JSON.stringify`.
            results.push(quote(property) + ":" + (whitespace ? " " : "") + element);
          }
          any || (any = true);
        });
        return any ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
      }
      // Remove the object from the traversed object stack.
      stack.pop();
    }
  };

  // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.
  JSON5.stringify = function (source, filter, width) {
    var whitespace, callback, properties, index, length, value;
    if (typeof filter == "function" || typeof filter == "object" && filter) {
      if (getClass.call(filter) == "[object Function]") {
        callback = filter;
      } else if (getClass.call(filter) == "[object Array]") {
        // Convert the property names array into a makeshift set.
        properties = {};
        for (index = 0, length = filter.length; index < length; value = filter[index++], ((getClass.call(value) == "[object String]" || getClass.call(value) == "[object Number]") && (properties[value] = 1)));
      }
    }
    if (width) {
      if (getClass.call(width) == "[object Number]") {
        // Convert the `width` to an integer and create a string containing
        // `width` number of space characters.
        if ((width -= width % 1) > 0) {
          for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
        }
      } else if (getClass.call(width) == "[object String]") {
        whitespace = width.length <= 10 ? width : width.slice(0, 10);
      }
    }
    // Opera <= 7.54u2 discards the values associated with empty string keys
    // (`""`) only if they are used directly within an object member list
    // (e.g., `!("" in { "": 1})`).
    return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", []);
  };

  // Public: Parses a JSON source string.
  fromCharCode = String.fromCharCode;
  // Internal: A map of escaped control characters and their unescaped
  // equivalents.
  Unescapes = {
    "\\": "\\",
    '"': '"',
    "'": "'",
    "/": "/",
    "b": "\b",
    "t": "\t",
    "n": "\n",
    "f": "\f",
    "r": "\r"
  };

  // Internal: Resets the parser state and throws a `SyntaxError`.
  abort = function(message) {
    Index = Source = null;
    throw SyntaxError(message);
  };

  // Internal: Returns the next token, or `"$"` if the parser has reached
  // the end of the source string. A token may be a string, number, `null`
  // literal, or Boolean literal.
  lex = function () {
    var source = Source, length = source.length, symbol, value, begin, position, sign;
    while (Index < length) {
      symbol = source.charAt(Index);
      if (symbol <= " ") {
        // Skip whitespace and control characters.
        Index++;
      } else if ("{}[]:,".indexOf(symbol) > -1) {
        // Lex a punctuator token at the current position.
        Index++;
        return symbol;
      } else if (symbol == "/") {
        // Lex a line or block comment at the current position.
        symbol = source.charAt(++Index);
        if (symbol == "/") {
          // Skip line comments.
          position = source.indexOf("\n", Index);
          if (position < 0) {
            // Support CR-style line endings.
            position = source.indexOf("\r", Index);
          }
          Index = position < 0 ? length : position;
        } else if (symbol == "*") {
          // Skip block comments.
          position = source.indexOf("*/", Index);
          if (position < 0) {
            abort("Unterminated block comment.");
          }
          // Advance the scanner's position past the end of the comment.
          Index = position + 2;
        } else {
          abort("Invalid comment.");
        }
      } else if (symbol == '"' || symbol == "'") {
        // Save the string delimiter character.
        sign = symbol;
        // Advance to the next character and parse a single- or double-quoted
        // string at the current position. String tokens are prefixed with the
        // sentinel `@` character to distinguish them from punctuators and
        // identifiers.
        for (value = "@", Index++; Index < length;) {
          symbol = source.charAt(Index);
          if (symbol < " ") {
            abort("Unescaped control character in string.");
          } else if (symbol == "\\") {
            // Parse escaped JSON control characters, `"`, `\`, `/`, and
            // Unicode escape sequences.
            symbol = source.charAt(++Index);
            if (symbol == "\r" || symbol == "\n") {
              // Escaped literal carriage returns (including CRLF-style line
              // endings) and line feeds are permitted.
              Index = Index + ((symbol == "\r" && source.charAt(Index + 1) == "\n") ? 2 : 1);
            } else if ('\\"\'/btnfr'.indexOf(symbol) > -1) {
              // Revive escaped control characters.
              value += Unescapes[symbol];
              Index++;
            } else if (symbol == "u") {
              // Advance to the first character of the escape sequence.
              begin = ++Index;
              // Validate the Unicode escape sequence.
              for (position = Index + 4; Index < position; Index++) {
                symbol = source.charAt(Index);
                // A valid sequence comprises four hexdigits that form a
                // single hexadecimal value.
                if (!(symbol >= "0" && symbol <= "9" || symbol >= "a" && symbol <= "f" || symbol >= "A" && symbol <= "F")) {
                  abort("Invalid Unicode escape sequence in string.");
                }
              }
              // Revive the escaped character.
              value += fromCharCode("0x" + source.slice(begin, Index));
            } else {
              abort("Invalid escape sequence in string");
            }
          } else {
            if (symbol == sign) {
              // An unescaped delimiter marks the end of the string.
              break;
            }
            // Append the original character as-is.
            value += symbol;
            Index++;
          }
        }
        if (source.charAt(Index) == sign) {
          Index++;
          // Return the revived string.
          return value;
        }
        abort("Unterminated string.");
      } else {
        // Parse numbers and literals.
        begin = Index;
        // Advance the scanner's position past the sign, if one is
        // specified.
        if (symbol == "-") {
          sign = true;
          symbol = source.charAt(++Index);
        }
        // Parse an integer, floating-point value, or hexadecimal value.
        // Leading decimal points are permitted.
        if (symbol == "0" && (source.charAt(Index + 1) == "x" || source.charAt(Index + 1) == "X")) {
          // Parse a hexadecimal value.
          begin = Index;
          // Consume characters until the end of the string or a non-hex
          // value is encountered.
          for (Index += 2; Index < length && (symbol = source.charAt(Index), symbol >= "0" && symbol <= "9" || symbol >= "a" && symbol <= "f" || symbol >= "A" && symbol <= "F"); Index++);
          // If no additional characters were consumed, the value is invalid.
          if (begin + 2 == Index) {
            abort("Illegal empty hexadecimal value.");
          }
          return source.slice(begin, Index) * (sign ? -1 : 1);
        } else if ((symbol >= "0" && symbol <= "9") || symbol == ".") {
          // Leading zeroes are interpreted as octal literals.
          if (symbol == "0" && (symbol = source.charAt(Index + 1), symbol >= "0" && symbol <= "9")) {
            abort("Illegal octal literal.");
          }
          sign = false;
          // Parse the optional integer component.
          for (; Index < length && (symbol = source.charAt(Index), symbol >= "0" && symbol <= "9"); Index++);
          // Parse the decimal component.
          if (source.charAt(Index) == ".") {
            position = ++Index;
            for (; position < length && (symbol = source.charAt(position), symbol >= "0" && symbol <= "9"); position++);
            if (position == Index) {
              abort("Illegal trailing decimal.");
            }
            Index = position;
          }
          // Parse exponents.
          symbol = source.charAt(Index);
          if (symbol == "e" || symbol == "E") {
            // Skip past the sign following the exponent, if one is
            // specified.
            symbol = source.charAt(++Index);
            if (symbol == "+" || symbol == "-") {
              Index++;
            }
            // Parse the exponential component.
            for (position = Index; position < length && (symbol = source.charAt(position), symbol >= "0" && symbol <= "9"); position++);
            if (position == Index) {
              abort("Illegal empty exponent.");
            }
            Index = position;
          }
          // Coerce the parsed value to a JavaScript number.
          return +source.slice(begin, Index);
        }
        if (sign) {
          abort("A negative sign may only precede numbers.");
        }
        // `true`, `false`, and `null` literals.
        if (source.slice(Index, Index + 4) == "true") {
          Index += 4;
          return true;
        } else if (source.slice(Index, Index + 5) == "false") {
          Index += 5;
          return false;
        } else if (source.slice(Index, Index + 4) == "null") {
          Index += 4;
          return null;
        } else if (symbol == "$" || symbol == "_" || (symbol >= "a" && symbol <= "z") || (symbol >= "A" && symbol <= "Z")) {
          position = Index;
          // Parse unquoted identifiers. The initial character must be `$`,
          // `_`, or a letter. Subsequent characters may be numbers.
          for (; Index < length && (symbol = source.charAt(Index), symbol == "$" || symbol == "_" || (symbol >= "a" && symbol <= "z") || (symbol >= "A" && symbol <= "Z") || (symbol >= "0" && symbol <= "9")); Index++);
          // Identifiers are prefixed with the `^` character to distinguish them
          // from strings and punctuators.
          return "^" + source.slice(position, Index);
        }
        abort("Unrecognized token.");
      }
    }
    // Return the sentinel `$` character if the parser has reached the end
    // of the source string.
    return "$";
  };

  // Internal: Parses a JSON `value` token.
  get = function (value) {
    var results, any, key;
    if (value == "$") {
      abort("Unexpected end of input.");
    }
    if (typeof value == "string") {
      if (value.charAt(0) == "@") {
        // Remove the sentinel `@` character.
        return value.slice(1);
      }
      // Parse object and array literals.
      if (value == "[") {
        // Parses a JSON array, returning a new JavaScript array.
        results = [];
        for (;; any || (any = true)) {
          value = lex();
          // A closing square bracket marks the end of the array literal.
          if (value == "]") {
            break;
          }
          // If the array literal contains elements, the current token
          // should be a comma separating the previous element from the
          // next.
          if (any) {
            if (value == ",") {
              value = lex();
              if (value == "]") {
                // Trailing commas in arrays are permitted.
                break;
              }
            } else {
              abort("A `,` must separate each array element.");
            }
          }
          if (value == ",") {
            abort("Elisions and leading commas are not permitted.");
          }
          results.push(get(value));
        }
        return results;
      } else if (value == "{") {
        // Parses a JSON object, returning a new JavaScript object.
        results = {};
        for (;; any || (any = true)) {
          value = lex();
          // A closing curly brace marks the end of the object literal.
          if (value == "}") {
            break;
          }
          // If the object literal contains members, the current token
          // should be a comma separator.
          if (any) {
            if (value == ",") {
              value = lex();
              if (value == "}") {
                // Trailing commas in objects are permitted.
                break;
              }
            } else {
              abort("A `,` must separate each object member.");
            }
          }
          // Leading commas are not permitted, object property names must be
          // strings or identifiers, and a `:` must separate each property name
          // and value.
          if (value == "," || typeof value != "string" || (value.charAt(0) != "@" && value.charAt(0) != "^") || lex() != ":") {
            abort("Invalid object member.");
          }
          results[value.slice(1)] = get(lex());
        }
        return results;
      }
      abort("Expected `[` or `{`.");
    }
    return value;
  };

  // Internal: Updates a traversed object member.
  update = function(source, property, callback) {
    var element = walk(source, property, callback);
    if (element === undef) {
      delete source[property];
    } else {
      source[property] = element;
    }
  };

  // Internal: Recursively traverses a parsed JSON object, invoking the
  // `callback` function for each value. This is an implementation of the
  // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
  walk = function (source, property, callback) {
    var value = source[property], length;
    if (typeof value == "object" && value) {
      if (getClass.call(value) == "[object Array]") {
        for (length = value.length; length--;) {
          update(value, length, callback);
        }
      } else {
        // `forEach` can't be used to traverse an array in Opera <= 8.54,
        // as `Object#hasOwnProperty` returns `false` for array indices
        // (e.g., `![1, 2, 3].hasOwnProperty("0")`).
        forEach(value, function (property) {
          update(value, property, callback);
        });
      }
    }
    return callback.call(source, property, value);
  };

  // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
  JSON5.parse = function (source, callback) {
    Index = 0;
    Source = source;
    var result = get(lex());
    // If a JSON string contains multiple tokens, it is invalid.
    if (lex() != "$") {
      abort("Expected end of input.");
    }
    // Reset the parser state.
    Index = Source = null;
    return callback && getClass.call(callback) == "[object Function]" ? walk((value = {}, value[""] = result, value), "", callback) : result;
  };
}).call(this);