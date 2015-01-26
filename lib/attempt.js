// Internal: Contains `try...catch` logic used by other functions.
// This prevents other functions from being deoptimized.
module.exports = attempt;
function attempt(func) {
  try {
    return func();
  } catch (exception) {}
}
