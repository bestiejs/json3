var toPaddedString = require("./toPaddedString");

// An associative array where the index is the month of the year (as
// reported by `Date#getUTCMonth`; e.g., 0 = January, 1 = February,
// etc) and the value is the number of days between January 1st and
// the first of the respective month.
var daysByMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

// getDay returns the number of days between the Unix epoch and the
// first day of the given month.
function getDay(floor, year, month) {
  return daysByMonth[month] + 365 * (year - 1970) +
    floor((year - 1969 + (month = +(month > 1))) / 4) -
    floor((year - 1901 + month) / 100) +
    floor((year - 1601 + month) / 400);
}

// Internal: Serializes dates according to the `Date#toJSON` method specified
// in ES 5.1 section 15.9.5.44. See section 15.9.1.15 for the ISO 8601 date
// time string format.
function format(year, month, date, hours, minutes, seconds, milliseconds) {
  var yearString = year <= 0 || year >= 1e4 ?
    // Extended year: [+-]YYYYYY.
    (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) :
    // Four-digit year: YYYY.
    toPaddedString(4, year);
  return (
    yearString +
    // Pad months, dates, hours, minutes, and seconds to two digits.
    "-" + toPaddedString(2, month + 1) +
    "-" + toPaddedString(2, date) +
    "T" + toPaddedString(2, hours) +
    ":" + toPaddedString(2, minutes) +
    ":" + toPaddedString(2, seconds) +
    // Pad milliseconds to three digits (optional in ES 5.0; required
    // in ES 5.1).
    "." + toPaddedString(3, milliseconds) +
    "Z"
  );
}

// Decompose a `Date` value to obtain the year, month, date, hours,
// minutes, seconds, and milliseconds if the `getUTC*` methods are
// buggy. Adapted from @Yaffle's `date-shim` project.
function serializeShim(v, floor) {
  var date = Math.floor(v / 864e5);
  var year = floor(date / 365.2425) + 1970 - 1;
  while (getDay(floor, year + 1, 0) <= date) {
    year++;
  }
  var month = floor((date - getDay(floor, year, 0)) / 30.42);
  while (getDay(floor, year, month + 1) <= date) {
    month++;
  }
  // The `time` value specifies the time within the day (see ES
  // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
  // to compute `A modulo B`, as the `%` operator does not
  // correspond to the `modulo` operation for negative numbers.
  var time = (v % 864e5 + 864e5) % 864e5;
  return format(
    year,
    month,
    1 + date - getDay(floor, year, month),
    // The hours, minutes, seconds, and milliseconds are obtained by
    // decomposing the time within the day. See section 15.9.1.10.
    floor(time / 36e5) % 24,
    floor(time / 6e4) % 60,
    floor(time / 1e3) % 60,
    time % 1e3
  );
}

module.exports = makeSerializeDate;
function makeSerializeDate(hasExtendedYears, floor) {
  // Internal: Serializes a date object.
  function serializeDate(value) {
    var epochTime = +value;
    if (epochTime != epochTime || epochTime == -1 / 0 || epochTime == 1 / 0) {
      // Handle `NaN`, `Infinity`, and `-Infinity`.
      return null;
    }
    if (hasExtendedYears) {
      return format(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
        value.getUTCHours(),
        value.getUTCMinutes(),
        value.getUTCSeconds(),
        value.getUTCMilliseconds()
      );
    }
    return serializeShim(epochTime, floor);
  }
  return serializeDate;
}
