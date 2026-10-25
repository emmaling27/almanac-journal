# San Francisco Bay Tidelog & Reflective Journal

A maritime almanac, daily reflective captain's log, and navigational habit tracker tuned to NOAA San Francisco Bay tidal currents and astronomical cycles.

## 🚀 Production Deployment

### 1. Convex Backend (Live)
The production backend is deployed to Convex:
- **Deployment**: `compassionate-minnow-316`
- **Convex URL**: `https://compassionate-minnow-316.convex.cloud`
- **Convex Site URL**: `https://compassionate-minnow-316.convex.site`
- **Dashboard**: [Convex Dashboard](https://dashboard.convex.dev/t/emmaling27/almanac-journal/compassionate-minnow-316)

### 2. Frontend Hosting (Vercel)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Femmaling27%2Falmanac-journal&env=NEXT_PUBLIC_CONVEX_URL,NEXT_PUBLIC_CONVEX_SITE_URL&envDescription=Convex%20Production%20Deployment%20URLs&envLink=https%3A%2F%2Fdashboard.convex.dev%2Ft%2Femmaling27%2Falmanac-journal%2Fcompassionate-minnow-316)

To deploy on [Vercel](https://vercel.com/new):
1. Import repository `emmaling27/almanac-journal`.
2. Configure the following Environment Variables in Vercel:
   - `NEXT_PUBLIC_CONVEX_URL`: `https://compassionate-minnow-316.convex.cloud`
   - `NEXT_PUBLIC_CONVEX_SITE_URL`: `https://compassionate-minnow-316.convex.site`
3. Click **Deploy**.

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
