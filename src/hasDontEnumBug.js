// The `valueOf` property inherits the non-enumerable flag from
// `Object.prototype` in older versions of IE, Netscape, and Mozilla.
function Properties() {
  this.valueOf = 0;
}
Properties.prototype.valueOf = 0;

// Tests for bugs in the current environment's `for...in` algorithm.
module.exports = hasDontEnumBug;
function hasDontEnumBug(isProperty) {
  var members = new Properties(), size = 0;
  for (var property in members) {
    // Ignore all properties inherited from `Object.prototype`.
    if (isProperty.call(members, property)) {
      size++;
    }
  }
  return size === 0;
}
