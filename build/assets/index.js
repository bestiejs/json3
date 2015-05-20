var fs = require("fs");

module.exports = {
  "header": fs.readFileSync(__dirname + "/header.js", "utf8"),
  "footer": fs.readFileSync(__dirname + "/footer.js", "utf8"),
  "page": fs.readFileSync(__dirname + "/page.html", "utf8")
};
