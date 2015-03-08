module.exports = makeParse;
function makeParse(charIndexBuggy, fromCharCode, newSyntaxError, getClass, forOwn) {
  // Public: `JSON.parse` parses a JSON source string. See
  // ES 5.1 section 15.12.2.
  function parse(source, callback) {
    Index = 0;
    Source = "" + source;
    var firstToken = lex(charIndexBuggy, fromCharCode, newSyntaxError);
    var result = get(charIndexBuggy, fromCharCode, newSyntaxError, firstToken);
    // If a JSON string contains multiple tokens, it is invalid.
    if (lex(charIndexBuggy, fromCharCode, newSyntaxError) != "$") {
      abort(newSyntaxError);
    }
    // Reset the parser state.
    Index = Source = null;
    if (callback && getClass.call(callback) == "[object Function]") {
      var value = {};
      value[""] = result;
      return walk(getClass, forOwn, value, "", callback);
    }
    return result;
  }
  return parse;
}

// Internal: A map of escaped control characters and their unescaped
// equivalents.
var Unescapes = {
  92: "\\",
  34: '"',
  47: "/",
  98: "\b",
  116: "\t",
  110: "\n",
  102: "\f",
  114: "\r"
};

// Internal: Stores the parser state.
var Index, Source;

// Internal: Resets the parser state and throws a `newSyntaxError`.
function abort(newSyntaxError) {
  Index = Source = null;
  throw newSyntaxError();
}

// Internal: Returns the next token, or `"$"` if the parser has reached
// the end of the source string. A token may be a string, number, `null`
// literal, or Boolean literal.
function lex(charIndexBuggy, fromCharCode, newSyntaxError) {
  var source = Source, length = source.length, value, begin, position, isSigned, charCode;
  while (Index < length) {
    charCode = source.charCodeAt(Index);
    switch (charCode) {
      case 9: case 10: case 13: case 32:
        // Skip whitespace tokens, including tabs, carriage returns, line
        // feeds, and space characters.
        Index++;
        break;
      case 123: case 125: case 91: case 93: case 58: case 44:
        // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
        // the current position.
        value = charIndexBuggy ? source.charAt(Index) : source[Index];
        Index++;
        return value;
      case 34:
        // `"` delimits a JSON string; advance to the next character and
        // begin parsing the string. String tokens are prefixed with the
        // sentinel `@` character to distinguish them from punctuators and
        // end-of-string tokens.
        for (value = "@", Index++; Index < length;) {
          charCode = source.charCodeAt(Index);
          if (charCode < 32) {
            // Unescaped ASCII control characters (those with a code unit
            // less than the space character) are not permitted.
            abort(newSyntaxError);
          } else if (charCode == 92) {
            // A reverse solidus (`\`) marks the beginning of an escaped
            // control character (including `"`, `\`, and `/`) or Unicode
            // escape sequence.
            charCode = source.charCodeAt(++Index);
            switch (charCode) {
              case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                // Revive escaped control characters.
                value += Unescapes[charCode];
                Index++;
                break;
              case 117:
                // `\u` marks the beginning of a Unicode escape sequence.
                // Advance to the first character and validate the
                // four-digit code point.
                begin = ++Index;
                for (position = Index + 4; Index < position; Index++) {
                  charCode = source.charCodeAt(Index);
                  // A valid sequence comprises four hexdigits (case-
                  // insensitive) that form a single hexadecimal value.
                  if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                    // Invalid Unicode escape sequence.
                    abort(newSyntaxError);
                  }
                }
                // Revive the escaped character.
                value += fromCharCode("0x" + source.slice(begin, Index));
                break;
              default:
                // Invalid escape sequence.
                abort(newSyntaxError);
            }
          } else {
            if (charCode == 34) {
              // An unescaped double-quote character marks the end of the
              // string.
              break;
            }
            charCode = source.charCodeAt(Index);
            begin = Index;
            // Optimize for the common case where a string is valid.
            while (charCode >= 32 && charCode != 92 && charCode != 34) {
              charCode = source.charCodeAt(++Index);
            }
            // Append the string as-is.
            value += source.slice(begin, Index);
          }
        }
        if (source.charCodeAt(Index) == 34) {
          // Advance to the next character and return the revived string.
          Index++;
          return value;
        }
        // Unterminated string.
        abort(newSyntaxError);
      default:
        // Parse numbers and literals.
        begin = Index;
        // Advance past the negative sign, if one is specified.
        if (charCode == 45) {
          isSigned = true;
          charCode = source.charCodeAt(++Index);
        }
        // Parse an integer or floating-point value.
        if (charCode >= 48 && charCode <= 57) {
          // Leading zeroes are interpreted as octal literals.
          if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
            // Illegal octal literal.
            abort(newSyntaxError);
          }
          isSigned = false;
          // Parse the integer component.
          for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
          // Floats cannot contain a leading decimal point; however, this
          // case is already accounted for by the parser.
          if (source.charCodeAt(Index) == 46) {
            position = ++Index;
            // Parse the decimal component.
            for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
            if (position == Index) {
              // Illegal trailing decimal.
              abort(newSyntaxError);
            }
            Index = position;
          }
          // Parse exponents. The `e` denoting the exponent is
          // case-insensitive.
          charCode = source.charCodeAt(Index);
          if (charCode == 101 || charCode == 69) {
            charCode = source.charCodeAt(++Index);
            // Skip past the sign following the exponent, if one is
            // specified.
            if (charCode == 43 || charCode == 45) {
              Index++;
            }
            // Parse the exponential component.
            for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
            if (position == Index) {
              // Illegal empty exponent.
              abort(newSyntaxError);
            }
            Index = position;
          }
          // Coerce the parsed value to a JavaScript number.
          return +source.slice(begin, Index);
        }
        // A negative sign may only precede numbers.
        if (isSigned) {
          abort(newSyntaxError);
        }
        // `true`, `false`, and `null` literals.
        var temp = source.slice(Index, Index + 4);
        if (temp == "true") {
          Index += 4;
          return true;
        } else if (temp == "fals" && source.charCodeAt(Index + 4 ) == 101) {
          Index += 5;
          return false;
        } else if (temp == "null") {
          Index += 4;
          return null;
        }
        // Unrecognized token.
        abort(newSyntaxError);
    }
  }
  // Return the sentinel `$` character if the parser has reached the end
  // of the source string.
  return "$";
}

