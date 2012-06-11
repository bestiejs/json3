/*! JSON v3.2.2 | http://bestiejs.github.com/json3 | Copyright 2012, Kit Cambridge | http://kit.mit-license.org */
;(function () {
  // Convenience aliases.
  var getClass = {}.toString, isProperty, forEach, undef;

  // Set up the `JSON5` namespace.
  var JSON5 = typeof exports == "object" && exports || (this.JSON5 || (this.JSON5 = {}));

  // Internal: Closure variables and utility methods.
  var Escapes, toPaddedString, quote, serialize;
  var fromCharCode, Unescapes, abort, lex, get, walk, update, Index, Source, Length;

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

  // Internal: Normalizes the `for...in` iteration algorithm across
  // environments. Each enumerated key is yielded to a `callback` function.
  forEach = function (object, callback) {
    var size = 0, Properties, members, property, forEach;

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
      // A list of non-enumerable properties inherited from `Object.prototype`.
      members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
      // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
      // properties.
      forEach = function (object, callback) {
        var isFunction = getClass.call(object) == "[object Function]", property, length;
        for (property in object) {
          // Gecko <= 1.0 enumerates the `prototype` property of functions under
          // certain conditions; IE does not.
          if (!(isFunction && property == "prototype") && isProperty.call(object, property)) {
            callback(property);
          }
        }
        // Manually invoke the callback for each non-enumerable property.
        for (length = members.length; property = members[--length]; isProperty.call(object, property) && callback(property));
      };
    } else if (size == 2) {
      // Safari <= 2.0.4 enumerates shadowed properties twice.
      forEach = function (object, callback) {
        // Create a set of iterated properties.
        var members = {}, isFunction = getClass.call(object) == "[object Function]", property;
        for (property in object) {
          // Store each property name to prevent double enumeration. The
          // `prototype` property of functions is not enumerated due to cross-
          // environment inconsistencies.
          if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
            callback(property);
          }
        }
      };
    } else {
      // No bugs detected; use the standard `for...in` algorithm.
      forEach = function (object, callback) {
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
    return forEach(object, callback);
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
    Index = Source = Length = null;
    throw SyntaxError(message);
  };

  // Internal: Returns the next token, or `"$"` if the parser has reached
  // the end of the source string. A token may be a string, number, `null`
  // literal, or Boolean literal.
  lex = function () {
    var symbol, value, begin, position, sign;
    while (Index < Length) {
      symbol = Source.charAt(Index);
      if (symbol <= " " || "\u00a0\ufeff\u2028\u2029".indexOf(symbol) > -1) {
        // Skip whitespace and control characters. JSON5 treats all ECMAScript
        // whitespace and line terminator characters as whitespace; the JSON
        // standard only allows tabs, carriage returns, line feeds, and space
        // characters.
        Index++;
      } else if ("{}[]:,".indexOf(symbol) > -1) {
        // Parse a punctuator token at the current position. The only valid
        // JSON5 punctuators are curly braces, square brackets, `:`, and `,`.
        Index++;
        return symbol;
      } else if (symbol == "/") {
        // Parse a JavaScript-style line or block comment at the current
        // position.
        symbol = Source.charAt(++Index);
        if (symbol == "/") {
          // Skip line comments.
          position = Source.indexOf("\n", Index);
          if (position < 0) {
            // Support CR-style line endings.
            position = Source.indexOf("\r", Index);
          }
          Index = position < 0 ? Length : position;
        } else if (symbol == "*") {
          // Skip block comments.
          position = Source.indexOf("*/", Index);
          if (position < 0) {
            abort("Unterminated block comment.");
          }
          // Advance the scanner's position past the end of the comment.
          Index = position + 2;
        } else {
          abort("Invalid comment.");
        }
      } else if (symbol == '"' || symbol == "'") {
        // Save the initial string delimiter character. Single- and double-
        // quoted strings are supported.
        sign = symbol;
        // Advance to the next character and parse a string at the current
        // position. String tokens are prefixed with the sentinel `@` character
        // to distinguish them from punctuators and unquoted identifiers.
        for (value = "@", Index++; Index < Length;) {
          symbol = Source.charAt(Index);
          if (symbol < " ") {
            abort("Unescaped control character in string.");
          } else if (symbol == "\\") {
            // Parse line continuations, escaped control characters, and Unicode
            // escape sequences.
            symbol = Source.charAt(++Index);
            if (symbol == "\r" || symbol == "\n") {
              // Escaped literal carriage returns (including CRLF-style line
              // endings) and line feeds are treated as line continuations.
              Index = Index + ((symbol == "\r" && Source.charAt(Index + 1) == "\n") ? 2 : 1);
            } else if ('\\"\'/btnfr'.indexOf(symbol) > -1) {
              // Revive escaped control characters.
              value += Unescapes[symbol];
              Index++;
            } else if (symbol == "u") {
              // Advance to the first character of the escape sequence.
              begin = ++Index;
              // Validate the Unicode escape sequence.
              for (position = Index + 4; Index < position; Index++) {
                symbol = Source.charAt(Index);
                // A valid sequence comprises four hexdigits that form a
                // single hexadecimal value.
                if (!(symbol >= "0" && symbol <= "9" || symbol >= "a" && symbol <= "f" || symbol >= "A" && symbol <= "F")) {
                  abort("Invalid Unicode escape sequence in string.");
                }
              }
              // Revive the escaped character.
              value += fromCharCode("0x" + Source.slice(begin, Index));
            } else {
              abort("Invalid escape sequence in string");
            }
          } else {
            if (symbol == sign) {
              // An unescaped delimiter marks the end of the string.
              break;
            }
            // Otherwise, append the original character as-is.
            value += symbol;
            Index++;
          }
        }
        if (Source.charAt(Index) == sign) {
          Index++;
          // Return the revived string.
          return value;
        }
        abort("Unterminated string.");
      } else {
        // Parse numbers and literals.
        if (symbol == "-") {
          // Advance the scanner's position past the sign, if one is specified.
          sign = -1;
          symbol = Source.charAt(++Index);
        }
        begin = Index;
        // Parse an integer, floating-point value, or hexadecimal value.
        // Leading decimal points are permitted.
        if (symbol == "0" && (Source.charAt(Index + 1) == "x" || Source.charAt(Index + 1) == "X")) {
          // Parse a hexadecimal value.
          value = true;
          // Consume characters until the end of the string or a non-hex
          // value is encountered.
          for (Index += 2; Index < Length && (symbol = Source.charAt(Index), symbol >= "0" && symbol <= "9" || symbol >= "a" && symbol <= "f" || symbol >= "A" && symbol <= "F"); Index++);
          // If no additional characters were consumed, the value is invalid.
          if (begin + 2 == Index) {
            abort("Illegal empty hexadecimal value.");
          }
        } else if ((symbol >= "0" && symbol <= "9") || symbol == ".") {
          // Leading zeroes are interpreted as octal literals.
          if (symbol == "0" && (symbol = Source.charAt(Index + 1), symbol >= "0" && symbol <= "9")) {
            abort("Illegal octal literal.");
          }
          value = true;
          // Parse the optional integer component.
          for (; Index < Length && (symbol = Source.charAt(Index), symbol >= "0" && symbol <= "9"); Index++);
          // Parse the decimal component. Trailing decimals are permitted.
          if (Source.charAt(Index) == ".") {
            for (Index++; Index < Length && (symbol = Source.charAt(Index), symbol >= "0" && symbol <= "9"); Index++);
          }
          // Parse exponents.
          symbol = Source.charAt(Index);
          if (symbol == "e" || symbol == "E") {
            // Skip past the sign following the exponent, if one is
            // specified.
            symbol = Source.charAt(++Index);
            if (symbol == "+" || symbol == "-") {
              Index++;
            }
            // Parse the exponential component.
            for (position = Index; position < Length && (symbol = Source.charAt(position), symbol >= "0" && symbol <= "9"); position++);
            if (position == Index) {
              abort("Illegal empty exponent.");
            }
            Index = position;
          }
        }
        if (value) {
          // Coerce the parsed value to a JavaScript number.
          return Source.slice(begin, Index) * (sign || 1);
        } else if (sign) {
          abort("A negative sign may only precede numbers.");
        }
        // Parse `true`, `false`, and `null` literals.
        if (Source.slice(Index, Index + 4) == "true") {
          Index += 4;
          return true;
        } else if (Source.slice(Index, Index + 5) == "false") {
          Index += 5;
          return false;
        } else if (Source.slice(Index, Index + 4) == "null") {
          Index += 4;
          return null;
        } else if (symbol == "$" || symbol == "_" || (symbol >= "a" && symbol <= "z") || (symbol >= "A" && symbol <= "Z")) {
          position = Index;
          // Parse unquoted identifiers. The initial character must be `$`,
          // `_`, or a letter. Subsequent characters may be numbers.
          for (; Index < Length && (symbol = Source.charAt(Index), symbol == "$" || symbol == "_" || (symbol >= "a" && symbol <= "z") || (symbol >= "A" && symbol <= "Z") || (symbol >= "0" && symbol <= "9")); Index++);
          // Identifiers are prefixed with the `^` character to distinguish them
          // from strings and punctuators.
          return "^" + Source.slice(position, Index);
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
    var result, value;
    Index = 0;
    Source = source;
    Length = source.length;
    result = get(lex());
    // If a JSON string contains multiple tokens, it is invalid.
    if (lex() != "$") {
      abort("Expected end of input.");
    }
    // Reset the parser state.
    Index = Source = Length = null;
    // Opera <= 7.54u2 discards the values associated with empty string keys
    // (`""`) only if they are used directly within an object member list
    // (e.g., `!("" in { "": 1})`).
    return callback && getClass.call(callback) == "[object Function]" ? walk((value = {}, value[""] = result, value), "", callback) : result;
  };
}).call(this);