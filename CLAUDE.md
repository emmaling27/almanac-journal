# Almanac Journal Agent Guidelines

## Development & Quality Standards

### Testing Guidelines
- **Write Tests for New Features:** Whenever implementing new features, API endpoints, backend Convex functions, or utility logic, write corresponding unit and integration tests (using `vitest` and `convex-test`).
- **Run Tests Before Committing:** Always execute the test suite (`npm test`) and type check / production build (`npm run build`) before committing any changes. Never commit code with failing tests.
- **Backend & Authz Verification:** For any changes to Convex functions or schema, ensure authorization checks (e.g. `getAuthUserId`) and data isolation are covered by tests using in-memory `convex-test`.

### Git Workflow: Direct Push to Main
- **Direct Push on Approval:** When the user gives the go-ahead, approves changes, or asks to land/ship/merge the work (e.g., "go ahead", "merge into main", "looks good", "push directly"):
  1. Verify the test suite and production build pass (`npm test && npm run build`).
  2. Fetch latest remote main (`git fetch origin main`).
  3. Rebase onto `origin/main` (`git rebase origin/main`) and resolve any conflicts.
  4. Push directly to main (`git push origin HEAD:main`).
  5. Sync the workspace branch with remote (`git push --force-with-lease origin HEAD`).
  6. Do **not** create a GitHub pull request unless the user explicitly asks for one.
