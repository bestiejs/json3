var toPaddedString = require("./toPaddedString");

// Internal: Serializes dates according to the `Date#toJSON` method specified
// in ES 5.1 section 15.9.5.44. See section 15.9.1.15 for the ISO 8601 date
// time string format.
function toISOString(v) {
  var year = v.getUTCFullYear();
  var yearString = year <= 0 || year >= 1e4 ?
    // Extended year: [+-]YYYYYY.
    (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) :
    // Four-digit year: YYYY.
    toPaddedString(4, year);
  return (
    yearString +
    // Pad months, dates, hours, minutes, and seconds to two digits.
    "-" + toPaddedString(2, v.getUTCMonth() + 1) +
    "-" + toPaddedString(2, v.getUTCDate()) +
    "T" + toPaddedString(2, v.getUTCHours()) +
    ":" + toPaddedString(2, v.getUTCMinutes()) +
    ":" + toPaddedString(2, v.getUTCSeconds()) +
    // Pad milliseconds to three digits (optional in ES 5.0; required
    // in ES 5.1).
    "." + toPaddedString(3, v.getUTCMilliseconds()) +
    "Z"
  );
}

module.exports = makeSerializeDate;
function makeSerializeDate(UTCDate) {
  // Internal: Serializes a date object.
  function serializeDate(value) {
    var epochTime = +value;
    if (epochTime != epochTime || epochTime == -1 / 0 || epochTime == 1 / 0) {
      // Handle `NaN`, `Infinity`, and `-Infinity`.
      return null;
    }
    if (UTCDate) {
      return toISOString(new UTCDate(value));
    }
    return toISOString(value);
  }
  return serializeDate;
}
