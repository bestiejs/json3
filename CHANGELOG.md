# JSON3 Changelog

## 0.8.5

 * Avoided relying on native functions `Math.abs`, and `isFinite`, and native constructors `String`, `Number`, `Object`, and `Array`
 * Fixed AMD export logic

## 0.8.0

 * Renamed `Prim` to `JSON3`
 * Added `JSON3.Version`
 * Added support for AMD lodaers as the `"json"` module
 * Added feature tests for native `JSON` implementations
 * Added string coercion for the `source` argument in `JSON3.parse`
 * Fixed the date serialization routine in `JSON3.stringify`

## 0.5.0

 * Fixed `Prim.stringify`'s handling of the `width` argument
 * Added Microsoft's ES5 Conformance Tests to the test suite

## 0.2.0

 * Added `Prim.stringify` for serializing values
 * Renamed `Prim.Escapes` to `Prim.Unescapes`
 * Disallowed unescaped tab characters in strings passed to `Prim.parse`

## 0.1.0

 * Initial release of Prim
