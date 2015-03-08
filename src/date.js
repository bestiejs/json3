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

module.exports = makeUTCDate;
function makeUTCDate(floor) {
  // UTCDate decomposes a `Date` value and exposes a subset of the
  // `Date` API. This is used to obtain the year, month, date, hours,
  // minutes, seconds, and milliseconds if the `getUTC*` methods are
  // buggy. Adapted from @Yaffle's `date-shim` project.
  function UTCDate(value) {
    var date = floor(value / 864e5);
    this.date = date;

    var year = floor(date / 365.2425) + 1970 - 1;
    while (getDay(floor, year + 1, 0) <= date) {
      year++;
    }
    this.year = year;

    var month = floor((date - getDay(floor, year, 0)) / 30.42);
    while (getDay(floor, year, month + 1) <= date) {
      month++;
    }
    this.month = month;

    // The `time` value specifies the time within the day (see ES
    // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
    // to compute `A modulo B`, as the `%` operator does not
    // correspond to the `modulo` operation for negative numbers.
    this.time = (value % 864e5 + 864e5) % 864e5;
  }

  UTCDate.prototype.date = 0;
  UTCDate.prototype.year = 0;
  UTCDate.prototype.month = 0;
  UTCDate.prototype.time = 0;

  UTCDate.prototype.getUTCFullYear = function() {
    return this.year;
  };

  UTCDate.prototype.getUTCMonth = function() {
    return this.month;
  };

  UTCDate.prototype.getUTCDate = function() {
    return 1 + this.date - getDay(floor, this.year, this.month);
  };

  // The hours, minutes, seconds, and milliseconds are obtained by
  // decomposing the time within the day. See section 15.9.1.10.
  UTCDate.prototype.getUTCHours = function() {
    return floor(this.time / 36e5) % 24;
  };

  UTCDate.prototype.getUTCMinutes = function() {
    return floor(this.time / 6e4) % 60;
  };

  UTCDate.prototype.getUTCSeconds = function() {
    return floor(this.time / 1e3) % 60;
  };

  UTCDate.prototype.getUTCMilliseconds = function() {
    return this.time % 1e3;
  };

  return UTCDate;
}
