# Regression Risk Summary

This file describes the regression risks detected after recent changes.

## What is Regression Risk?

Regression risk is the possibility that a new feature breaks something that previously worked.

## Example Risks

- Changes in shared functions
- Refactoring of core modules

## Mitigation Strategies

- Run all tests after each change
- Automate regression testing

## Regression Test Example

```js
describe("Regression: login", () => {
  it("should still allow login with valid credentials", () => {
    // ...
  });
});
```
