  )(root);

  if (freeExports && !isLoader) {
    // Export for CommonJS environments. Since each module receives its
    // own `freeExports` object, `noConflict` is a no-op.
    runInContext(root, freeExports, true);
  } else {
    // Export for web browsers and JavaScript engines.
    var JSON3 = root.JSON3 = runInContext(root);
    root.JSON = {
      "parse": JSON3.parse,
      "stringify": JSON3.stringify
    };
  }

  // Export for asynchronous module loaders.
  if (isLoader) {
    define(function () {
      return JSON3;
    });
  }
}).call(this);
