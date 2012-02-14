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
  var Prim = this, getClass = {}.toString, isPropertyOf = {}.hasOwnProperty;
  
  // The current version of Prim.
  Prim.version = "0.0.1";

  // Parses a JSON source string.
  Prim.parse = function (source, options, callback) {
    return new Parser(source, options).parse(callback);
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

  // If extensions are enabled, `NaN`, `Infinity`, and JavaScript-style
  // comments are permitted. Otherwise, the source is parsed according to the
  // grammar specified in section 15.12.1 of the ES 5.1 spec.
  Prim.Parser = Parser;
  function Parser(source, options) {
    options = Object(options);
    this.extensions = "extensions" in options ? !!options.extensions : false;
    this.source = source;
    this.index = this.line = this.column = 0;
  }

  // Parses a JSON source string.
  Parser.prototype.parse = function (callback) {
    var value = this.parseValue(this.get());
    if (this.get()) {
      throw new SyntaxError("Expected end-of-file.");
    }
    return typeof callback == "function" ? Prim.walk({ "": value }, "", callback) : value;
  };

  // Produces a new JSON token.
  Parser.Token = function (lexer, kind, begin, end) {
    return {
      "kind": kind,
      "begin": begin,
      "end": end,
      "line": lexer.line,
      "column": lexer.column,
      "value": lexer.source.slice(begin, end)
    };
  };

  // Matches Unicode escape sequences in strings.
  Parser.Unicode = /^u[A-Fa-f\d]{4}$/;

  // Returns the next token, or `null` if the scanner has reached the end of the
  // source string. Whitespace tokens are ignored unless the optional
  // `whitespace` flag is set.
  Parser.prototype.get = function (whitespace) {
    var symbol, token, end, position, begin, column, lines, source, sign, kind;
    if (this.index >= this.source.length) {
      return null;
    }
    symbol = this.source.charAt(this.index);
    switch (symbol) {
      // Lexes a whitespace token at the current position.
      // -------------------------------------------------
      case "\t":
      case " ":
        token = Parser.Token(this, "whitespace", this.index, this.index += 1);
        this.column += 1;
        return whitespace ? token : this.get();
      // Lexes a line terminator at the current position.
      // ------------------------------------------------
      case "\n":
      case "\r":
        end = this.index + 1;
        // Treat CRLF line endings as a single line terminator.
        if (symbol == "\r" && this.source.charAt(end) == "\n") {
          end += 1;
        }
        token = Parser.Token(this, "eol", this.index, this.index = end);
        this.line += 1;
        this.column = 0;
        // Ignore whitespace tokens.
        return whitespace ? token : this.get();
      // Lexes a line or block comment at the current position.
      // ------------------------------------------------------
      case "/":
        symbol = this.source.charAt(this.index += 1);
        switch (symbol) {
          // Line Comment.
          // -------------
          case "/":
            if (!this.extensions) {
              throw new SyntaxError("Line comments are only permitted with extensions enabled.");
            }
            begin = this.index;
            position = this.source.indexOf("\n", begin);
            if (position < 0) {
              position = this.source.indexOf("\r", begin);
            }
            end = this.index = this.column = position > -1 ? position : this.source.length;
            return whitespace ? Parser.Token(this, "comment", begin, end) : this.get();
          // Block Comment.
          // --------------
          case "*":
            if (!this.extensions) {
              throw new SyntaxError("Block comments are only permitted with extensions enabled.");
            }
            begin = this.index;
            end = this.source.indexOf("*/", begin);
            if (end > -1) {
              // Advance the scanner's position past the end of the comment.
              this.index = end += 2;
              for (position = lines = 0, source = this.source.slice(begin, this.index); ; lines += 1) {
                position = source.indexOf("\n", position + 1);
                if (position < 0) {
                  position = source.indexOf("\r", position + 1);
                }
                if (position < 0) {
                  break;
                }
              }
              if (!lines) {
                this.column += end - begin;
              } else {
                this.line += lines;
                this.column = 0;
              }
              return whitespace ? Parser.Token(this, "comment", begin, end) : this.get();
            }
            throw new SyntaxError("Unterminated block comment.");
        }
        // Invalid comment.
        break;
      // Lexes a punctuator token at the current position.
      // -------------------------------------------------
      case "{":
      case "}":
      case "[":
      case "]":
      case ":":
      case ",":
        token = Parser.Token(this, "punctuator", this.index, this.index += 1);
        this.column += 1;
        return token;
      // Lexes a string token at the current position.
      // ---------------------------------------------
      case '"':
        begin = this.index;
        while (this.index < this.source.length) {
          this.index += 1;
          symbol = this.source.charAt(this.index);
          if (symbol == "\r" || symbol == "\n") {
            throw new SyntaxError("Unescaped line terminators are not permitted within string literals.");
          } else if (symbol >= "\x00" && symbol <= "\x1f") {
            throw new SyntaxError("ASCII control characters must be escaped.");
          } else if (symbol == "\\") {
            // Validate escaped control characters, `\`, `/`, and Unicode escape
            // sequences.
            this.index += 1;
            if ("\\/btnfr".indexOf(this.source.charAt(this.index)) > -1) {
              this.index += 1;
            } else if (Parser.Unicode.test(this.source.slice(this.index, this.index + 5))) {
              this.index += 5;
            } else {
              throw new SyntaxError("Invalid escape sequence.");
            }
          }
          if (this.source.charAt(this.index) == '"') {
            break;
          }
        }
        if (this.source.charAt(this.index) == '"') {
          this.index += 1;
          return Parser.Token(this, "string", begin, this.index);
        }
        throw new SyntaxError("Unterminated string literal.");
      // Lexes an integer, floating-point value, or literal at the current
      // position.
      // -----------------------------------------------------------------
      default:
        begin = this.index;
        // Advance the scanner's position past the sign, if one is specified.
        if (symbol == "-") {
          sign = true;
          symbol = this.source.charAt(this.index += 1);
        }
        // Integer or floating-point value.
        // --------------------------------
        if (symbol >= "0" && symbol <= "9") {
          // Leading zeroes are interpreted as octal literals.
          if (symbol == "0" && (symbol = this.source.charAt(this.index + 1), symbol >= "0" && symbol <= "9")) {
            throw new SyntaxError("Octal escape sequences are not permitted.");
          }
          sign = false;
          // Lex the integer component.
          for (; this.index < this.source.length && (symbol = this.source.charAt(this.index), symbol >= "0" && symbol <= "9"); this.index += 1);
          // Note that floats cannot start with a decimal point; however, this case
          // is caught by the tokenizing regular expression.
          if (this.source.charAt(this.index) == ".") {
            position = this.index += 1;
            for (; position < this.source.length && (symbol = this.source.charAt(position), symbol >= "0" && symbol <= "9"); position += 1);
            if (position == this.index) {
              throw new SyntaxError("Trailing decimal.");
            }
            kind = "float";
            this.index = position;
          }
          // Parse exponents.
          symbol = this.source.charAt(this.index);
          if (symbol == "e" || symbol == "E") {
            // Advance past the sign following the exponent, if one is specified.
            symbol = this.source.charAt(this.index += 1);
            if (symbol == "+" || symbol == "-") {
              this.index += 1;
            }
            for (position = this.index; position < this.source.length && (symbol = this.source.charAt(position), symbol >= "0" && symbol <= "9"); position += 1);
            if (position == this.index) {
              throw new SyntaxError("Exponents may not be empty.");
            }
            kind || (kind = "float");
            this.index = position;
          }
          token = Parser.Token(this, kind || "integer", begin, this.index);
          this.column += this.index - begin;
          return token;
        }
        // Infinity.
        // ---------
        if (this.source.slice(this.index, this.index + 8) == "Infinity") {
          if (!this.extensions) {
            throw new SyntaxError("`Infinity` is only permitted with extensions enabled.");
          }
          sign = false;
          token = Parser.Token(this, "literal", begin, this.index += 8);
          this.column += 8;
          return token;
        }
        // A negative sign may only precede numbers and `Infinity`.
        if (sign) {
          break;
        }
        // NaN.
        // ----
        if (this.source.slice(this.index, this.index + 3) == "NaN") {
          if (!this.extensions) {
            throw new SyntaxError("`NaN` is only permitted with extensions enabled.");
          }
          token = Parser.Token(this, "literal", begin, this.index += 3);
          this.column += 3;
          return token;
        // `true`, `false`, and `null`.
        // ----------------------------
        } else if (this.source.slice(this.index, this.index + 4) == "true") {
          token = Parser.Token(this, "literal", begin, this.index += 4);
          this.column += 4;
          return token;
        } else if (this.source.slice(this.index, this.index + 5) == "false") {
          token = Parser.Token(this, "literal", begin, this.index += 5);
          this.column += 5;
          return token;
        } else if (this.source.slice(this.index, this.index + 4) == "null") {
          token = Parser.Token(this, "literal", begin, this.index += 4);
          this.column += 4;
          return token;
        }
    }
    throw new SyntaxError("Unexpected token.");
  };

  // Maps escaped JSON control characters to their corresponding unescaped
  // equivalents.
  Parser.Escapes = {
    "b": "\b",
    "f": "\f",
    "n": "\n",
    "r": "\r",
    "t": "\t"
  };

  // Maps literal token values to their corresponding JavaScript equivalents.
  Parser.Literals = {
    "true": true,
    "false": false,
    "null": null,
    "Infinity": 1 / 0,
    "-Infinity": -1 / 0,
    "NaN": 0 / 0
  };

  // Parses a JSON token.
  Parser.prototype.parseValue = function (token) {
    var results, any, key, value;
    if (!token) {
      throw new SyntaxError("Unexpected end-of-file.");
    }
    switch (token.kind) {
      case "integer":
      case "float":
        return +token.value;
      case "literal":
        return Parser.Literals[token.value];
      // Parse a JSON string value.
      case "string":
        // Remove the enclosing quotation marks.
        value = token.value.slice(1, -1);
        if (value.indexOf("\\") > -1) {
          // Parse ASCII and Unicode escape sequences. The `RegExp` constructor
          // is used to create the sentinel pattern anew, as the ES 3 spec
          // dictates that conforming implementations should cache RegExp
          // literals.
          value = value.replace(RegExp("\\\\(?:[\"\\\\\\/bfnrt]|(?:u[A-Fa-f\\d]{4}))", "g"), function (match) {
            return Parser.Escapes[match.charAt(1)] || String.fromCharCode(parseInt(match.slice(2), 16));
          });
        }
        return value;
      // Parse object and array literals.
      case "punctuator":
        switch (token.value) {
          // Parses a JSON array, returning a new JavaScript array.
          // ------------------------------------------------------
          case "[":
            results = [];
            for (;;) {
              token = this.get();
              // A closing bracket marks the end of the array literal.
              if (token.value == "]") {
                break;
              }
              // If the array literal contains elements, the current token should be a
              // comma delimiting the previous element from the next.
              if (results.length) {
                if (token.value == ",") {
                  token = this.get();
                  if (token.value == "]") {
                    throw new SyntaxError("Unexpected trailing `,`. in array literal.");
                  }
                } else {
                  throw new SyntaxError("A comma (`,`) must separate the previous array element from the next.");
                }
              }
              // Elisions and leading commas are not permitted.
              if (token.value == ",") {
                throw new SyntaxError("Unexpected `,` in array literal.");
              }
              results.push(this.parseValue(token));
            }
            return results;
          // Parses a JSON object, returning a new JavaScript object.
          // --------------------------------------------------------
          case "{":
            results = {};
            for (;; any || (any = true)) {
              token = this.get();
              // A closing brace marks the end of the object literal.
              if (token.value == "}") {
                break;
              }
              // If the object literal contains members, the current token should be a
              // comma delimiting the previous element from the next.
              if (any) {
                if (token.value == ",") {
                  token = this.get();
                  if (token.value == "}") {
                    throw new SyntaxError("Unexpected trailing `,`. in object literal.");
                  }
                } else {
                  throw new SyntaxError("A comma (`,`) must separate the previous object member from the next.");
                }
              }
              // Leading commas are not permitted.
              if (token.value == ",") {
                throw new SyntaxError("Unexpected `,` in object literal.");
              }
              if (token.kind != "string") {
                throw new SyntaxError("Object property names must be double-quoted strings.");
              }
              // Immediately parse the member name token.
              key = this.parseValue(token);
              if (this.get().value != ":") {
                throw new SyntaxError("A single colon (`:`) must separate each object property name from the value.");
              }
              results[key] = this.parseValue(this.get());
            }
            return results;
        }
        throw new SyntaxError("Expected `[` or `{`.");
    }
    throw new SyntaxError("Unexpected token.");
  };
}).call(typeof exports == "object" && exports || (this.Prim = {}));