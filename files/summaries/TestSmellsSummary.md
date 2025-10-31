# Angular Module Test Smells Report

**Date:** 2025-10-24T02:29:43.632Z

**Total modules:** 17

**Total inspected test files:** 23

| Module | 🔴 High | 🟠 Medium | 🟢 Low | Total Smells | Files Inspected |
| ------ | ------- | --------- | ------ | ------------ | --------------- |
| app.browser (src/app) | 0 | 0 | 0 | 0 | 3 |
| app (src/app) | 0 | 0 | 0 | 0 | 0 |
| app.server (src/app) | 0 | 0 | 0 | 0 | 0 |
| chartjs (src/app/modules/application/chartjs) | 0 | 0 | 0 | 0 | 1 |
| components (src/app/modules/application/components) | 0 | 0 | 0 | 0 | 2 |
| items (src/app/modules/application/items) | 0 | 1 | 0 | 1 | 2 |
| leaflet-feature (src/app/modules/application/leaflet-feature) | 0 | 0 | 0 | 0 | 1 |
| grid-images (src/app/modules/application/movies-images-list/grid-images) | 0 | 0 | 0 | 0 | 0 |
| movies-images-list (src/app/modules/application/movies-images-list) | 0 | 2 | 0 | 2 | 4 |
| pagination (src/app/modules/application/movies-images-list/pagination) | 0 | 0 | 0 | 0 | 1 |
| search-bar (src/app/modules/application/movies-images-list/search-bar) | 0 | 0 | 0 | 0 | 1 |
| search-result (src/app/modules/application/movies-images-list/search-result) | 0 | 0 | 0 | 0 | 1 |
| services (src/app/modules/application/services) | 0 | 0 | 0 | 0 | 2 |
| template-driven-forms (src/app/modules/application/template-driven-forms) | 0 | 0 | 0 | 0 | 2 |
| about (src/app/modules/general/about) | 0 | 0 | 0 | 0 | 1 |
| contact (src/app/modules/general/contact) | 0 | 0 | 0 | 0 | 1 |
| signin (src/app/modules/general/signin) | 0 | 0 | 0 | 0 | 1 |

**Totals:**

- 🔴 High: 0
- 🟠 Medium: 3
- 🟢 Low: 0

**Top 5 Smells:**
1. testbed-misuse (Inefficient TestBed config): 3

**Findings & Recommendations:**

- 🔴 High: reduce logic in tests, use `fakeAsync`, isolate dependencies.
- 🟠 Medium: reduce shared fixtures, validate spies, modularize tests.
- 🟢 Low: maintain practices, automate linting.

**Top Problematic Files:**
- src/app/modules/application/items/items.service.spec.ts: testbed-misuse
- src/app/modules/application/movies-images-list/config/config.service.spec.ts: testbed-misuse
- src/app/modules/application/movies-images-list/items/items.service.spec.ts: testbed-misuse

**Unassigned Files:**

_None_

---

**Appendix: Algorithm & Thresholds**

- Thresholds: expects/it=8, huge beforeEach=8, large object=20, long selector=40
- See script for full heuristics.
- False positives possible, especially with regex fallback.
