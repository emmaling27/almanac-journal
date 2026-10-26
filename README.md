# San Francisco Bay Tidelog & Reflective Journal

A maritime almanac, daily reflective captain's log, and navigational habit tracker tuned to NOAA San Francisco Bay tidal currents and astronomical cycles.

## 🚀 Live Production URL

The entire full-stack application (frontend + reactive Convex backend) is hosted directly on Convex:

👉 **[https://compassionate-minnow-316.convex.site](https://compassionate-minnow-316.convex.site)**

- **Deployment**: `compassionate-minnow-316`
- **Convex Cloud (Backend)**: `https://compassionate-minnow-316.convex.cloud`
- **Convex Site (Frontend & Auth)**: `https://compassionate-minnow-316.convex.site`
- **Convex Dashboard**: [Convex Dashboard](https://dashboard.convex.dev/t/emmaling27/almanac-journal/compassionate-minnow-316)

## 📦 Continuous Integration & Deployment (CI/CD)

Continuous integration and automated production deployment are configured via GitHub Actions (`.github/workflows/ci.yml`):

- **Pull Requests**: Automatically runs Vitest tests and validates Next.js build.
- **Push to `main`**: Runs the full test suite (`npm test`), validates the build, deploys Convex functions & schema to production (`compassionate-minnow-316`), and uploads the static web assets to `@convex-dev/static-hosting`.
- **Secret**: Authenticated via `CONVEX_DEPLOY_KEY` stored in GitHub repository secrets.

### Manual Deployment

To manually deploy changes from local terminal:

```bash
# Deploy backend schema/functions and upload static frontend to Convex
npx convex deploy -y
npm run build
npx @convex-dev/static-hosting upload -d out --prod
```

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Start local dev server & Convex backend
npm run dev
```

Run test suite:
```bash
npm test
```

Production build check:
```bash
npm run build
```
