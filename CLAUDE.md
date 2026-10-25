# Almanac Journal Agent Guidelines

## Development & Quality Standards

### Testing Guidelines
- **Write Tests for New Features:** Whenever implementing new features, API endpoints, backend Convex functions, or utility logic, write corresponding unit and integration tests (using `vitest` and `convex-test`).
- **Run Tests Before Committing:** Always execute the test suite (`npm test`) and type check / production build (`npm run build`) before committing any changes. Never commit code with failing tests.
- **Backend & Authz Verification:** For any changes to Convex functions or schema, ensure authorization checks (e.g. `getAuthUserId`) and data isolation are covered by tests using in-memory `convex-test`.