// Internal: Parses a JSON `value` token.
function get(charIndexBuggy, fromCharCode, newSyntaxError, value) {
  var results, hasMembers;
  if (value == "$") {
    // Unexpected end of input.
    abort(newSyntaxError);
  }
  if (typeof value == "string") {
    if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
      // Remove the sentinel `@` character.
      return value.slice(1);
    }
    // Parse object and array literals.
    if (value == "[") {
      // Parses a JSON array, returning a new JavaScript array.
      results = [];
      for (;;) {
        value = lex(charIndexBuggy, fromCharCode, newSyntaxError);
        // A closing square bracket marks the end of the array literal.
        if (value == "]") {
          break;
        }
        // If the array literal contains elements, the current token
        // should be a comma separating the previous element from the
        // next.
        if (hasMembers) {
          if (value == ",") {
            value = lex(charIndexBuggy, fromCharCode, newSyntaxError);
            if (value == "]") {
              // Unexpected trailing `,` in array literal.
              abort(newSyntaxError);
            }
          } else {
            // A `,` must separate each array element.
            abort(newSyntaxError);
          }
        } else {
          hasMembers = true;
        }
        // Elisions and leading commas are not permitted.
        if (value == ",") {
          abort(newSyntaxError);
        }
        results.push(get(charIndexBuggy, fromCharCode, newSyntaxError, value));
      }
      return results;
    } else if (value == "{") {
      // Parses a JSON object, returning a new JavaScript object.
      results = {};
      for (;;) {
        value = lex(charIndexBuggy, fromCharCode, newSyntaxError);
        // A closing curly brace marks the end of the object literal.
        if (value == "}") {
          break;
        }
        // If the object literal contains members, the current token
        // should be a comma separator.
        if (hasMembers) {
          if (value == ",") {
            value = lex(charIndexBuggy, fromCharCode, newSyntaxError);
            if (value == "}") {
              // Unexpected trailing `,` in object literal.
              abort(newSyntaxError);
            }
          } else {
            // A `,` must separate each object member.
            abort(newSyntaxError);
          }
        } else {
          hasMembers = true;
        }
        // Leading commas are not permitted, object property names must be
        // double-quoted strings, and a `:` must separate each property
        // name and value.
        if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex(charIndexBuggy, fromCharCode, newSyntaxError) != ":") {
          abort(newSyntaxError);
        }
        var memberValue = lex(charIndexBuggy, fromCharCode, newSyntaxError);
        results[value.slice(1)] = get(charIndexBuggy, fromCharCode, newSyntaxError, memberValue);
      }
      return results;
    }
    // Unexpected token encountered.
    abort(newSyntaxError);
  }
  return value;
}

// Internal: Updates a traversed object member.
function update(getClass, forOwn, source, property, callback) {
  var element = walk(getClass, forOwn, source, property, callback);
  if (element === undefined) {
    delete source[property];
  } else {
    source[property] = element;
  }
}

// Internal: Recursively traverses a parsed JSON object, invoking the
// `callback` function for each value. This is an implementation of the
// `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
function walk(getClass, forOwn, source, property, callback) {
  var value = source[property], length;
  if (typeof value == "object" && value) {
    // `forOwn` can't be used to traverse an array in Opera <= 8.54
    // because its `Object#hasOwnProperty` implementation returns `false`
    // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
    if (getClass.call(value) == "[object Array]") {
      for (length = value.length; length--; update(getClass, forOwn, value, length, callback));
    } else {
      forOwn(value, function (property) {
        update(getClass, forOwn, value, property, callback);
      });
    }
  }
  return callback.call(source, property, value);
}