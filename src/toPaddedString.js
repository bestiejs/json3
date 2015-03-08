// Internal: Converts `value` into a zero-padded string such that its
// length is at least equal to `width`. The `width` must be <= 6.
var leadingZeroes = "000000";
module.exports = function (width, value) {
  // The `|| 0` expression is necessary to work around a bug in
  // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
  return (leadingZeroes + (value || 0)).slice(-width);
};
