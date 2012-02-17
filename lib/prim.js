/*!
 * Prim: a practical JSON implementation
 * http://github.com/kitcambridge/prim
 *
 * Copyright 2012, Kit Cambridge.
 *
 * Released under the MIT License.
*/

(function () {
  "use strict";

  // Convenience aliases.
  var Prim = this, getClass = {}.toString, isPropertyOf = {}.hasOwnProperty,

  // Maps escaped JSON control characters to their revived equivalents.
  Escapes = Prim.Escapes = {
    "\\": "\\",
    '"': '"',
    "/": "/",
    "b": "\b",
    "t": "\t",
    "n": "\n",
    "f": "\f",
    "r": "\r"
  };

  // The current version of Prim.
  Prim.version = "0.0.1";

  // Parses a JSON source string.
  Prim.parse = function (source, callback) {
    var parser = new Parser(source), value = parser.parse(parser.get());
    // If a JSON string contains multiple tokens, it is invalid.
    if (parser.get() != "$") {
      throw SyntaxError("Expected end-of-file.");
    }
    return typeof callback == "function" ? Prim.walk({ "": value }, "", callback) : value;
  };

  // Recursively traverses a parsed JSON object, invoking the callback function
  // for each object value. This is an implementation of the `Walk` operation
  // defined in ES 5.1 section 15.12.2.
  Prim.walk = function (source, property, callback) {
    var value = source[property], length, element, property;
    if (Object(value) === value) {
      if (getClass.call(value) == "[object Array]") {
        for (length = value.length; length--;) {
          element = Prim.walk(value, length, callback);
          if (typeof element == "undefined") {
            value.splice(length, 1);
          } else {
            value[length] = element;
          }
        }
      } else {
        for (property in value) {
          if (!isPropertyOf.call(value, property)) {
            continue;
          }
          element = Prim.walk(value, property, callback);
          if (typeof element == "undefined") {
            delete value[property];
          } else {
            value[property] = element
          }
        }
      }
    }
    return callback.call(source, property, value);
  };

  // Internal: creates a new JSON parser instance. The `source` string is parsed
  // according to the grammar specified in section 15.12.1 of the ES 5.1 spec.
  Prim.Parser = Parser;
  function Parser(source) {
    this.source = source;
    this.index = 0;
  }

  // Returns the next token, or `"$"` if the parser has reached the end of the
  // source string. A token may be a string, number, `null` literal, or Boolean
  // literal.
  Parser.prototype.get = function () {
    for (var source = this.source, length = this.source.length, symbol, value, begin, position, sign; this.index < length;) {
      symbol = source.charAt(this.index);
      switch (symbol) {
        // Skip whitespace tokens, including tabs, carriage returns, line
        // feeds, and space characters.
        case "\t":
        case "\r":
        case "\n":
        case " ":
          this.index += 1;
          break;
        // Parse a punctuator token at the current position.
        case "{":
        case "}":
        case "[":
        case "]":
        case ":":
        case ",":
          this.index += 1;
          return symbol;
        // Parse a JSON string token at the current position. String tokens are
        // prefixed with the special `@` character to distinguish them from
        // punctuators.
        case '"':
          value = "@";
          // Advance to the first character.
          this.index += 1;
          while (this.index < length) {
            symbol = source.charAt(this.index);
            if (symbol != "\t" && symbol >= "\0" && symbol <= "\x1f") {
              // Unescaped tab characters are permitted; other ASCII control
              // characters are not.
              throw SyntaxError("Unescaped control character in string.");
            } else if (symbol == "\\") {
              // Parse escaped JSON control characters, `"`, `\`, `/`, and
              // Unicode escape sequences.
              this.index += 1;
              symbol = source.charAt(this.index);
              if ('\\"/btnfr'.indexOf(symbol) > -1) {
                // Revive escaped control characters.
                value += Escapes[symbol];
                this.index += 1;
              } else if (symbol == "u") {
                // Advance to the first character of the escape sequence.
                begin = this.index += 1;
                // Validate the Unicode escape sequence.
                for (position = this.index + 4; this.index < position; this.index += 1) {
                  symbol = source.charAt(this.index);
                  // A valid sequence comprises four hexdigits that form a
                  // single hexadecimal value.
                  if (!(symbol >= "0" && symbol <= "9" || symbol >= "a" && symbol <= "f" || symbol >= "A" && symbol <= "F")) {
                    throw SyntaxError("Invalid Unicode escape sequence in string.");
                  }
                }
                // Revive the escaped character.
                value += String.fromCharCode(parseInt(source.slice(begin, this.index), 16));
              } else {
                throw SyntaxError("Invalid escape sequence in string.");
              }
            } else {
              if (symbol == '"') {
                // An unescaped double-quote character marks the end of the
                // string.
                break;
              }
              // Append the original character as-is.
              value += symbol;
              this.index += 1;
            }
          }
          if (source.charAt(this.index) == '"') {
            this.index += 1;
            // Return the revived string.
            return value;
          }
          throw SyntaxError("Unterminated string.");
        // Parse numbers and literals.
        default:
          begin = this.index;
          // Advance the scanner's position past the sign, if one is specified.
          if (symbol == "-") {
            sign = true;
            symbol = source.charAt(this.index += 1);
          }
          // Parse an integer or floating-point value.
          if (symbol >= "0" && symbol <= "9") {
            // Leading zeroes are interpreted as octal literals.
            if (symbol == "0" && (symbol = source.charAt(this.index + 1), symbol >= "0" && symbol <= "9")) {
              throw SyntaxError("Illegal octal literal.");
            }
            sign = false;
            // Parse the integer component.
            for (; this.index < length && (symbol = source.charAt(this.index), symbol >= "0" && symbol <= "9"); this.index += 1);
            // Floats cannot contain a leading decimal point; however, this
            // case is already accounted for by the parser.
            if (source.charAt(this.index) == ".") {
              position = this.index += 1;
              // Parse the decimal component.
              for (; position < length && (symbol = source.charAt(position), symbol >= "0" && symbol <= "9"); position += 1);
              if (position == this.index) {
                throw SyntaxError("Illegal trailing decimal.");
              }
              this.index = position;
            }
            // Parse exponents.
            symbol = source.charAt(this.index);
            if (symbol == "e" || symbol == "E") {
              // Skip past the sign following the exponent, if one is specified.
              symbol = source.charAt(this.index += 1);
              if (symbol == "+" || symbol == "-") {
                this.index += 1;
              }
              // Parse the exponential component.
              for (position = this.index; position < length && (symbol = source.charAt(position), symbol >= "0" && symbol <= "9"); position += 1);
              if (position == this.index) {
                throw SyntaxError("Illegal empty exponent.");
              }
              this.index = position;
            }
            // Coerce the parsed value to a JavaScript number.
            return +source.slice(begin, this.index);
          }
          // A negative sign may only precede numbers.
          if (sign) {
            throw SyntaxError("Unexpected `-`.");
          }
          // `true`, `false`, and `null` literals.
          if (symbol == "t" && source.slice(this.index, this.index + 4) == "true") {
            this.index += 4;
            return true;
          } else if (symbol == "f" && source.slice(this.index, this.index + 5) == "false") {
            this.index += 5;
            return false;
          } else if (symbol == "n" && source.slice(this.index, this.index + 4) == "null") {
            this.index += 4;
            return null;
          }
          throw SyntaxError("Unrecognized token.");
      }
    }
    // Return the sentinel `$` character if the parser has reached the end of
    // the source string.
    return "$";
  }

  // Parses a JSON token.
  Parser.prototype.parse = function (value) {
    var results, any, key;
    if (value == "$") {
      throw SyntaxError("Unexpected end-of-file.");
    }
    if (typeof value == "string") {
      if (value.charAt(0) == "@") {
        // Remove the sentinel `@` character.
        return value.slice(1);
      }
      // Parse object and array literals.
      switch (value) {
        // Parses a JSON array, returning a new JavaScript array.
        case "[":
          results = [];
          for (;; any || (any = true)) {
            value = this.get();
            // A closing square bracket marks the end of the array literal.
            if (value == "]") {
              break;
            }
            // If the array literal contains elements, the current token should
            // be a comma separating the previous element from the next.
            if (any) {
              if (value == ",") {
                value = this.get();
                if (value == "]") {
                  throw SyntaxError("Unexpected trailing `,` in array literal.");
                }
              } else {
                throw SyntaxError("A comma (`,`) must separate the previous array element from the next.");
              }
            }
            // Elisions and leading commas are not permitted.
            if (value == ",") {
              throw SyntaxError("Unexpected `,` in array literal.");
            }
            results.push(this.parse(value));
          }
          return results;
        // Parses a JSON object, returning a new JavaScript object.
        case "{":
          results = {};
          for (;; any || (any = true)) {
            value = this.get();
            // A closing curly brace marks the end of the object literal.
            if (value == "}") {
              break;
            }
            // If the object literal contains members, the current token should
            // be a comma delimiting the previous element from the next.
            if (any) {
              if (value == ",") {
                value = this.get();
                if (value == "}") {
                  throw SyntaxError("Unexpected trailing `,`. in object literal.");
                }
              } else {
                throw SyntaxError("A comma (`,`) must separate the previous object member from the next.");
              }
            }
            // Leading commas are not permitted.
            if (value == ",") {
              throw SyntaxError("Unexpected `,` in object literal.");
            }
            if (typeof value != "string" || value.charAt(0) != "@") {
              throw SyntaxError("Object property names must be double-quoted strings.");
            }
            if (this.get() != ":") {
              throw SyntaxError("A single colon (`:`) must separate each object property name from the value.");
            }
            results[value.slice(1)] = this.parse(this.get());
          }
          return results;
      }
      throw SyntaxError("Expected `[` or `{`.");
    }
    return value;
  };
}).call(typeof exports == "object" && exports || (this.Prim = {}));