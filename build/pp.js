// A RegExp used to detect the `define` pragma used by asynchronous module
// loaders.
var definePattern = RegExp('(?:' +
  // `typeof define == "function"`. Matches `==` and `===`; `'` and `"`.
  'typeof\\s+define\\s*===?\\s*([\'"])function\\1|' +
  // `"function" == typeof define`. Same rules as above.
  '([\'"])function\\2\\s*===?\\s*typeof\\s+define' +
')' +
// `&&`.
'\\s*&&\\s*(?:' +
  // `!!` (optional Boolean coercion)
  '(?:!!)?' +
  // `define`.
  'define\\s*(?:' +
    // `.amd`.
    '\\.\\s*amd|' +
    // `["amd"]` | `['amd']`.
    '\\[\\s*([\'"])amd\\3\\s*\\]' +
  ')|' +
  '(?:' +
    '(?:' +
      // `typeof define.amd`.
      'typeof\\s+define\\.\\s*amd|' +
      // `typeof define["amd"]` or `typeof define['amd']`.
      'typeof\\s+define\\[\\s*([\'"])amd\\4\\s*\\]' +
    ')' +
    // `=== "object"`. Same rules for quotes and equality operators.
    '\\s*===?\\s*([\'"])object\\5' +
  '|' +
    // `"object" ===`.
    '([\'"])object\\6\\s*===?\\s*' +
    '(?:' +
      'typeof\\s+define\\.\\s*amd|' +
      'typeof\\s+define\\[\\s*([\'"])amd\\7\\s*\\]' +
    ')' +
  ')' +
  '(?:' +
    // `&&` (optional Boolean test for `define.amd`).
    '\\s*&&\\s*' +
    '(?:' +
      // `!!` (optional Boolean coercion)
      '(?:!!)?' +
      // `define.amd`.
      'define\\.\\s*amd|' +
      // `define["amd"] | define['amd']`.
      'define\\[\\s*([\'"])amd\\8\\s*\\]' +
    ')' +
  ')?' +
')', 'g');

// List of properties to prevent the Closure Compiler from minifying.
var propertyWhitelist = [
  'Date',
  'JSON',
  'JSON3',
  'Math',
  'Number',
  'Object',
  'String',
  'SyntaxError',
  'TypeError',
  'global',
  'parse',
  'runInContext',
  'self',
  'stringify',
  'window'
];

exports.preprocessSource = function preprocessSource(source) {
  source = source.replace(definePattern, 'typeof define === "function" && define["amd"]');
  // Add brackets to whitelisted properties so the Closure Compiler won't minify them.
  // https://developers.google.com/closure/compiler/docs/api-tutorial3#export
  return source.replace(RegExp('(["\'])(?:(?!\\1)[^\\n\\\\]|\\\\.)*\\1|\\.(' + propertyWhitelist.join('|') + ')\\b', 'g'), function(match, quote, prop) {
    return quote ? match : "['" + prop + "']";
  });
};

exports.postprocessSource = function postprocessSource(source) {
  // Shift variables in the global scope into the IIFE and fix the
  // `define` pragma.
  var result = source.replace(/^(var [^;]*;)\s*(\(function\([^)]*\)\{)/m, '\n;$2$1');
  return result.replace(definePattern, 'typeof define==="function"&&define.amd');
};

// Internal: Extracts line and block comments from a JavaScript `source`
// string. Returns an array containing the comments.
exports.extractComments = function extractComments(source) {
  var index = 0, length = source.length, results = [], symbol, position, original;
  while (index < length) {
    symbol = source[index];
    switch (symbol) {
      // Parse line and block comments.
      case "/":
        original = symbol;
        symbol = source[++index];
        switch (symbol) {
          // Extract line comments.
          case "/":
            position = source.indexOf("\n", index);
            if (position < 0) {
              // Check for CR line endings.
              position = source.indexOf("\r", index);
            }
            results.push(original + source.slice(index, index = position < 0 ? length : position));
            break;
          // Extract block comments.
          case "*":
            position = source.indexOf("*/", index);
            if (position < 0) {
              throw SyntaxError("Unterminated block comment.");
            }
            // Advance past the end of the comment.
            results.push(original + source.slice(index, index = position += 2));
            break;
          default:
            index++;
        }
        break;
      // Parse strings separately to ensure that any JavaScript comments within
      // them are preserved.
      case '"':
      case "'":
        for (position = index, original = symbol; index < length;) {
          symbol = source[++index];
          if (symbol == "\\") {
            // Skip past escaped characters.
            index++;
          } else if ("\n\r\u2028\u2029".indexOf(symbol) > -1) {
            // According to the ES 5.1 spec, strings may not contain unescaped
            // line terminators.
            throw SyntaxError("Illegal line continuation.");
          } else if (symbol == original) {
            break;
          }
        }
        if (source[index] == original) {
          index++;
          break;
        }
        throw SyntaxError("Unterminated string.");
      default:
        // Advance to the next character.
        index++;
    }
  }
  return results;
};
