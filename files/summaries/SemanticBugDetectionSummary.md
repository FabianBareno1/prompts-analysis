# Semantic Bug Detection Summary

This document explains the detection of semantic bugs in the code.

## What is a Semantic Bug?

A semantic bug occurs when the code does not fulfill the programmer's intent, even if there are no syntax errors.

## Examples

- Incorrect comparisons
- Misuse of variables

## Tools Used

- ESLint
- Static analysis

## Semantic Bug Example

```js
if ((a = b)) {
  // should be a == b
  // ...
}
```

## Tips

- Review business logic
- Do code reviews
- Write integration tests
