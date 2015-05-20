var hasDontEnumBug = require("./hasDontEnumBug");

// A list of non-enumerable properties inherited from `Object.prototype`.
var dontEnums = ["valueOf", "toString", "toLocaleString",
  "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];

module.exports = makeForOwn;
function makeForOwn(getClass, isProperty) {
  // Internal: Normalizes the `for...in` iteration algorithm across
  // environments. Each enumerated key is yielded to a `callback` function.
  var forOwn;
  if (hasDontEnumBug(isProperty)) {
    // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
    // properties.
    forOwn = function forOwn(object, callback) {
      var isFunction = getClass.call(object) == "[object Function]", property, length;
      var hasProperty = isProperty;
      if (!isFunction && typeof object.constructor != "function" && (typeof object.hasOwnProperty == "function" || typeof object.hasOwnProperty == "object" && object.hasOwnProperty)) {
        hasProperty = object.hasOwnProperty;
      }
      for (property in object) {
        // Gecko <= 1.0 enumerates the `prototype` property of functions under
        // certain conditions; IE does not.
        if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
          callback(property);
        }
      }
      // Manually invoke the callback for each non-enumerable property.
      for (length = dontEnums.length; property = dontEnums[--length]; hasProperty.call(object, property) && callback(property));
    };
  } else {
    // No bugs detected; use the standard `for...in` algorithm.
    forOwn = function forOwn(object, callback) {
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
  return forOwn;
}
